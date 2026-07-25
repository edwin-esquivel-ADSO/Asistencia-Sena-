import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const sessions = await query(`
      SELECT 
        s.*,
        COUNT(a.id)::int as total_asistentes,
        COUNT(CASE WHEN a.estado = 'Presente' THEN 1 END)::int as total_presentes,
        COUNT(CASE WHEN a.estado LIKE 'Tarde%' THEN 1 END)::int as total_tardes,
        COUNT(CASE WHEN a.estado = 'Justificado' THEN 1 END)::int as total_justificados,
        COUNT(CASE WHEN a.estado = 'Falta' THEN 1 END)::int as total_faltas
      FROM qr_sessions s
      LEFT JOIN attendances a ON s.id = a.qr_session_id
      WHERE s.instructor_id = $1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [user.id]);

    const attendances = await query(`
      SELECT a.*, s.token as session_token
      FROM attendances a
      LEFT JOIN qr_sessions s ON a.qr_session_id = s.id
      WHERE a.instructor_name = $1
      ORDER BY a.fecha DESC, a.hora DESC
    `, [user.full_name]);

    return NextResponse.json({ sessions, attendances });
  } catch (error: any) {
    console.error('Error fetching instructor history:', error);
    return NextResponse.json({ error: 'Error al consultar historial del instructor' }, { status: 500 });
  }
}
