import { attendanceRepository } from '@/repositories/attendance.repository';
import { sessionRepository } from '@/repositories/session.repository';
import { aprendizRepository } from '@/repositories/aprendiz.repository';
import { verifyRotativeToken } from '@/lib/qr-security';
import {
  Attendance,
  AttendanceRegisterInput,
  AttendanceRegisterSchema,
  AttendanceState
} from '@/domain/attendance.domain';

export class DuplicateAttendanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateAttendanceError';
  }
}

export class AttendanceService {
  async registerAttendance(
    input: AttendanceRegisterInput,
    metadata: { ip: string; browser: string; device: string }
  ): Promise<Attendance> {
    const validated = AttendanceRegisterSchema.parse(input);

    // 1. Verify session exists
    const session = await sessionRepository.findByToken(validated.token);
    if (!session) {
      throw new Error('Sesión de asistencia no válida o inexistente.');
    }

    // 2. Verify session is not finished or expired
    if (session.status === 'finished') {
      throw new Error('La sesión de asistencia ya ha sido finalizada por el instructor.');
    }

    const expiresAt = new Date(session.expires_at).getTime();
    if (Date.now() > expiresAt) {
      throw new Error('El código QR de esta sesión ha expirado.');
    }

    // 3. Verify rotating HMAC-SHA256 token
    const isTokenValid = verifyRotativeToken(validated.token, validated.rotative_token);
    if (!isTokenValid) {
      throw new Error('El código QR dinámico ha rotado o es inválido. Por favor escanee nuevamente la pantalla.');
    }

    // 4. Verify apprentice exists and is active
    const cleanDoc = validated.document.trim();
    const aprendiz = await aprendizRepository.findByDocument(cleanDoc, true);
    if (!aprendiz) {
      throw new Error('El aprendiz no se encuentra registrado como activo en el sistema SENA.');
    }

    // 5. Prevent duplicates: exactly one attendance per apprentice per session
    const existing = await attendanceRepository.findExistingBySessionAndDocument(session.id, cleanDoc);
    if (existing) {
      throw new DuplicateAttendanceError(
        `Ya existe un registro de asistencia para el aprendiz ${aprendiz.full_name} en esta sesión.`
      );
    }

    // 6. Determine attendance state and hours
    const isLateSession = session.session_type === 'late_qr';
    const estado: AttendanceState = isLateSession ? 'Tarde' : 'Presente';
    const registroTipo = isLateSession ? 'tardio_qr' : 'puntual';

    return attendanceRepository.create({
      qr_session_id: session.id,
      instructor_name: session.instructor_name || 'Instructor SENA',
      ficha_code: session.ficha_code,
      jornada: session.jornada,
      ambiente_name: session.ambiente_name || 'Ambiente',
      grupo: session.grupo,
      sede: session.sede,
      aprendiz_name: aprendiz.full_name,
      aprendiz_document: cleanDoc,
      estado,
      registro_tipo: registroTipo,
      horas: session.hours_duration,
      ip_publica: metadata.ip,
      latitud: validated.latitud,
      longitud: validated.longitud,
      precision_gps: validated.precision_gps,
      location_status: validated.location_status || 'Capturada con éxito',
      navegador: metadata.browser,
      dispositivo: metadata.device
    });
  }

  async getSessionAttendances(sessionId: number): Promise<Attendance[]> {
    return attendanceRepository.findBySession(sessionId);
  }

  async updateAttendanceStatus(
    id: number,
    estado: AttendanceState,
    horas?: number,
    tareaRegistrada?: boolean,
    tareaNota?: string | null
  ): Promise<Attendance> {
    const updated = await attendanceRepository.updateStatus(
      id,
      estado,
      horas,
      tareaRegistrada,
      tareaNota
    );
    if (!updated) {
      throw new Error('Asistencia no encontrada.');
    }
    return updated;
  }
}

export const attendanceService = new AttendanceService();
