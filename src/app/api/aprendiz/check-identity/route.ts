import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document, full_name } = body;

    if (!document || !full_name) {
      return NextResponse.json(
        { error: 'Debe ingresar el nombre completo y el número de documento.' },
        { status: 400 }
      );
    }

    const cleanDocument = String(document).trim();
    const cleanInputName = String(full_name).trim().toLowerCase();

    // Consultar perfil de aprendiz
    const aprendiz = await queryOne<any>(
      `SELECT a.id, a.document, a.full_name, a.ficha_id, a.is_active, a.face_asset_public_id, f.code as ficha_code, f.program_name
       FROM aprendices a
       JOIN fichas f ON a.ficha_id = f.id
       WHERE a.document = $1 AND a.is_active = true LIMIT 1`,
      [cleanDocument]
    );

    if (!aprendiz) {
      return NextResponse.json({
        exists: false,
        message: 'No existe un perfil registrado con este documento. Por favor complete su registro inicial.'
      });
    }

    // Validar coincidencia de nombre sin revelar datos privados si no coincide
    const cleanDbName = String(aprendiz.full_name).trim().toLowerCase();
    if (cleanDbName !== cleanInputName) {
      return NextResponse.json(
        { error: 'Los datos ingresados no coinciden con nuestros registros activos.' },
        { status: 401 }
      );
    }

    // Emitir sesión segura de aprendiz de inmediato para consultar su historial
    const { signAprendizSessionToken } = await import('@/lib/aprendiz-auth');
    const aprendizSession = {
      id: aprendiz.id,
      document: aprendiz.document,
      full_name: aprendiz.full_name,
      ficha_id: aprendiz.ficha_id,
      face_verified: Boolean(aprendiz.face_asset_public_id),
      verified_at: new Date().toISOString()
    };

    const token = signAprendizSessionToken(aprendizSession);
    const response = NextResponse.json({
      exists: true,
      success: true,
      redirect: '/aprendiz/dashboard',
      aprendiz: {
        id: aprendiz.id,
        document: aprendiz.document,
        full_name: aprendiz.full_name,
        ficha_code: aprendiz.ficha_code,
        program_name: aprendiz.program_name
      }
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
    console.error('Error al verificar identidad de aprendiz:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar identidad.' },
      { status: 500 }
    );
  }
}
