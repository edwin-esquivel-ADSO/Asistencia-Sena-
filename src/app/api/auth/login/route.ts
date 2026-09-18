import { NextResponse } from 'next/server';
import { LoginSchema } from '@/domain/user.domain';
import { authService, AuthenticationError } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Datos de inicio de sesión inválidos.' },
        { status: 400 }
      );
    }

    const { user, token, redirect } = await authService.authenticateUser(parseResult.data);

    const response = NextResponse.json({
      success: true,
      user,
      redirect,
      message: 'Inicio de sesión exitoso.'
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
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el inicio de sesión.' },
      { status: 500 }
    );
  }
}
