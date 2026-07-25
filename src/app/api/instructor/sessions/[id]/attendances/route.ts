import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const sessionId = parseInt(id);

  if (!sessionId) {
    return NextResponse.json({ error: 'ID de sesión no válido' }, { status: 400 });
  }

  try {
    const session = await queryOne(`SELECT * FROM qr_sessions WHERE id = $1`, [sessionId]);
    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    const attendances = await query(
      `SELECT * FROM attendances WHERE qr_session_id = $1 ORDER BY hora DESC`,
      [sessionId]
    );

    return NextResponse.json({
      session,
      attendances
    });
  } catch (error: any) {
    console.error('Error fetching session attendances:', error);
    return NextResponse.json({ error: 'Error al consultar asistencias' }, { status: 500 });
  }
}
