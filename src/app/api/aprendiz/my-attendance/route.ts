import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const document = searchParams.get('document');

  if (!document) {
    return NextResponse.json({ error: 'Número de documento es requerido.' }, { status: 400 });
  }

  try {
    const attendances = await query(`
      SELECT * FROM attendances 
      WHERE aprendiz_document = $1 
      ORDER BY fecha DESC, hora DESC
    `, [document.trim()]);

    return NextResponse.json({ attendances });
  } catch (error: any) {
    console.error('Error querying student history:', error);
    return NextResponse.json({ error: 'Error al consultar historial del estudiante' }, { status: 500 });
  }
}
