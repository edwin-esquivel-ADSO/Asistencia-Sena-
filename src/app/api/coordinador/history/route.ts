import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'coordinador') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const attendances = await query(`
      SELECT * FROM attendances ORDER BY fecha DESC, hora DESC LIMIT 500
    `);

    const sessions = await query(`
      SELECT 
        s.*,
        COUNT(a.id)::int as total_asistentes
      FROM qr_sessions s
      LEFT JOIN attendances a ON s.id = a.qr_session_id
      GROUP BY s.id
      ORDER BY s.created_at DESC LIMIT 100
    `);

    const stats = await query(`
      SELECT 
        COUNT(*)::int as total_registros,
        COUNT(CASE WHEN estado = 'Presente' THEN 1 END)::int as presentes,
        COUNT(CASE WHEN estado LIKE 'Tarde%' THEN 1 END)::int as tardes,
        COUNT(CASE WHEN estado = 'Justificado' THEN 1 END)::int as justificados,
        COUNT(CASE WHEN estado = 'Falta' THEN 1 END)::int as faltas
      FROM attendances
    `);

    return NextResponse.json({
      attendances,
      sessions,
      stats: stats[0] || {}
    });
  } catch (error: any) {
    console.error('Error fetching coordinator history:', error);
    return NextResponse.json({ error: 'Error al cargar reporte global' }, { status: 500 });
  }
}
