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
    // 1. Marcar la sesión como finalizada
    const sessionRes = await query<any>(
      `UPDATE qr_sessions SET status = 'finished' WHERE id = $1 AND instructor_id = $2 RETURNING *`,
      [sessionId, user.id]
    );

    if (sessionRes.length > 0) {
      const session = sessionRes[0];

      // 2. Obtener aprendices de la ficha asignada a esta sesión
      // Un QR tardío pertenece a una sesión ya cerrada: no debe volver a
      // generar faltas para esa misma lista de aprendices.
      if (session.session_type === 'regular' && (session.ficha_id || session.ficha_code)) {
        const aprendicesFicha = await query<any>(
          `SELECT a.id, a.document, a.full_name
           FROM aprendices a
           JOIN fichas f ON a.ficha_id = f.id
           WHERE (f.id = $1 OR f.code = $2) AND a.is_active = true`,
          [session.ficha_id || 0, session.ficha_code || '']
        );

        // 3. Crear registros de 'Falta' idempotentes para los aprendices que no registraron asistencia
        for (const ap of aprendicesFicha) {
          const existing = await query<any>(
            `SELECT id FROM attendances WHERE qr_session_id = $1 AND aprendiz_document = $2 LIMIT 1`,
            [sessionId, ap.document]
          );

          if (existing.length === 0) {
            await query(
              `INSERT INTO attendances (
                qr_session_id, fecha, hora, instructor_name, ficha_code, jornada, ambiente_name,
                grupo, sede, aprendiz_name, aprendiz_document, estado, registro_tipo,
                horas, ip_publica, navegador, dispositivo, aprendiz_id
              ) VALUES (
                $1, (NOW() AT TIME ZONE 'America/Bogota')::date, (NOW() AT TIME ZONE 'America/Bogota')::time, $2, $3, $4, $5,
                $6, $7, $8, $9, 'Falta', 'ausencia_automatica',
                0, 'Sistema Server', 'Servidor Automático', 'Proceso de Cierre', $10
              )`,
              [
                sessionId,
                session.instructor_name || user.full_name,
                session.ficha_code || 'General',
                session.jornada || 'Diurna',
                session.ambiente_name || 'Ambiente Asignado',
                session.grupo || 'Grupo 1',
                session.sede || 'Sede Principal',
                ap.full_name,
                ap.document,
                ap.id
              ]
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Sesión finalizada y faltas automáticas registradas.' });
  } catch (error: any) {
    console.error('Error finishing session:', error);
    return NextResponse.json({ error: 'Error al finalizar la sesión' }, { status: 500 });
  }
}
