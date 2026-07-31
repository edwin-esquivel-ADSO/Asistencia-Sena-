import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      session_id,
      aprendiz_name,
      aprendiz_document,
      arrival_time,
      excuse_note,
      excuse_path,
      estado,
      horas
    } = body;

    if (!session_id || !aprendiz_name || !aprendiz_document) {
      return NextResponse.json(
        { error: 'Selección de sesión, nombre y documento del estudiante son requeridos.' },
        { status: 400 }
      );
    }

    const session = await queryOne(`SELECT * FROM qr_sessions WHERE id = $1 AND instructor_id = $2`, [session_id, user.id]);
    if (!session) {
      return NextResponse.json({ error: 'La sesión de asistencia especificada no existe' }, { status: 404 });
    }

    const statusValue = estado === 'Justificado' ? 'Justificado' : 'Tarde';
    const hoursValue = Number.isFinite(Number(horas))
      ? Math.max(0, Math.min(12, Number(horas)))
      : Number(session.hours_duration || 0);
    const aprendiz = await queryOne<any>(
      `SELECT id FROM aprendices WHERE document = $1`,
      [aprendiz_document.trim()]
    );

    // Una falta automática se corrige en lugar de añadir una segunda fila.
    const existing = await queryOne<any>(
      `SELECT id FROM attendances WHERE qr_session_id = $1 AND aprendiz_document = $2 LIMIT 1`,
      [session.id, aprendiz_document.trim()]
    );

    if (existing) {
      const attendance = await queryOne(`
        UPDATE attendances
        SET aprendiz_name = $1, estado = $2, registro_tipo = 'tarde_manual',
            horas = $3, arrival_time = $4, excuse_note = $5, excuse_path = $6,
            aprendiz_id = COALESCE($7, aprendiz_id),
            location_status = 'Registro manual por instructor',
            ip_publica = 'Registro manual por instructor',
            navegador = 'Panel Instructor', dispositivo = 'Panel Instructor',
            updated_at = NOW()
        WHERE id = $8 RETURNING *
      `, [
        aprendiz_name.trim(), statusValue, hoursValue,
        arrival_time && String(arrival_time).trim() !== '' ? String(arrival_time).trim() : null,
        excuse_note?.trim() || null, excuse_path?.trim() || null,
        aprendiz?.id || null, existing.id
      ]);
      return NextResponse.json({ success: true, attendance, updated_existing: true });
    }

    // Insert manual late attendance record with optional excuse_path
    const attendance = await queryOne(`
      INSERT INTO attendances (
        qr_session_id, instructor_name, ficha_code, jornada, ambiente_name,
        grupo, sede, aprendiz_name, aprendiz_document, estado, registro_tipo,
        horas, arrival_time, excuse_note, excuse_path, location_status, ip_publica,
        navegador, dispositivo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'tarde_manual', $11, $12, $13, $14, 'Registro Manual Instructor', '127.0.0.1', 'Navegador Web', 'Panel Instructor')
      RETURNING *
    `, [
      session.id,
      session.instructor_name,
      session.ficha_code,
      session.jornada,
      session.ambiente_name,
      session.grupo || 'Grupo 1',
      session.sede || 'Sede Principal',
      aprendiz_name.trim(),
      aprendiz_document.trim(),
      statusValue,
      hoursValue,
      arrival_time && String(arrival_time).trim() !== '' ? String(arrival_time).trim() : null,
      excuse_note?.trim() || null,
      excuse_path?.trim() || null
    ]);

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    console.error('Error creating manual late entry:', error);
    return NextResponse.json({ error: 'Error al registrar tardanza manual' }, { status: 500 });
  }
}
