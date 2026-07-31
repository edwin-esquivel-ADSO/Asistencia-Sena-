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
      ficha_id,
      biometric_consent,
      face_asset_public_id,
      face_descriptor_json,
      manual_review_requested
    } = body;

    if (!document || !full_name || !ficha_id) {
      return NextResponse.json(
        { error: 'Todos los campos requeridos (documento, nombre completo y ficha) deben ser proporcionados.' },
        { status: 400 }
      );
    }

    const cleanDocument = String(document).trim();
    const cleanFullName = String(full_name).trim();

    // Validar ficha existente
    const ficha = await queryOne<any>(`SELECT id FROM fichas WHERE id = $1 LIMIT 1`, [ficha_id]);
    if (!ficha) {
      return NextResponse.json({ error: 'La ficha seleccionada no existe en el sistema.' }, { status: 400 });
    }

    if (!manual_review_requested && !biometric_consent) {
      return NextResponse.json(
        { error: 'Debe autorizar de manera libre y expresa el tratamiento biométrico de su imagen.' },
        { status: 400 }
      );
    }

    // Verificar si ya existe aprendiz
    const existing = await queryOne<any>(`SELECT id FROM aprendices WHERE document = $1 LIMIT 1`, [cleanDocument]);

    let aprendizId = existing?.id;

    if (!existing) {
      const newAprendiz = await queryOne<any>(
        `INSERT INTO aprendices (
          document, full_name, ficha_id, is_active,
          face_asset_public_id, face_descriptor_json, face_registered_at,
          biometric_consent_at, biometric_consent_version
        ) VALUES ($1, $2, $3, true, $4, $5, $6, $7, $8)
        RETURNING id, document, full_name, ficha_id`,
        [
          cleanDocument,
          cleanFullName,
          ficha_id,
          manual_review_requested ? null : face_asset_public_id,
          manual_review_requested ? null : JSON.stringify(face_descriptor_json || null),
          manual_review_requested ? null : new Date().toISOString(),
          biometric_consent ? new Date().toISOString() : null,
          FACE_CONFIG.CONSENT_VERSION
        ]
      );
      aprendizId = newAprendiz.id;
    } else {
      // Actualizar registro facial
      await query(
        `UPDATE aprendices SET
          full_name = $1,
          ficha_id = $2,
          face_asset_public_id = COALESCE($3, face_asset_public_id),
          face_descriptor_json = COALESCE($4, face_descriptor_json),
          face_registered_at = CASE WHEN $3 IS NOT NULL THEN NOW() ELSE face_registered_at END,
          biometric_consent_at = CASE WHEN $5 IS TRUE THEN NOW() ELSE biometric_consent_at END,
          updated_at = NOW()
         WHERE id = $6`,
        [
          cleanFullName,
          ficha_id,
          manual_review_requested ? null : face_asset_public_id,
          manual_review_requested ? null : JSON.stringify(face_descriptor_json || null),
          biometric_consent,
          aprendizId
        ]
      );
    }

    // Registrar en audit_events
    await query(
      `INSERT INTO audit_events (actor_role, actor_id, actor_identifier, event_type, target_entity, target_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'aprendiz',
        aprendizId,
        cleanDocument,
        manual_review_requested ? 'APRENDIZ_FIRST_TIME_MANUAL_REQUEST' : 'APRENDIZ_FIRST_TIME_REGISTERED',
        'aprendices',
        aprendizId,
        JSON.stringify({ manual_review_requested: Boolean(manual_review_requested) })
      ]
    );

    // Emitir sesión del aprendiz
    const aprendizSession = {
      id: aprendizId,
      document: cleanDocument,
      full_name: cleanFullName,
      ficha_id: Number(ficha_id),
      face_verified: !manual_review_requested,
      verified_at: new Date().toISOString()
    };

    const token = signAprendizSessionToken(aprendizSession);
    const response = NextResponse.json({
      success: true,
      manual_review_requested: Boolean(manual_review_requested),
      redirect: '/aprendiz/dashboard'
    });

    response.cookies.set({
      name: 'sena_aprendiz_session',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 horas
    });

    return response;

  } catch (error: any) {
    console.error('Error en registro primera vez aprendiz:', error);
    return NextResponse.json(
      { error: 'Error interno durante el registro del aprendiz.' },
      { status: 500 }
    );
  }
}
