import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { getSignedImageUrl } from '@/lib/cloudinary';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'instructor') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const aprendizId = searchParams.get('aprendiz_id');

    if (!aprendizId) {
      return NextResponse.json({ error: 'ID de aprendiz requerido.' }, { status: 400 });
    }

    // Verificar que el aprendiz pertenezca a una ficha asignada a este instructor
    const aprendiz = await queryOne<any>(
      `SELECT a.id, a.document, a.full_name, a.face_asset_public_id, a.face_registered_at, a.biometric_consent_at, f.code as ficha_code, f.program_name
       FROM aprendices a
       JOIN fichas f ON a.ficha_id = f.id
       JOIN instructor_fichas ifi ON ifi.ficha_id = f.id
       WHERE a.id = $1 AND ifi.instructor_id = $2 LIMIT 1`,
      [aprendizId, user.id]
    );

    if (!aprendiz) {
      return NextResponse.json(
        { error: 'El aprendiz no está asignado a ninguna de sus fichas o no existe.' },
        { status: 404 }
      );
    }

    // Generar URL firmada temporal solo si existe asset de Cloudinary (duración 5 minutos)
    const signedFaceUrl = aprendiz.face_asset_public_id
      ? getSignedImageUrl(aprendiz.face_asset_public_id, 300)
      : null;

    // Historial del aprendiz con auditoría
    const attendances = await query<any>(
      `SELECT att.id, att.fecha, att.hora, att.ficha_code, att.jornada, att.ambiente_name, att.estado, att.registro_tipo,
              att.horas, att.ip_publica, att.latitud, att.longitud, att.precision_gps, att.location_status,
              att.navegador, att.dispositivo, fv.match_score, fv.result as face_result
       FROM attendances att
       LEFT JOIN face_verifications fv ON att.face_verification_id = fv.id
       WHERE att.aprendiz_document = $1
       ORDER BY att.fecha DESC, att.hora DESC`,
      [aprendiz.document]
    );

    // Auditorías del aprendiz
    const auditLogs = await query<any>(
      `SELECT event_type, target_entity, ip_address, browser, device, created_at
       FROM audit_events
       WHERE actor_identifier = $1 OR (target_entity = 'aprendices' AND target_id = $2)
       ORDER BY created_at DESC LIMIT 20`,
      [aprendiz.document, aprendiz.id]
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
        signed_face_url: signedFaceUrl,
        face_registered_at: aprendiz.face_registered_at,
        biometric_consent_at: aprendiz.biometric_consent_at
      },
      attendances,
      auditLogs
    });

  } catch (error: any) {
    console.error('Error al obtener detalle del aprendiz:', error);
    return NextResponse.json({ error: 'Error interno al consultar detalle de aprendiz.' }, { status: 500 });
  }
}
