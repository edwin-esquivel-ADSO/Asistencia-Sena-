import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'instructor') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const notifications = await query<any>(
      `SELECT id, type, title, body, link_url, is_read, metadata_json, created_at
       FROM notifications
       WHERE recipient_role = 'instructor' AND recipient_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );

    const pendingExcuses = await query<any>(
      `SELECT e.id, e.start_date, e.end_date, e.reason, e.file_path, e.status, e.created_at,
              a.full_name as aprendiz_name, a.document as aprendiz_document, f.code as ficha_code
       FROM excuse_requests e
       JOIN aprendices a ON e.aprendiz_id = a.id
       JOIN fichas f ON a.ficha_id = f.id
       JOIN instructor_fichas ifi ON ifi.ficha_id = f.id
       WHERE ifi.instructor_id = $1 AND e.status = 'pending'
       ORDER BY e.created_at DESC`,
      [user.id]
    );

    const settings = await queryOne<any>(
      `SELECT alert_email, email_verified, preferences_json FROM instructor_notification_settings WHERE instructor_id = $1 LIMIT 1`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      notifications,
      pendingExcuses,
      settings: settings || { alert_email: user.email || '', email_verified: false }
    });

  } catch (error: any) {
    console.error('Error al obtener notificaciones del instructor:', error);
    return NextResponse.json({ error: 'Error interno al consultar notificaciones.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'instructor') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const { notification_id, mark_all } = body;

    if (mark_all) {
      await query(
        `UPDATE notifications SET is_read = true WHERE recipient_role = 'instructor' AND recipient_id = $1`,
        [user.id]
      );
    } else if (notification_id) {
      await query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_role = 'instructor' AND recipient_id = $2`,
        [notification_id, user.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error actualizando estado de notificación:', error);
    return NextResponse.json({ error: 'Error interno al actualizar.' }, { status: 500 });
  }
}
