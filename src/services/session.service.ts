import crypto from 'crypto';
import QRCode from 'qrcode';
import { sessionRepository } from '@/repositories/session.repository';
import { fichaRepository } from '@/repositories/ficha.repository';
import { generateRotativeToken } from '@/lib/qr-security';
import {
  QRSession,
  CreateSessionInput,
  CreateSessionSchema,
  MAX_EXTEMPORANEOUS_GRACE_MINUTES
} from '@/domain/session.domain';

export class GracePeriodExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GracePeriodExceededError';
  }
}

export class SessionService {
  async createSession(
    instructor: { id: number; full_name: string },
    input: CreateSessionInput,
    originUrl?: string
  ): Promise<{ session: QRSession; qrDataUrl: string; rotativeToken: string; registerUrl: string }> {
    const validated = CreateSessionSchema.parse(input);

    const ficha = await fichaRepository.findFichaByCode(validated.ficha_code);
    const ambiente = await fichaRepository.findAmbienteById(validated.ambiente_id);

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + validated.duration_minutes * 60 * 1000);

    const session = await sessionRepository.create({
      token,
      instructor_id: instructor.id,
      instructor_name: instructor.full_name,
      ficha_code: validated.ficha_code,
      ficha_id: ficha?.id || null,
      program_name: ficha?.program_name || 'Programa de Formación',
      jornada: validated.jornada,
      ambiente_name: ambiente?.name || 'Ambiente',
      ambiente_id: ambiente?.id || null,
      grupo: validated.grupo || 'Grupo 1',
      sede: validated.sede || 'Sede Principal',
      duration_minutes: validated.duration_minutes,
      hours_duration: validated.hours_duration,
      session_type: 'regular',
      expires_at: expiresAt
    });

    const rotativeToken = generateRotativeToken(token);
    const host = originUrl || 'http://localhost:3000';
    const registerUrl = `${host}/aprendiz/register?token=${token}&rot=${rotativeToken}`;
    const qrDataUrl = await QRCode.toDataURL(registerUrl, { width: 320, margin: 2 });

    return { session, qrDataUrl, rotativeToken, registerUrl };
  }

  async createLateSession(
    parentSessionId: number,
    instructorId: number,
    originUrl?: string
  ): Promise<{ lateSession: QRSession; qrDataUrl: string; rotativeToken: string; registerUrl: string }> {
    // 1. Strict extemporaneous 10-minute grace period check
    const { allowed, session: parentSession, minutesPassed } =
      await sessionRepository.isWithinExtemporaneousGracePeriod(parentSessionId);

    if (!parentSession) {
      throw new Error('La sesión de asistencia de origen no existe.');
    }

    if (parentSession.instructor_id !== instructorId) {
      throw new Error('No tiene autorización para reabrir esta sesión.');
    }

    if (!allowed) {
      throw new GracePeriodExceededError(
        `No es posible reabrir el código QR: han transcurrido ${minutesPassed} minutos desde el cierre de la sesión, superando el límite extemporáneo institucional de ${MAX_EXTEMPORANEOUS_GRACE_MINUTES} minutos.`
      );
    }

    // Fixed 5 minutes for late QR
    const durationMinutes = 5;
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const lateSession = await sessionRepository.create({
      token,
      instructor_id: parentSession.instructor_id,
      instructor_name: parentSession.instructor_name || '',
      ficha_code: parentSession.ficha_code,
      ficha_id: parentSession.ficha_id,
      program_name: parentSession.program_name,
      jornada: parentSession.jornada,
      ambiente_name: parentSession.ambiente_name,
      ambiente_id: parentSession.ambiente_id,
      grupo: parentSession.grupo,
      sede: parentSession.sede,
      duration_minutes: durationMinutes,
      hours_duration: parentSession.hours_duration,
      session_type: 'late_qr',
      parent_session_id: parentSessionId,
      expires_at: expiresAt
    });

    const rotativeToken = generateRotativeToken(token);
    const host = originUrl || 'http://localhost:3000';
    const registerUrl = `${host}/aprendiz/register?token=${token}&rot=${rotativeToken}`;
    const qrDataUrl = await QRCode.toDataURL(registerUrl, { width: 320, margin: 2 });

    return { lateSession, qrDataUrl, rotativeToken, registerUrl };
  }

  async getActiveSession(instructorId: number): Promise<{ session: QRSession | null; rotativeToken?: string }> {
    const session = await sessionRepository.findActiveByInstructor(instructorId);
    if (!session) return { session: null };

    const rotativeToken = generateRotativeToken(session.token);
    return { session, rotativeToken };
  }

  async finishSession(sessionId: number, instructorId: number): Promise<boolean> {
    return sessionRepository.finishSession(sessionId, instructorId);
  }
}

export const sessionService = new SessionService();
