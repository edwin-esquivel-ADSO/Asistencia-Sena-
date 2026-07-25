import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { signSessionToken, UserSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document, full_name, accept_terms } = body;

    if (!accept_terms) {
      return NextResponse.json(
        { error: 'Debe aceptar los términos de tratamiento de datos personales.' },
        { status: 400 }
      );
    }

    if (!document || !full_name) {
      return NextResponse.json(
        { error: 'Por favor ingrese su número de documento y nombre completo.' },
        { status: 400 }
      );
    }

    const cleanDocument = String(document).trim();
    const cleanInputName = String(full_name).trim().toLowerCase();

    // Query active user by document
    const user = await queryOne<any>(
      `SELECT * FROM users WHERE document = $1 AND is_active = true LIMIT 1`,
      [cleanDocument]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'El nombre completo o número de documento no corresponden a un usuario activo en el sistema.' },
        { status: 401 }
      );
    }

    // Flexible name verification (case-insensitive, trimmed)
    const cleanDbName = String(user.full_name).trim().toLowerCase();
    if (cleanInputName !== cleanDbName) {
      return NextResponse.json(
        { error: 'El nombre completo o número de documento no corresponden a un usuario activo en el sistema.' },
        { status: 401 }
      );
    }

    const userSession: UserSession = {
      id: user.id,
      document: user.document,
      full_name: user.full_name,
      username: user.username || null,
      email: user.email || null,
      role: user.role,
      is_active: user.is_active,
    };

    const token = signSessionToken(userSession);

    const response = NextResponse.json({
      success: true,
      user: userSession,
      redirect: user.role === 'coordinador' ? '/coordinador/dashboard' : '/instructor/dashboard',
    });

    response.cookies.set({
      name: 'sena_session',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el inicio de sesión.' },
      { status: 500 }
    );
  }
}
