import { query, queryOne, transaction } from '@/lib/db';
import { ExcuseRequest, ExcuseStatus } from '@/domain/excuse.domain';

export class ExcuseRepository {
  async create(data: {
    aprendiz_id: number;
    attendance_id?: number | null;
    start_date: string;
    end_date: string;
    reason: string;
    file_path: string;
  }): Promise<ExcuseRequest> {
    const sql = `
      INSERT INTO excuse_requests (
        aprendiz_id, attendance_id, start_date, end_date, reason, file_path, status, version
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 1)
      RETURNING id, aprendiz_id, attendance_id, start_date, end_date, reason, file_path, status, version, created_at, updated_at
    `;
    return queryOne<ExcuseRequest>(sql, [
      data.aprendiz_id,
      data.attendance_id || null,
      data.start_date,
      data.end_date,
      data.reason.trim(),
      data.file_path
    ]) as Promise<ExcuseRequest>;
  }

  async findById(id: number): Promise<ExcuseRequest | null> {
    const sql = `
      SELECT e.*, a.full_name as aprendiz_name, a.document as aprendiz_document,
             f.id as ficha_id, f.code as ficha_code,
             u.full_name as decided_by_name,
             CASE WHEN e.start_date = e.end_date THEN 'unidía' ELSE 'multidía' END as tipo
      FROM excuse_requests e
      JOIN aprendices a ON e.aprendiz_id = a.id
      LEFT JOIN fichas f ON a.ficha_id = f.id
      LEFT JOIN users u ON e.decided_by_instructor_id = u.id
      WHERE e.id = $1
      LIMIT 1
    `;
    return queryOne<ExcuseRequest>(sql, [id]);
  }

  async findPendingForInstructor(instructorId: number): Promise<ExcuseRequest[]> {
    // Unidía (1 day: start_date = end_date) routed to the instructor of that ficha
    const sql = `
      SELECT e.*, a.full_name as aprendiz_name, a.document as aprendiz_document,
             f.id as ficha_id, f.code as ficha_code,
             'unidía' as tipo
      FROM excuse_requests e
      JOIN aprendices a ON e.aprendiz_id = a.id
      JOIN fichas f ON a.ficha_id = f.id
      JOIN instructor_fichas ifi ON ifi.ficha_id = f.id
      WHERE ifi.instructor_id = $1
        AND e.status = 'pending'
        AND e.start_date = e.end_date
      ORDER BY e.created_at DESC
    `;
    return query<ExcuseRequest>(sql, [instructorId]);
  }

  async findPendingForCoordinator(): Promise<ExcuseRequest[]> {
    // Multidía (2+ days: start_date < end_date) routed to the Coordinator
    const sql = `
      SELECT e.*, a.full_name as aprendiz_name, a.document as aprendiz_document,
             f.id as ficha_id, f.code as ficha_code,
             'multidía' as tipo
      FROM excuse_requests e
      JOIN aprendices a ON e.aprendiz_id = a.id
      LEFT JOIN fichas f ON a.ficha_id = f.id
      WHERE e.status = 'pending'
        AND e.start_date < e.end_date
      ORDER BY e.created_at DESC
    `;
    return query<ExcuseRequest>(sql);
  }

  async findByAprendiz(aprendizId: number): Promise<ExcuseRequest[]> {
    const sql = `
      SELECT e.*,
             CASE WHEN e.start_date = e.end_date THEN 'unidía' ELSE 'multidía' END as tipo,
             u.full_name as decided_by_name
      FROM excuse_requests e
      LEFT JOIN users u ON e.decided_by_instructor_id = u.id
      WHERE e.aprendiz_id = $1
      ORDER BY e.created_at DESC
    `;
    return query<ExcuseRequest>(sql, [aprendizId]);
  }

  async reviewWithOptimisticLock(params: {
    id: number;
    action: 'approved' | 'rejected';
    currentVersion: number;
    decidedByUserId: number;
    comment?: string | null;
  }): Promise<{ success: boolean; conflict?: boolean; newVersion?: number }> {
    return transaction(async (client) => {
      // 1. Check existing record
      const checkRes = await client.query(
        `SELECT e.*, a.document as aprendiz_document, a.id as ap_id
         FROM excuse_requests e
         JOIN aprendices a ON e.aprendiz_id = a.id
         WHERE e.id = $1 LIMIT 1`,
        [params.id]
      );

      if (checkRes.rows.length === 0) {
        return { success: false };
      }

      const excuse = checkRes.rows[0];

      // 2. Optimistic lock update: requires exact matching version and pending status
      const updateRes = await client.query(
        `UPDATE excuse_requests
         SET status = $1,
             version = version + 1,
             decided_by_instructor_id = $2,
             instructor_comment = $3,
             decided_at = NOW(),
             updated_at = NOW()
         WHERE id = $4 AND version = $5 AND status = 'pending'
         RETURNING id, version`,
        [params.action, params.decidedByUserId, params.comment || null, params.id, params.currentVersion]
      );

      if (updateRes.rows.length === 0) {
        // Version mismatch or already processed!
        return { success: false, conflict: true };
      }

      const newVersion = updateRes.rows[0].version;

      // 3. If approved, mark attendances in the date range as Justificado
      if (params.action === 'approved') {
        if (excuse.attendance_id) {
          await client.query(
            `UPDATE attendances
             SET estado = 'Justificado', excuse_path = $1, excuse_note = $2, updated_at = NOW()
             WHERE id = $3`,
            [excuse.file_path, excuse.reason, excuse.attendance_id]
          );
        } else {
          await client.query(
            `UPDATE attendances
             SET estado = 'Justificado', excuse_path = $1, excuse_note = $2, updated_at = NOW()
             WHERE aprendiz_document = $3 AND fecha >= $4 AND fecha <= $5`,
            [excuse.file_path, excuse.reason, excuse.aprendiz_document, excuse.start_date, excuse.end_date]
          );
        }
      }

      return { success: true, conflict: false, newVersion };
    });
  }
}

export const excuseRepository = new ExcuseRepository();
