import { NextResponse } from 'next/server';
import { getCurrentAprendiz } from '@/lib/aprendiz-auth';
import { queryOne, query } from '@/lib/db';
import { getSignedImageUrl } from '@/lib/cloudinary';

export async function GET(request: Request) {
  try {
    const session = await getCurrentAprendiz();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Debe iniciar sesión como aprendiz.' }, { status: 401 });
    }

    const aprendiz = await queryOne<any>(
      `SELECT a.id, a.document, a.full_name, a.face_asset_public_id, a.face_registered_at, a.biometric_consent_at, f.code as ficha_code, f.program_name
       FROM aprendices a
       JOIN fichas f ON a.ficha_id = f.id
       WHERE a.id = $1 LIMIT 1`,
      [session.id]
    );

    if (!aprendiz) {
      return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
    }

    // Historial del propio aprendiz únicamente
    const attendances = await query<any>(
      `SELECT id, fecha, hora, instructor_name, ficha_code, jornada, ambiente_name, estado, registro_tipo, horas, location_status, excuse_path, excuse_note, tarea_registrada, tarea_nota
       FROM attendances
       WHERE aprendiz_document = $1
       ORDER BY fecha DESC, hora DESC`,
      [session.document]
    );

    // Excusas del propio aprendiz
    const excuses = await query<any>(
      `SELECT e.id, e.start_date, e.end_date, e.reason, e.file_path, e.status, e.instructor_comment, e.created_at, u.full_name as instructor_name
       FROM excuse_requests e
       LEFT JOIN users u ON e.decided_by_instructor_id = u.id
       WHERE e.aprendiz_id = $1
       ORDER BY e.created_at DESC`,
      [session.id]
    );

    // Notificaciones del propio aprendiz
    const notifications = await query<any>(
      `SELECT id, type, title, body, link_url, is_read, created_at
       FROM notifications
       WHERE recipient_role = 'aprendiz' AND recipient_id = $1
       ORDER BY created_at DESC`,
      [session.id]
    );

    return NextResponse.json({
      success: true,
      aprendiz: {
        id: aprendiz.id,
        document: aprendiz.document,
        full_name: aprendiz.full_name,
        ficha_code: aprendiz.ficha_code,
        program_name: aprendiz.program_name,
        face_registered: Boolean(aprendiz.face_asset_public_id),
        biometric_consent: Boolean(aprendiz.biometric_consent_at),
        face_registered_at: aprendiz.face_registered_at
      },
      attendances,
      excuses,
      notifications
    });

  } catch (error: any) {
    console.error('Error al obtener datos de perfil del aprendiz:', error);
    return NextResponse.json(
      { error: 'Error al obtener información personal.' },
      { status: 500 }
    );
  }
}
