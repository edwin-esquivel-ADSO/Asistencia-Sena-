import { NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { uploadImageBuffer } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document, full_name, face_descriptor, face_image_base64 } = body;

    if (!document || !full_name || !face_descriptor) {
      return NextResponse.json({ error: 'Datos de documento, nombre y descriptor facial incompletos.' }, { status: 400 });
    }

    const cleanDocument = String(document).trim();

    // 1. Buscar o verificar aprendiz
    let aprendiz = await queryOne<any>(
      `SELECT id, document, full_name FROM aprendices WHERE document = $1 AND is_active = true LIMIT 1`,
      [cleanDocument]
    );

    if (!aprendiz) {
      return NextResponse.json({ error: 'Perfil de aprendiz no encontrado o inactivo.' }, { status: 404 });
    }

    // 2. Subir imagen a Cloudinary si se proporciona base64
    let publicId = null;
    if (face_image_base64 && face_image_base64.includes('base64,')) {
      try {
        const base64Data = face_image_base64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const uploadRes = await uploadImageBuffer(buffer, `face_biometrics/${cleanDocument}_${Date.now()}`);
        publicId = uploadRes.public_id;
      } catch (err) {
        console.error('Error al subir imagen facial a Cloudinary:', err);
      }
    }

    // 3. Guardar descriptor en DB y vincular asset public_id
    const descriptorJson = JSON.stringify(face_descriptor);

    await query(
      `UPDATE aprendices SET
        face_descriptor_json = $1,
        face_asset_public_id = COALESCE($2, face_asset_public_id),
        face_registered_at = NOW(),
        biometric_consent_at = NOW(),
        updated_at = NOW()
       WHERE id = $3`,
      [descriptorJson, publicId, aprendiz.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Registro biométrico facial guardado exitosamente.'
    });

  } catch (error: any) {
    console.error('Error en register-face:', error);
    return NextResponse.json({ error: 'Error interno al guardar registro facial.' }, { status: 500 });
  }
}
