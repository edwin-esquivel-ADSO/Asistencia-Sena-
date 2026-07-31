import { NextResponse } from 'next/server';
import { getCurrentAprendiz } from '@/lib/aprendiz-auth';
import { queryOne, query } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/email';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getCurrentAprendiz();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión de aprendiz.' }, { status: 401 });
    }

    const formData = await request.formData();
    const attendance_id = formData.get('attendance_id') ? Number(formData.get('attendance_id')) : null;
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;
    const reason = formData.get('reason') as string;
    const file = formData.get('file') as File;

    if (!start_date || !end_date || !reason || !file) {
      return NextResponse.json(
        { error: 'Todos los campos requeridos (fechas, motivo y archivo de soporte) deben ser proporcionados.' },
        { status: 400 }
      );
    }

    // Validar tipo y tamaño de archivo (máx 10MB)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no permitido. Solo se aceptan documentos PDF o imágenes JPG/PNG.' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera el tamaño máximo permitido de 10MB.' }, { status: 400 });
    }

    // Guardar archivo localmente / persitente
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'excusas');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `excusa_${session.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, filename);
    const publicPath = `/uploads/excusas/${filename}`;

    fs.writeFileSync(filePath, buffer);

    // Crear solicitud de excusa
    const excuseRes = await queryOne<any>(
      `INSERT INTO excuse_requests (
        aprendiz_id, attendance_id, start_date, end_date, reason, file_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id`,
      [session.id, attendance_id, start_date, end_date, reason, publicPath]
    );

    // Obtener instructor asignado a la ficha del aprendiz si existe
    const instructorRel = await queryOne<any>(
      `SELECT u.id as instructor_id, u.full_name, ins.alert_email, ins.email_verified
       FROM instructor_fichas ifi
       JOIN users u ON ifi.instructor_id = u.id
       LEFT JOIN instructor_notification_settings ins ON ins.instructor_id = u.id
       WHERE ifi.ficha_id = $1 LIMIT 1`,
      [session.ficha_id]
    );

    if (instructorRel) {
      // Crear notificación interna para el instructor
      await query(
        `INSERT INTO notifications (recipient_role, recipient_id, type, title, body, link_url, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'instructor',
          instructorRel.instructor_id,
          'excuse_submitted',
          'Nueva excusa recibida',
          `El aprendiz ${session.full_name} ha cargado una excusa para la fecha ${start_date}.`,
          '/instructor/dashboard?tab=excusas',
          JSON.stringify({ excuse_id: excuseRes.id, aprendiz_id: session.id })
        ]
      );

      // Enviar correo si tiene alerta configurada y verificada
      if (instructorRel.alert_email && instructorRel.email_verified) {
        await sendNotificationEmail({
          to: instructorRel.alert_email,
          subject: `[Asistencia SENA] Nueva Excusa - ${session.full_name}`,
          html: `<p>Estimado(a) Instructor(a) ${instructorRel.full_name},</p>
                 <p>El aprendiz <strong>${session.full_name}</strong> ha presentado una excusa médica/justificación para el periodo ${start_date} al ${end_date}.</p>
                 <p>Por favor ingrese al sistema para revisar el soporte y decidir sobre la solicitud.</p>`
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Excusa radicada exitosamente y enviada a revisión del instructor.',
      excuse_id: excuseRes.id
    });

  } catch (error: any) {
    console.error('Error al subir excusa de aprendiz:', error);
    return NextResponse.json({ error: 'Error interno al procesar la excusa.' }, { status: 500 });
  }
}
