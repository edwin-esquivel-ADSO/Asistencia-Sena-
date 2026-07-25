import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const fichas = await query(`SELECT id, code, program_name FROM fichas ORDER BY code ASC`);
    const ambientes = await query(`SELECT id, name FROM ambientes ORDER BY name ASC`);
    const jornadas = ['Diurna', 'Tarde', 'Nocturna', 'Mixta'];

    return NextResponse.json({
      fichas,
      ambientes,
      jornadas
    });
  } catch (error: any) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ error: 'Error al obtener opciones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, code, program_name, name } = body;

    if (type === 'ficha') {
      if (!code || !program_name) {
        return NextResponse.json({ error: 'Código y Nombre del Programa son requeridos.' }, { status: 400 });
      }
      const res = await query(
        `INSERT INTO fichas (code, program_name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET program_name = EXCLUDED.program_name RETURNING *`,
        [code.trim(), program_name.trim()]
      );
      return NextResponse.json({ success: true, ficha: res[0] });
    } else if (type === 'ambiente') {
      if (!name) {
        return NextResponse.json({ error: 'Nombre del Ambiente es requerido.' }, { status: 400 });
      }
      const res = await query(
        `INSERT INTO ambientes (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *`,
        [name.trim()]
      );
      return NextResponse.json({ success: true, ambiente: res[0] || { name: name.trim() } });
    }

    return NextResponse.json({ error: 'Tipo de opción no válido.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error saving option:', error);
    return NextResponse.json({ error: 'Error al guardar nueva opción maestra' }, { status: 500 });
  }
}
