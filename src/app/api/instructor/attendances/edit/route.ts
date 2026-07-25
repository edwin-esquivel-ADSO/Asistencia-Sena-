import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, estado, horas, excuse_note, arrival_time } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de registro es requerido' }, { status: 400 });
    }

    let finalState = estado;
    if (estado === 'Tarde Justificada') finalState = 'Justificado';
    if (estado === 'Tarde No Justificada') finalState = 'Tarde';

    const validStates = ['Presente', 'Falta', 'Tarde', 'Justificado'];
    if (finalState && !validStates.includes(finalState)) {
      return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
    }

    const updated = await queryOne(`
      UPDATE attendances
      SET 
        estado = COALESCE($1, estado),
        horas = COALESCE($2, horas),
        excuse_note = COALESCE($3, excuse_note),
        arrival_time = COALESCE($4, arrival_time),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      finalState || null,
      horas !== undefined ? parseInt(horas) : null,
      excuse_note !== undefined ? excuse_note : null,
      arrival_time !== undefined ? arrival_time : null,
      id
    ]);

    return NextResponse.json({ success: true, attendance: updated });
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Error al actualizar registro de asistencia' }, { status: 500 });
  }
}
