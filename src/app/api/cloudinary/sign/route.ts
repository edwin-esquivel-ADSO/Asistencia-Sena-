import { NextResponse } from 'next/server';
import { isCloudinaryConfigured, generateSignature } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { error: 'Cloudinary no está configurado en las variables de entorno del servidor. Por favor configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { folder, type } = body;

    // Generar public_id aleatorio no adivinable sin PII
    const randomId = 'face_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    const targetFolder = folder || 'sena_biometrics';

    const paramsToSign = {
      folder: targetFolder,
      public_id: randomId,
      type: 'authenticated', // Activos privados / autenticados únicamente
    };

    const { signature, timestamp } = generateSignature(paramsToSign);

    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      public_id: randomId,
      folder: targetFolder,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error: any) {
    console.error('Error generando firma de Cloudinary:', error);
    return NextResponse.json(
      { error: 'Error al generar firma segura de carga.' },
      { status: 500 }
    );
  }
}
