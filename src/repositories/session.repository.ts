import { query, queryOne } from '@/lib/db';
import { QRSession, MAX_EXTEMPORANEOUS_GRACE_MINUTES } from '@/domain/session.domain';

export class SessionRepository {
  async create(data: {
    token: string;
    instructor_id: number;
    instructor_name: string;
    ficha_code: string;
    ficha_id?: number | null;
    program_name?: string | null;
    jornada: string;
    ambiente_name?: string | null;
    ambiente_id?: number | null;
    grupo?: string | null;
    sede?: string | null;
    duration_minutes: number;
    hours_duration: number;
    session_type?: 'regular' | 'late_qr';
    parent_session_id?: number | null;
    expires_at: Date;
  }): Promise<QRSession> {
    const sql = `
      INSERT INTO qr_sessions (
        token, instructor_id, instructor_name, ficha_code, ficha_id, program_name,
        jornada, ambiente_name, ambiente_id, grupo, sede, duration_minutes, hours_duration,
        session_type, parent_session_id, status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', $16)
      RETURNING *
    `;
    return queryOne<QRSession>(sql, [
      data.token,
      data.instructor_id,
      data.instructor_name,
      data.ficha_code,
      data.ficha_id || null,
      data.program_name || null,
      data.jornada,
      data.ambiente_name || null,
      data.ambiente_id || null,
      data.grupo || null,
      data.sede || null,
      data.duration_minutes,
      data.hours_duration,
      data.session_type || 'regular',
      data.parent_session_id || null,
      data.expires_at
    ]) as Promise<QRSession>;
  }

  async findById(id: number): Promise<QRSession | null> {
    const sql = `SELECT * FROM qr_sessions WHERE id = $1 LIMIT 1`;
    return queryOne<QRSession>(sql, [id]);
  }

  async findByToken(token: string): Promise<QRSession | null> {
    const sql = `SELECT * FROM qr_sessions WHERE token = $1 LIMIT 1`;
    return queryOne<QRSession>(sql, [token]);
  }

  async findActiveByInstructor(instructorId: number): Promise<QRSession | null> {
    const sql = `
      SELECT * FROM qr_sessions
      WHERE instructor_id = $1 AND status = 'active' AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return queryOne<QRSession>(sql, [instructorId]);
  }

  async finishSession(id: number, instructorId: number): Promise<boolean> {
    const sql = `
      UPDATE qr_sessions
      SET status = 'finished'
      WHERE id = $1 AND instructor_id = $2
      RETURNING id
    `;
    const res = await queryOne<{ id: number }>(sql, [id, instructorId]);
    return Boolean(res);
  }

  async isWithinExtemporaneousGracePeriod(parentSessionId: number): Promise<{
    allowed: boolean;
    session: QRSession | null;
    minutesPassed: number;
  }> {
    const session = await this.findById(parentSessionId);
    if (!session) {
      return { allowed: false, session: null, minutesPassed: 0 };
    }

    const expiresAt = new Date(session.expires_at).getTime();
    const now = Date.now();
    const diffMs = now - expiresAt;
    const minutesPassed = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    const allowed = diffMs <= MAX_EXTEMPORANEOUS_GRACE_MINUTES * 60 * 1000;
    return { allowed, session, minutesPassed };
  }

  async getRecentSessionsByInstructor(instructorId: number): Promise<QRSession[]> {
    const sql = `
      SELECT * FROM qr_sessions
      WHERE instructor_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return query<QRSession>(sql, [instructorId]);
  }
}

export const sessionRepository = new SessionRepository();
