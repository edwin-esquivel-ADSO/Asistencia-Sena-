import { NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { signAprendizSessionToken } from '@/lib/aprendiz-auth';
import { FACE_CONFIG } from '@/lib/face-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      document,
      full_name,
      candidate_descriptor,
      manual_review_requested,
      failure_reason
    } = body;

    if (!document || !full_name) {
      return NextResponse.json({ error: 'Documento y nombre completo requeridos.' }, { status: 400 });
    }

    const cleanDocument = String(document).trim();

    // Obtener información del cliente
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Desconocida';
    const userAgent = request.headers.get('user-agent') || 'Desconocido';

    const aprendiz = await queryOne<any>(
      `SELECT id, document, full_name, ficha_id, is_active, face_descriptor_json, face_asset_public_id FROM aprendices WHERE document = $1 AND is_active = true LIMIT 1`,
      [cleanDocument]
    );

    if (!aprendiz) {
      return NextResponse.json({ error: 'Perfil de aprendiz no encontrado o inactivo.' }, { status: 404 });
    }

    // Si solicitó revisión manual explícita
    if (manual_review_requested) {
      const verificationRecord = await queryOne<any>(
        `INSERT INTO face_verifications (
          aprendiz_id, purpose, match_score, result, failure_reason, ip_address, user_agent, browser, device
        ) VALUES ($1, 'login', NULL, 'manual_review', $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          aprendiz.id,
          failure_reason || 'Solicitud manual del aprendiz',
          ipAddress,
          userAgent,
          userAgent.includes('Chrome') ? 'Chrome' : 'Browser',
          userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
        ]
      );

      await query(
        `INSERT INTO audit_events (actor_role, actor_id, actor_identifier, event_type, target_entity, target_id, ip_address, user_agent, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'aprendiz',
          aprendiz.id,
          cleanDocument,
          'FACE_VERIFICATION_MANUAL_REVIEW',
          'face_verifications',
          verificationRecord.id,
          ipAddress,
          userAgent,
          JSON.stringify({ failure_reason })
        ]
      );

      return NextResponse.json({
        success: false,
        result: 'manual_review',
        message: 'Solicitud de verificación manual registrada. Notifique a su instructor.'
      });
    }

    // Verificar si existe descriptor de referencia en BD
    let refDescriptor: number[] | null = null;
    if (aprendiz.face_descriptor_json) {
      try {
        refDescriptor = typeof aprendiz.face_descriptor_json === 'string'
          ? JSON.parse(aprendiz.face_descriptor_json)
          : aprendiz.face_descriptor_json;
      } catch (err) {
        refDescriptor = null;
      }
    }

    if (!refDescriptor || !Array.isArray(refDescriptor) || refDescriptor.length === 0) {
      return NextResponse.json({
        error: 'El aprendiz no cuenta con registro biométrico inicial. Debe realizar el registro de primera vez.'
      }, { status: 400 });
    }

    if (!candidate_descriptor || !Array.isArray(candidate_descriptor)) {
      return NextResponse.json({
        error: 'Descriptor facial candidato no proporcionado o inválido.'
      }, { status: 400 });
    }

    // Calcular distancia euclidiana estricta en el servidor
    let distance = 0;
    const len = Math.min(refDescriptor.length, candidate_descriptor.length);
    for (let i = 0; i < len; i++) {
      const diff = Number(refDescriptor[i]) - Number(candidate_descriptor[i]);
      distance += diff * diff;
    }
    distance = Math.sqrt(distance);

    // Servidor decide el resultado según el umbral configurable
    const isMatch = distance <= FACE_CONFIG.SIMILARITY_THRESHOLD;
    const computedResult = isMatch ? 'verified' : 'failed';

    // Registrar intento en face_verifications
    const verificationRecord = await queryOne<any>(
      `INSERT INTO face_verifications (
        aprendiz_id, purpose, match_score, result, failure_reason, ip_address, user_agent, browser, device
      ) VALUES ($1, 'login', $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        aprendiz.id,
        Number(distance.toFixed(4)),
        computedResult,
        isMatch ? null : `Distancia facial ${distance.toFixed(4)} supera el umbral ${FACE_CONFIG.SIMILARITY_THRESHOLD}`,
        ipAddress,
        userAgent,
        userAgent.includes('Chrome') ? 'Chrome' : 'Browser',
        userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
      ]
    );

    // Auditoría de seguridad
    await query(
      `INSERT INTO audit_events (actor_role, actor_id, actor_identifier, event_type, target_entity, target_id, ip_address, user_agent, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'aprendiz',
        aprendiz.id,
        cleanDocument,
        `FACE_VERIFICATION_${computedResult.toUpperCase()}`,
        'face_verifications',
        verificationRecord.id,
        ipAddress,
        userAgent,
        JSON.stringify({ match_score: distance, threshold: FACE_CONFIG.SIMILARITY_THRESHOLD })
      ]
    );

    if (!isMatch) {
      // Contar fallos recientes
      const recentFails = await queryOne<any>(
        `SELECT COUNT(*) as fail_count FROM face_verifications
         WHERE aprendiz_id = $1 AND result = 'failed' AND created_at > NOW() - INTERVAL '30 minutes'`,
        [aprendiz.id]
      );

      const failCount = Number(recentFails?.fail_count || 0);

      return NextResponse.json({
        success: false,
        result: failCount >= FACE_CONFIG.MAX_FAILED_ATTEMPTS ? 'manual_review' : 'failed',
        match_score: Number(distance.toFixed(4)),
        message: failCount >= FACE_CONFIG.MAX_FAILED_ATTEMPTS
          ? 'Ha excedido el número máximo de intentos. Solicite validación manual con su instructor.'
          : 'No fue posible confirmar su identidad facial. Asegure buena iluminación e intente de nuevo.'
      });
    }

    // Emitir sesión segura de aprendiz
    const aprendizSession = {
      id: aprendiz.id,
      document: aprendiz.document,
      full_name: aprendiz.full_name,
      ficha_id: aprendiz.ficha_id,
      face_verified: true,
      verified_at: new Date().toISOString()
    };

    const token = signAprendizSessionToken(aprendizSession);
    const response = NextResponse.json({
      success: true,
      result: 'verified',
      match_score: Number(distance.toFixed(4)),
      redirect: '/aprendiz/dashboard'
    });

    response.cookies.set({
      name: 'sena_aprendiz_session',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
    });

    return response;

  } catch (error: any) {
    console.error('Error al procesar verificación facial:', error);
    return NextResponse.json(
      { error: 'Error interno en la verificación facial.' },
      { status: 500 }
    );
  }
}
