import { NextResponse } from 'next/server';
import { biometricService } from '@/services/biometric.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document, face_descriptor, face_asset_public_id } = body;

    if (!document || !face_descriptor) {
      return NextResponse.json(
        { error: 'El documento y el descriptor numérico de 128 dimensiones son obligatorios.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(face_descriptor) || face_descriptor.length !== 128) {
      return NextResponse.json(
        { error: 'El descriptor debe ser un arreglo de 128 valores numéricos.' },
        { status: 400 }
      );
    }

    await biometricService.enrollFaceDescriptor(
      String(document).trim(),
      face_descriptor,
      face_asset_public_id || null
    );

    return NextResponse.json({
      success: true,
      message: 'Descriptor biométrico enrolado y almacenado exitosamente en la base de datos.'
    });
  } catch (error: any) {
    console.error('Error in register-face controller:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar el descriptor biométrico.' },
      { status: 500 }
    );
  }
}
