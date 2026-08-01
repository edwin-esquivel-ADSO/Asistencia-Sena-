import { NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { signAprendizSessionToken } from '@/lib/aprendiz-auth';
import { FACE_CONFIG } from '@/lib/face-config';
import { normalizeName, cleanDocumentNumber } from '@/lib/string-utils';
import { isCloudinaryConfigured, uploadImageBuffer } from '@/lib/cloudinary';

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
      face_image_base64,
      manual_review_requested
    } = body;

    if (!document || !full_name || !ficha_id) {
      return NextResponse.json(
        { error: 'Todos los campos requeridos (documento, nombre completo y ficha) deben ser proporcionados.' },
        { status: 400 }
      );
    }

    const cleanDoc = cleanDocumentNumber(document);
    const cleanFullName = String(full_name).trim();
    const normalizedInputName = normalizeName(cleanFullName);

    // 1. Validar existencia de la ficha
    const ficha = await queryOne<any>(`SELECT id, code, program_name FROM fichas WHERE id = $1 LIMIT 1`, [ficha_id]);
    if (!ficha) {
      return NextResponse.json({ error: 'La ficha seleccionada no existe en el sistema.' }, { status: 400 });
    }

    if (!manual_review_requested && !biometric_consent) {
      return NextResponse.json(
        { error: 'Debe autorizar de manera libre y expresa el tratamiento biométrico de su imagen.' },
        { status: 400 }
      );
    }

    // 2. Anclaje de verificación contra la BD / Roster de la ficha
    const existingInFicha = await queryOne<any>(
      `SELECT id, document, full_name, is_active, deactivation_reason, face_asset_public_id, face_descriptor_json
       FROM aprendices
       WHERE document = $1 AND ficha_id = $2 LIMIT 1`,
      [cleanDoc, ficha_id]
    );

    let existingInAnyFicha = null;
    if (!existingInFicha) {
      existingInAnyFicha = await queryOne<any>(
        `SELECT id, document, full_name, ficha_id, is_active, deactivation_reason
         FROM aprendices
         WHERE document = $1 LIMIT 1`,
        [cleanDoc]
      );
    }

    const matchedAprendiz = existingInFicha || existingInAnyFicha;

    // Contar si la ficha ya cuenta con un listado previo subido por el instructor
    const rosterCount = await queryOne<any>(
      `SELECT COUNT(*)::int as count FROM aprendices WHERE ficha_id = $1`,
      [ficha_id]
    );

    // Si la ficha ya tiene aprendices en su listado oficial y el documento no coincide:
    if (rosterCount?.count > 0 && !matchedAprendiz) {
      return NextResponse.json(
        {
          error: `El número de documento ${cleanDoc} no se encuentra registrado en el listado oficial importado para la ficha ${ficha.code}. Verifique que el documento ingresado sea correcto o consulte con su instructor.`
        },
        { status: 400 }
      );
    }

    // Si el aprendiz existe en la lista, validar su estado activo y la coincidencia de su nombre
    if (matchedAprendiz) {
      if (matchedAprendiz.is_active === false) {
        return NextResponse.json(
          {
            error: `El aprendiz con documento ${cleanDoc} ha sido marcado como inactivo/retirado por el instructor. Motivo: ${matchedAprendiz.deactivation_reason || 'Retiro de ficha'}. Contacte a su instructor.`
          },
          { status: 400 }
        );
      }

      const normalizedDbName = normalizeName(matchedAprendiz.full_name);
      if (normalizedInputName !== normalizedDbName) {
        return NextResponse.json(
          {
            error: `El nombre ingresado ("${cleanFullName}") no coincide con el registrado en el listado oficial de la ficha para este documento ("${matchedAprendiz.full_name}"). Por favor ingrese su nombre exactamente como figura en el listado de la ficha.`
          },
          { status: 400 }
        );
      }
    }

    // 3. Subir imagen facial a Cloudinary si se envió base64
    let finalFacePublicId = face_asset_public_id || null;
    if (!manual_review_requested && face_image_base64 && isCloudinaryConfigured()) {
      try {
        const base64Data = face_image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const uploadRes = await uploadImageBuffer(buffer, `face_${cleanDoc}_${Date.now()}`);
        if (uploadRes && uploadRes.public_id) {
          finalFacePublicId = uploadRes.public_id;
        }
      } catch (cloudErr) {
        console.error('Error subiendo imagen facial a Cloudinary:', cloudErr);
      }
    }

    let aprendizId: number;

    if (!matchedAprendiz) {
      // Registrar aprendiz nuevo si la ficha aún no tenía listado previo
      const newAprendiz = await queryOne<any>(
        `INSERT INTO aprendices (
          document, full_name, ficha_id, is_active,
          face_asset_public_id, face_descriptor_json, face_registered_at,
          biometric_consent_at, biometric_consent_version
        ) VALUES ($1, $2, $3, true, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          cleanDoc,
          cleanFullName,
          ficha_id,
          manual_review_requested ? null : finalFacePublicId,
          manual_review_requested ? null : JSON.stringify(face_descriptor_json || null),
          manual_review_requested ? null : new Date().toISOString(),
          biometric_consent ? new Date().toISOString() : null,
          FACE_CONFIG.CONSENT_VERSION
        ]
      );
      aprendizId = newAprendiz.id;
    } else {
      // Vincular / Actualizar biometría en el registro existente del listado
      aprendizId = matchedAprendiz.id;
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
          manual_review_requested ? null : finalFacePublicId,
          manual_review_requested ? null : JSON.stringify(face_descriptor_json || null),
          biometric_consent,
          aprendizId
        ]
      );
    }

    // Audit Event
    await query(
      `INSERT INTO audit_events (actor_role, actor_id, actor_identifier, event_type, target_entity, target_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'aprendiz',
        aprendizId,
        cleanDoc,
        manual_review_requested ? 'APRENDIZ_FIRST_TIME_MANUAL_REQUEST' : 'APRENDIZ_FIRST_TIME_REGISTERED',
        'aprendices',
        aprendizId,
        JSON.stringify({ manual_review_requested: Boolean(manual_review_requested), face_public_id: finalFacePublicId })
      ]
    );

    // Emitir JWT Session
    const aprendizSession = {
      id: aprendizId,
      document: cleanDoc,
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
      maxAge: 8 * 60 * 60,
    });

    return response;

  } catch (error: any) {
    console.error('Error en registro primera vez aprendiz:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno durante el registro del aprendiz.' },
      { status: 500 }
    );
  }
}
