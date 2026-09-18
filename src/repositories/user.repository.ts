import { query, queryOne } from '@/lib/db';
import { User } from '@/domain/user.domain';

export class UserRepository {
  async findByDocument(document: string, activeOnly: boolean = true): Promise<User | null> {
    const sql = `
      SELECT id, document, full_name, username, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE document = $1 ${activeOnly ? 'AND is_active = true' : ''}
      LIMIT 1
    `;
    return queryOne<User>(sql, [document.trim()]);
  }

  async findById(id: number): Promise<User | null> {
    const sql = `
      SELECT id, document, full_name, username, email, role, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    return queryOne<User>(sql, [id]);
  }

  async findAllInstructors(): Promise<User[]> {
    const sql = `
      SELECT id, document, full_name, username, email, role, is_active, created_at
      FROM users
      WHERE role = 'instructor'
      ORDER BY full_name ASC
    `;
    return query<User>(sql);
  }

  async createInstructor(data: {
    document: string;
    full_name: string;
    username?: string | null;
    email?: string | null;
    role?: 'instructor' | 'coordinador';
  }): Promise<User> {
    const sql = `
      INSERT INTO users (document, full_name, username, email, role, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, document, full_name, username, email, role, is_active, created_at
    `;
    return queryOne<User>(sql, [
      data.document.trim(),
      data.full_name.trim(),
      data.username?.trim() || null,
      data.email?.trim() || null,
      data.role || 'instructor'
    ]) as Promise<User>;
  }

  async updateUser(id: number, data: {
    full_name?: string;
    document?: string;
    username?: string | null;
    email?: string | null;
    role?: 'instructor' | 'coordinador';
    is_active?: boolean;
  }): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.full_name !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.full_name.trim());
    }
    if (data.document !== undefined) {
      fields.push(`document = $${idx++}`);
      values.push(data.document.trim());
    }
    if (data.username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(data.username?.trim() || null);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email?.trim() || null);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(data.role);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, document, full_name, username, email, role, is_active, created_at, updated_at
    `;

    return queryOne<User>(sql, values);
  }
}

export const userRepository = new UserRepository();
