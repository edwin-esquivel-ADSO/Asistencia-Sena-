import { query, queryOne } from '@/lib/db';

export interface Notification {
  id: number;
  recipient_role: 'instructor' | 'aprendiz' | 'coordinador';
  recipient_id: number;
  type: string;
  title: string;
  body: string;
  link_url?: string | null;
  is_read: boolean;
  metadata_json?: any;
  created_at: string;
}

export class NotificationRepository {
  async createNotification(data: {
    recipient_role: 'instructor' | 'aprendiz' | 'coordinador';
    recipient_id: number;
    type: string;
    title: string;
    body: string;
    link_url?: string | null;
    metadata_json?: any;
  }): Promise<Notification> {
    const sql = `
      INSERT INTO notifications (recipient_role, recipient_id, type, title, body, link_url, metadata_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    return queryOne<Notification>(sql, [
      data.recipient_role,
      data.recipient_id,
      data.type,
      data.title,
      data.body,
      data.link_url || null,
      data.metadata_json ? JSON.stringify(data.metadata_json) : null
    ]) as Promise<Notification>;
  }

  async findByRecipient(role: 'instructor' | 'aprendiz' | 'coordinador', recipientId: number): Promise<Notification[]> {
    const sql = `
      SELECT * FROM notifications
      WHERE recipient_role = $1 AND recipient_id = $2
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return query<Notification>(sql, [role, recipientId]);
  }

  async getInstructorSettings(instructorId: number): Promise<{ alert_email: string | null; email_verified: boolean } | null> {
    const sql = `SELECT alert_email, email_verified FROM instructor_notification_settings WHERE instructor_id = $1 LIMIT 1`;
    return queryOne(sql, [instructorId]);
  }
}

export const notificationRepository = new NotificationRepository();
