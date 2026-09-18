import { NextResponse } from 'next/server';
import { biometricService } from '@/services/biometric.service';
import { aprendizRepository } from '@/repositories/aprendiz.repository';
import { signAprendizSessionToken } from '@/lib/aprendiz-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document, candidate_descriptor } = body;

    if (!document || !candidate_descriptor) {
      return NextResponse.json(
        { error: 'El documento y el descriptor facial candidato son obligatorios.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(candidate_descriptor) || candidate_descriptor.length !== 128) {
      return NextResponse.json(
        { error: 'El descriptor candidato debe ser un vector numérico de 128 dimensiones extraído por el cliente.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Desconocida';
    const userAgent = request.headers.get('user-agent') || 'Desconocido';

    const verification = await biometricService.verifyCandidateDescriptor(
      String(document).trim(),
      candidate_descriptor,
      { ip, userAgent }
    );

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          result: verification.result,
          confidence: verification.confidence,
          distance: verification.distance,
          executionTimeMs: verification.executionTimeMs,
          message: verification.message
        },
        { status: verification.result === 'manual_review' ? 403 : 401 }
      );
    }

    // Biometric match confirmed in <200ms
    const aprendiz = await aprendizRepository.findByDocument(String(document).trim(), true);
    if (!aprendiz) {
      return NextResponse.json({ error: 'Aprendiz no encontrado.' }, { status: 404 });
    }

    const aprendizSession = {
      id: aprendiz.id,
      document: aprendiz.document,
      full_name: aprendiz.full_name,
      ficha_id: aprendiz.ficha_id || 0,
      face_verified: true,
      verified_at: new Date().toISOString()
    };

    const token = signAprendizSessionToken(aprendizSession);

    const response = NextResponse.json({
      success: true,
      result: 'verified',
      confidence: verification.confidence,
      distance: verification.distance,
      executionTimeMs: verification.executionTimeMs,
      redirect: '/aprendiz/dashboard',
      message: 'Identidad facial verificada exitosamente.'
    });

    response.cookies.set({
      name: 'sena_aprendiz_session',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return response;
  } catch (error: any) {
    console.error('Error in face verification controller:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar verificación facial.' },
      { status: 500 }
    );
  }
}
