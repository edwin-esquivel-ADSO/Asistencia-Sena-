import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const sessionId = parseInt(id);

  if (!sessionId) {
    return NextResponse.json({ error: 'ID de sesión no válido' }, { status: 400 });
  }

  try {
    await query(
      `UPDATE qr_sessions SET status = 'finished' WHERE id = $1 AND instructor_id = $2`,
      [sessionId, user.id]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error finishing session:', error);
    return NextResponse.json({ error: 'Error al finalizar la sesión' }, { status: 500 });
  }
}
