import { query } from '@/lib/db';

export class AuditRepository {
  async log(data: {
    actor_role: string;
    actor_id?: number | null;
    actor_identifier: string;
    event_type: string;
    target_entity: string;
    target_id?: number | null;
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const sql = `
        INSERT INTO audit_events (
          actor_role, actor_id, actor_identifier, event_type,
          target_entity, target_id, ip_address, user_agent, metadata_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      await query(sql, [
        data.actor_role,
        data.actor_id || null,
        data.actor_identifier,
        data.event_type,
        data.target_entity,
        data.target_id || null,
        data.ip_address || 'Desconocida',
        data.user_agent || 'Desconocido',
        data.metadata ? JSON.stringify(data.metadata) : null
      ]);
    } catch (err) {
      console.error('Error logging audit event:', err);
    }
  }
}

export const auditRepository = new AuditRepository();
