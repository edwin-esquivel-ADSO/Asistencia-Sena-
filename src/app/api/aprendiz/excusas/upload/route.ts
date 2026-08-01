import { NextResponse } from 'next/server';
import { getCurrentAprendiz } from '@/lib/aprendiz-auth';
import { queryOne, query } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/email';
import { isCloudinaryConfigured, uploadImageBuffer } from '@/lib/cloudinary';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getCurrentAprendiz();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión de aprendiz.' }, { status: 401 });
    }

    const formData = await request.formData();
    const rawAttendanceId = formData.get('attendance_id');
    const parsedAttId = rawAttendanceId && !isNaN(Number(rawAttendanceId)) && Number(rawAttendanceId) > 0 ? Number(rawAttendanceId) : null;

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let publicPath = '';

    // Si Cloudinary está configurado, intentar subir a Cloudinary
    if (isCloudinaryConfigured()) {
      try {
        const cloudId = `excusa_${session.id}_${Date.now()}`;
        const uploadRes = await uploadImageBuffer(buffer, cloudId);
        if (uploadRes && uploadRes.secure_url) {
          publicPath = uploadRes.secure_url;
        }
      } catch (cloudErr) {
        console.error('Error al subir excusa a Cloudinary, usando almacenamiento local:', cloudErr);
      }
    }

    // Si no se subió a Cloudinary o no está configurado, guardar localmente
    if (!publicPath) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'excusas');
      try {
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
      } catch (dirErr) {
        console.error('Error creando directorio de excusas:', dirErr);
      }
      const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'documento.pdf';
      const filename = `excusa_${session.id}_${Date.now()}_${cleanName}`;
      const filePath = path.join(uploadsDir, filename);
      publicPath = `/uploads/excusas/${filename}`;

      try {
        fs.writeFileSync(filePath, buffer);
      } catch (writeErr) {
        console.error('Error al escribir archivo en disco:', writeErr);
        const base64Str = buffer.toString('base64');
        publicPath = `data:${file.type};base64,${base64Str}`;
      }
    }

    // Obtener aprendiz DB para ficha_id de respaldo
    const aprendizDb = await queryOne<any>(`SELECT id, ficha_id, full_name FROM aprendices WHERE id = $1 LIMIT 1`, [session.id]);
    const fichaId = session.ficha_id || aprendizDb?.ficha_id;

    // Crear solicitud de excusa
    const excuseRes = await queryOne<any>(
      `INSERT INTO excuse_requests (
        aprendiz_id, attendance_id, start_date, end_date, reason, file_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id`,
      [session.id, parsedAttId, start_date, end_date, reason, publicPath]
    );

    // Obtener instructor asignado a la ficha del aprendiz si existe
    if (fichaId) {
      const instructorRel = await queryOne<any>(
        `SELECT u.id as instructor_id, u.full_name, ins.alert_email, ins.email_verified
         FROM instructor_fichas ifi
         JOIN users u ON ifi.instructor_id = u.id
         LEFT JOIN instructor_notification_settings ins ON ins.instructor_id = u.id
         WHERE ifi.ficha_id = $1 LIMIT 1`,
        [fichaId]
      );

      if (instructorRel) {
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
            JSON.stringify({ excuse_id: excuseRes?.id, aprendiz_id: session.id })
          ]
        );

        if (instructorRel.alert_email && instructorRel.email_verified) {
          sendNotificationEmail({
            to: instructorRel.alert_email,
            subject: `[Asistencia SENA] Nueva Excusa - ${session.full_name}`,
            html: `<p>Estimado(a) Instructor(a) ${instructorRel.full_name},</p>
                   <p>El aprendiz <strong>${session.full_name}</strong> ha presentado una excusa médica/justificación para el periodo ${start_date} al ${end_date}.</p>
                   <p>Por favor ingrese al sistema para revisar el soporte y decidir sobre la solicitud.</p>`
          }).catch(console.error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Excusa radicada exitosamente y enviada a revisión del instructor.',
      excuse_id: excuseRes?.id
    });

  } catch (error: any) {
    console.error('Error al subir excusa de aprendiz:', error);
    return NextResponse.json({ error: error.message || 'Error interno al procesar la excusa.' }, { status: 500 });
  }
}
