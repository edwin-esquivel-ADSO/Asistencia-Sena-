import { query, queryOne } from '@/lib/db';
import { Aprendiz } from '@/domain/aprendiz.domain';

export class AprendizRepository {
  async findByDocument(document: string, activeOnly: boolean = false): Promise<Aprendiz | null> {
    const sql = `
      SELECT a.id, a.document, a.full_name, a.ficha_id, f.code as ficha_code, f.program_name,
             a.is_active, a.deactivation_reason, a.face_asset_public_id, a.face_descriptor_json,
             a.face_registered_at, a.biometric_consent_at, a.biometric_consent_version,
             a.created_at, a.updated_at
      FROM aprendices a
      LEFT JOIN fichas f ON a.ficha_id = f.id
      WHERE a.document = $1 ${activeOnly ? 'AND a.is_active = true' : ''}
      LIMIT 1
    `;
    return queryOne<Aprendiz>(sql, [document.trim()]);
  }

  async findById(id: number): Promise<Aprendiz | null> {
    const sql = `
      SELECT a.id, a.document, a.full_name, a.ficha_id, f.code as ficha_code, f.program_name,
             a.is_active, a.deactivation_reason, a.face_asset_public_id, a.face_descriptor_json,
             a.face_registered_at, a.biometric_consent_at, a.biometric_consent_version,
             a.created_at, a.updated_at
      FROM aprendices a
      LEFT JOIN fichas f ON a.ficha_id = f.id
      WHERE a.id = $1
      LIMIT 1
    `;
    return queryOne<Aprendiz>(sql, [id]);
  }

  async findByFicha(fichaCode: string, includeInactive: boolean = false): Promise<Aprendiz[]> {
    const sql = `
      SELECT a.id, a.document, a.full_name, a.ficha_id, f.code as ficha_code, f.program_name,
             a.is_active, a.deactivation_reason, a.face_asset_public_id,
             a.face_registered_at, a.created_at, a.updated_at
      FROM aprendices a
      JOIN fichas f ON a.ficha_id = f.id
      WHERE f.code = $1 ${includeInactive ? '' : 'AND a.is_active = true'}
      ORDER BY a.full_name ASC
    `;
    return query<Aprendiz>(sql, [fichaCode.trim()]);
  }

  async create(data: {
    document: string;
    full_name: string;
    ficha_id: number;
    is_active?: boolean;
  }): Promise<Aprendiz> {
    const sql = `
      INSERT INTO aprendices (document, full_name, ficha_id, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (document) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          ficha_id = EXCLUDED.ficha_id,
          is_active = true,
          deactivation_reason = NULL,
          updated_at = NOW()
      RETURNING id, document, full_name, ficha_id, is_active, created_at, updated_at
    `;
    return queryOne<Aprendiz>(sql, [
      data.document.trim(),
      data.full_name.trim(),
      data.ficha_id,
      data.is_active !== undefined ? data.is_active : true
    ]) as Promise<Aprendiz>;
  }

  async update(id: number, data: {
    document?: string;
    full_name?: string;
    is_active?: boolean;
    deactivation_reason?: string | null;
  }): Promise<Aprendiz | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.document !== undefined) {
      fields.push(`document = $${idx++}`);
      values.push(data.document.trim());
    }
    if (data.full_name !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.full_name.trim());
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.is_active);
      if (data.is_active === true) {
        fields.push(`deactivation_reason = NULL`);
      }
    }
    if (data.deactivation_reason !== undefined) {
      fields.push(`deactivation_reason = $${idx++}`);
      values.push(data.deactivation_reason);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE aprendices
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, document, full_name, ficha_id, is_active, deactivation_reason, created_at, updated_at
    `;
    return queryOne<Aprendiz>(sql, values);
  }

  async deactivate(id: number, reason: string): Promise<Aprendiz | null> {
    const sql = `
      UPDATE aprendices
      SET is_active = false,
          deactivation_reason = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, document, full_name, ficha_id, is_active, deactivation_reason, updated_at
    `;
    return queryOne<Aprendiz>(sql, [reason.trim(), id]);
  }

  async reactivate(id: number): Promise<Aprendiz | null> {
    const sql = `
      UPDATE aprendices
      SET is_active = true,
          deactivation_reason = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, document, full_name, ficha_id, is_active, updated_at
    `;
    return queryOne<Aprendiz>(sql, [id]);
  }

  async saveBiometricDescriptor(
    id: number,
    descriptorJson: string,
    publicId?: string | null
  ): Promise<void> {
    const sql = `
      UPDATE aprendices
      SET face_descriptor_json = $1,
          face_asset_public_id = COALESCE($2, face_asset_public_id),
          face_registered_at = NOW(),
          biometric_consent_at = NOW(),
          biometric_consent_version = 'v1.0-2026',
          updated_at = NOW()
      WHERE id = $3
    `;
    await query(sql, [descriptorJson, publicId || null, id]);
  }
}

export const aprendizRepository = new AprendizRepository();
