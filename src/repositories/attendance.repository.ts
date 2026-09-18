import { query, queryOne } from '@/lib/db';
import { Attendance, AttendanceState } from '@/domain/attendance.domain';

export class AttendanceRepository {
  async create(data: {
    qr_session_id?: number | null;
    instructor_name: string;
    ficha_code: string;
    jornada: string;
    ambiente_name: string;
    grupo?: string | null;
    sede?: string | null;
    aprendiz_name: string;
    aprendiz_document: string;
    estado?: AttendanceState;
    registro_tipo?: 'puntual' | 'tardio_qr' | 'tardio_manual';
    horas?: number;
    ip_publica: string;
    latitud?: string | null;
    longitud?: string | null;
    precision_gps?: string | null;
    location_status?: string | null;
    navegador: string;
    dispositivo: string;
    excuse_path?: string | null;
    excuse_note?: string | null;
    arrival_time?: string | null;
  }): Promise<Attendance> {
    const sql = `
      INSERT INTO attendances (
        qr_session_id, instructor_name, ficha_code, jornada, ambiente_name,
        grupo, sede, aprendiz_name, aprendiz_document, estado, registro_tipo,
        horas, ip_publica, latitud, longitud, precision_gps, location_status,
        navegador, dispositivo, excuse_path, excuse_note, arrival_time
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING *
    `;

    return queryOne<Attendance>(sql, [
      data.qr_session_id || null,
      data.instructor_name,
      data.ficha_code,
      data.jornada,
      data.ambiente_name,
      data.grupo || null,
      data.sede || null,
      data.aprendiz_name,
      data.aprendiz_document,
      data.estado || 'Presente',
      data.registro_tipo || 'puntual',
      data.horas || 0,
      data.ip_publica,
      data.latitud || 'Ubicación no disponible',
      data.longitud || 'Ubicación no disponible',
      data.precision_gps || 'Ubicación no disponible',
      data.location_status || 'No capturada',
      data.navegador,
      data.dispositivo,
      data.excuse_path || null,
      data.excuse_note || null,
      data.arrival_time || null
    ]) as Promise<Attendance>;
  }

  async findExistingBySessionAndDocument(
    sessionId: number,
    document: string
  ): Promise<Attendance | null> {
    const sql = `
      SELECT * FROM attendances
      WHERE qr_session_id = $1 AND aprendiz_document = $2
      LIMIT 1
    `;
    return queryOne<Attendance>(sql, [sessionId, document.trim()]);
  }

  async findBySession(sessionId: number): Promise<Attendance[]> {
    const sql = `
      SELECT * FROM attendances
      WHERE qr_session_id = $1
      ORDER BY hora DESC, id DESC
    `;
    return query<Attendance>(sql, [sessionId]);
  }

  async findById(id: number): Promise<Attendance | null> {
    const sql = `SELECT * FROM attendances WHERE id = $1 LIMIT 1`;
    return queryOne<Attendance>(sql, [id]);
  }

  async updateStatus(
    id: number,
    estado: AttendanceState,
    horas?: number,
    tareaRegistrada?: boolean,
    tareaNota?: string | null
  ): Promise<Attendance | null> {
    const sql = `
      UPDATE attendances
      SET estado = $1,
          horas = COALESCE($2, horas),
          tarea_registrada = COALESCE($3, tarea_registrada),
          tarea_nota = COALESCE($4, tarea_nota),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    return queryOne<Attendance>(sql, [
      estado,
      horas !== undefined ? horas : null,
      tareaRegistrada !== undefined ? tareaRegistrada : null,
      tareaNota !== undefined ? tareaNota : null,
      id
    ]);
  }

  async findHistoryByInstructor(instructorName: string): Promise<Attendance[]> {
    const sql = `
      SELECT * FROM attendances
      WHERE instructor_name = $1
      ORDER BY fecha DESC, hora DESC
      LIMIT 500
    `;
    return query<Attendance>(sql, [instructorName]);
  }

  async findAllHistory(): Promise<Attendance[]> {
    const sql = `
      SELECT * FROM attendances
      ORDER BY fecha DESC, hora DESC
      LIMIT 1000
    `;
    return query<Attendance>(sql);
  }

  async findByAprendizDocument(document: string): Promise<Attendance[]> {
    const sql = `
      SELECT * FROM attendances
      WHERE aprendiz_document = $1
      ORDER BY fecha DESC, hora DESC
      LIMIT 100
    `;
    return query<Attendance>(sql, [document.trim()]);
  }
}

export const attendanceRepository = new AttendanceRepository();
