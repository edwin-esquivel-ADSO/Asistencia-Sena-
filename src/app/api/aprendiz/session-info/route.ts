import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Código QR o token no proporcionado.' }, { status: 400 });
  }

  try {
    const session = await queryOne(`
      SELECT 
        q.id, q.token, q.instructor_name, q.ficha_code, q.program_name,
        q.jornada, q.ambiente_name, q.grupo, q.sede, q.hours_duration,
        q.session_type, q.status, q.expires_at
      FROM qr_sessions q
      WHERE q.token = $1 LIMIT 1
    `, [token]);

    if (!session) {
      return NextResponse.json({ error: 'El código QR es inválido o no existe en el sistema.' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (session.status !== 'active' || expiresAt < now) {
      return NextResponse.json({
        expired: true,
        error: 'Este código QR ha expirado o la sesión fue finalizada por el instructor.',
        session
      }, { status: 410 });
    }

    return NextResponse.json({ expired: false, session });
  } catch (error: any) {
    console.error('Error fetching session info:', error);
    return NextResponse.json({ error: 'Error al consultar datos de la sesión' }, { status: 500 });
  }
}
