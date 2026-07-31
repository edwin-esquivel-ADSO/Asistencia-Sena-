import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'instructor') {
      return NextResponse.json({ error: 'Acceso denegado. Solo instructores.' }, { status: 403 });
    }

    const { id } = await params;
    const excuseId = parseInt(id);

    const body = await request.json();
    const { action, instructor_comment } = body; // action: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Acción no válida. Debe ser approved o rejected.' }, { status: 400 });
    }

    if (action === 'rejected' && (!instructor_comment || !instructor_comment.trim())) {
      return NextResponse.json({ error: 'El comentario de rechazo es obligatorio.' }, { status: 400 });
    }

    const excuse = await queryOne<any>(
      `SELECT e.*, a.document as aprendiz_document, a.full_name as aprendiz_name, a.id as ap_id
       FROM excuse_requests e
       JOIN aprendices a ON e.aprendiz_id = a.id
       WHERE e.id = $1 LIMIT 1`,
      [excuseId]
    );

    if (!excuse) {
      return NextResponse.json({ error: 'Excusa no encontrada.' }, { status: 404 });
    }

    // Actualizar estado de la excusa
    await query(
      `UPDATE excuse_requests
       SET status = $1, decided_by_instructor_id = $2, instructor_comment = $3, decided_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [action, user.id, instructor_comment || null, excuseId]
    );

    // Si se aprueba, actualizar la asistencia asociada o registros en la fecha afectada a 'Justificado' sin eliminar evidencia
    if (action === 'approved') {
      if (excuse.attendance_id) {
        await query(
          `UPDATE attendances
           SET estado = 'Justificado', excuse_path = $1, excuse_note = $2, updated_at = NOW()
           WHERE id = $3`,
          [excuse.file_path, excuse.reason, excuse.attendance_id]
        );
      } else {
        await query(
          `UPDATE attendances
           SET estado = 'Justificado', excuse_path = $1, excuse_note = $2, updated_at = NOW()
           WHERE aprendiz_document = $3 AND fecha >= $4 AND fecha <= $5`,
          [excuse.file_path, excuse.reason, excuse.aprendiz_document, excuse.start_date, excuse.end_date]
        );
      }
    }

    // Notificar al aprendiz
    const title = action === 'approved' ? 'Excusa Aprobada' : 'Excusa Rechazada';
    const bodyText = action === 'approved'
      ? `Su excusa para el periodo ${excuse.start_date} ha sido APROBADA por el instructor ${user.full_name}.`
      : `Su excusa para el periodo ${excuse.start_date} fue RECHAZADA. Motivo: ${instructor_comment}`;

    await query(
      `INSERT INTO notifications (recipient_role, recipient_id, type, title, body, link_url)
       VALUES ('aprendiz', $1, $2, $3, $4, '/aprendiz/dashboard')`,
      [excuse.ap_id, `excuse_${action}`, title, bodyText]
    );

    // Auditoría
    await query(
      `INSERT INTO audit_events (actor_role, actor_id, actor_identifier, event_type, target_entity, target_id, metadata_json)
       VALUES ('instructor', $1, $2, $3, 'excuse_requests', $4, $5)`,
      [
        user.id,
        user.document,
        `EXCUSE_${action.toUpperCase()}`,
        excuseId,
        JSON.stringify({ comment: instructor_comment })
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Excusa ${action === 'approved' ? 'aprobada' : 'rechazada'} exitosamente.`
    });

  } catch (error: any) {
    console.error('Error al revisar excusa:', error);
    return NextResponse.json({ error: 'Error interno al procesar revisión de excusa.' }, { status: 500 });
  }
}
