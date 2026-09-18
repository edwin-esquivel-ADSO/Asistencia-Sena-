import { excuseRepository } from '@/repositories/excuse.repository';
import { notificationRepository } from '@/repositories/notification.repository';
import { fichaRepository } from '@/repositories/ficha.repository';
import { query } from '@/lib/db';
import { getSignedImageUrl } from '@/lib/cloudinary';
import {
  ExcuseRequest,
  ExcuseCreateInput,
  ExcuseCreateSchema,
  ExcuseReviewInput,
  ExcuseReviewSchema
} from '@/domain/excuse.domain';

export class ConcurrencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyConflictError';
  }
}

export class ExcuseService {
  /**
   * Generates a signed view URL for any excuse evidence path with 5-minute TTL.
   */
  resolveSignedFileUrl(filePath: string): string {
    if (!filePath) return '';
    return getSignedImageUrl(filePath, 300);
  }

  async submitExcuse(
    aprendiz: { id: number; full_name: string; document: string },
    input: ExcuseCreateInput,
    filePath: string
  ): Promise<ExcuseRequest> {
    const validated = ExcuseCreateSchema.parse(input);

    // 1. Verify ficha exists
    const ficha = await fichaRepository.findFichaById(validated.ficha_id);
    if (!ficha) {
      throw new Error('La ficha académica seleccionada no existe en el sistema.');
    }

    // 2. Create excuse in repository
    const excuse = await excuseRepository.create({
      aprendiz_id: aprendiz.id,
      attendance_id: validated.attendance_id || null,
      start_date: validated.start_date,
      end_date: validated.end_date,
      reason: validated.reason,
      file_path: filePath
    });

    const isMultiDay = validated.start_date < validated.end_date;

    if (!isMultiDay) {
      // Unidía (1 calendar day): Route exclusively to the instructor(s) of that ficha
      const instructors = await query<{ instructor_id: number; full_name: string }>(
        `SELECT u.id as instructor_id, u.full_name
         FROM instructor_fichas ifi
         JOIN users u ON ifi.instructor_id = u.id
         WHERE ifi.ficha_id = $1`,
        [validated.ficha_id]
      );

      for (const inst of instructors) {
        await notificationRepository.createNotification({
          recipient_role: 'instructor',
          recipient_id: inst.instructor_id,
          type: 'excuse_unidia_submitted',
          title: 'Nueva Excusa Unidía',
          body: `El aprendiz ${aprendiz.full_name} presentó una excusa para el día ${validated.start_date} en la Ficha ${ficha.code}.`,
          link_url: '/instructor/dashboard?tab=excusas',
          metadata_json: { excuse_id: excuse.id, ficha_id: validated.ficha_id, type: 'unidía' }
        });
      }
    } else {
      // Multidía (2+ days): Route to Coordinator for primary decision + Fan-out to all affected instructors
      const coordinators = await query<{ id: number }>(
        `SELECT id FROM users WHERE role = 'coordinador' AND is_active = true`
      );

      for (const coord of coordinators) {
        await notificationRepository.createNotification({
          recipient_role: 'coordinador',
          recipient_id: coord.id,
          type: 'excuse_multidia_submitted',
          title: 'Nueva Excusa Multidía (Requiere Aprobación)',
          body: `El aprendiz ${aprendiz.full_name} presentó una excusa médica/calamidad multidía (${validated.start_date} al ${validated.end_date}) para la Ficha ${ficha.code}.`,
          link_url: '/coordinador/dashboard?tab=excusas',
          metadata_json: { excuse_id: excuse.id, ficha_id: validated.ficha_id, type: 'multidía' }
        });
      }

      // Fan-out notifications to all instructors associated with the ficha
      const instructors = await query<{ instructor_id: number }>(
        `SELECT instructor_id FROM instructor_fichas WHERE ficha_id = $1`,
        [validated.ficha_id]
      );

      for (const inst of instructors) {
        await notificationRepository.createNotification({
          recipient_role: 'instructor',
          recipient_id: inst.instructor_id,
          type: 'excuse_multidia_notice',
          title: 'Aviso: Ausencia Multidía Radicada',
          body: `El aprendiz ${aprendiz.full_name} radicó una excusa de ${validated.start_date} al ${validated.end_date}. La resolución corresponde a Coordinación.`,
          link_url: '/instructor/dashboard',
          metadata_json: { excuse_id: excuse.id, type: 'multidía' }
        });
      }
    }

    return excuse;
  }

  async reviewExcuse(
    excuseId: number,
    reviewer: { id: number; full_name: string; role: 'instructor' | 'coordinador' },
    input: ExcuseReviewInput
  ): Promise<{ newVersion: number; message: string }> {
    const validated = ExcuseReviewSchema.parse(input);

    const excuse = await excuseRepository.findById(excuseId);
    if (!excuse) {
      throw new Error('La excusa solicitada no existe.');
    }

    // Role authority check:
    // Unidía can be reviewed by Instructor or Coordinator.
    // Multidía MUST be reviewed by Coordinator.
    const isMultiDay = excuse.start_date < excuse.end_date;
    if (isMultiDay && reviewer.role !== 'coordinador') {
      throw new Error(
        'Las excusas multidía (≥ 2 días) requieren aprobación global por parte de Coordinación Académica.'
      );
    }

    // Execute with Optimistic Concurrency Control
    const result = await excuseRepository.reviewWithOptimisticLock({
      id: excuseId,
      action: validated.action,
      currentVersion: validated.version,
      decidedByUserId: reviewer.id,
      comment: validated.instructor_comment
    });

    if (result.conflict) {
      throw new ConcurrencyConflictError(
        'Conflicto de concurrencia: la excusa ya fue procesada por otro usuario o la versión está desactualizada. Por favor recargue el panel.'
      );
    }

    if (!result.success || !result.newVersion) {
      throw new Error('No fue posible procesar la revisión de la excusa.');
    }

    return {
      newVersion: result.newVersion,
      message: `Excusa ${validated.action === 'approved' ? 'aprobada' : 'rechazada'} exitosamente.`
    };
  }

  async getPendingExcusesForInstructor(instructorId: number): Promise<ExcuseRequest[]> {
    const excuses = await excuseRepository.findPendingForInstructor(instructorId);
    return excuses.map(exc => ({
      ...exc,
      signed_file_url: this.resolveSignedFileUrl(exc.file_path)
    }));
  }

  async getPendingExcusesForCoordinator(): Promise<ExcuseRequest[]> {
    const excuses = await excuseRepository.findPendingForCoordinator();
    return excuses.map(exc => ({
      ...exc,
      signed_file_url: this.resolveSignedFileUrl(exc.file_path)
    }));
  }

  async getExcusesForAprendiz(aprendizId: number): Promise<ExcuseRequest[]> {
    const excuses = await excuseRepository.findByAprendiz(aprendizId);
    return excuses.map(exc => ({
      ...exc,
      signed_file_url: this.resolveSignedFileUrl(exc.file_path)
    }));
  }
}

export const excuseService = new ExcuseService();
