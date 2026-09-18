import { NextResponse } from 'next/server';
import { getCurrentAprendiz } from '@/lib/aprendiz-auth';
import { excuseService } from '@/services/excuse.service';
import { ExcuseCreateSchema } from '@/domain/excuse.domain';
import { uploadImageBuffer, isCloudinaryConfigured } from '@/lib/cloudinary';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getCurrentAprendiz();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión de aprendiz.' }, { status: 401 });
    }

    const formData = await request.formData();
    const fichaIdRaw = formData.get('ficha_id');
    const attendanceIdRaw = formData.get('attendance_id');
    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;
    const reason = formData.get('reason') as string;
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'El archivo de soporte (médico o justificación) es obligatorio.' },
        { status: 400 }
      );
    }

    const parseResult = ExcuseCreateSchema.safeParse({
      ficha_id: fichaIdRaw,
      attendance_id: attendanceIdRaw ? Number(attendanceIdRaw) : null,
      start_date: startDate,
      end_date: endDate,
      reason
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Datos de excusa inválidos.' },
        { status: 400 }
      );
    }

    // Validate mime type & size
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

    let filePath: string;

    // Check if Cloudinary is configured
    if (isCloudinaryConfigured() && file.type.startsWith('image/')) {
      try {
        const publicId = `sena_excusas/excusa_${session.id}_${Date.now()}`;
        const uploadRes = await uploadImageBuffer(buffer, publicId);
        filePath = uploadRes.public_id || publicId;
      } catch (err) {
        console.warn('Cloudinary upload fallback to local storage:', err);
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'excusas');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const ext = file.type === 'application/pdf' ? 'pdf' : 'png';
        const filename = `excusa_${session.id}_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        filePath = `/uploads/excusas/${filename}`;
      }
    } else {
      // Local persistent storage
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'excusas');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = file.type === 'application/pdf' ? 'pdf' : 'png';
      const filename = `excusa_${session.id}_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      filePath = `/uploads/excusas/${filename}`;
    }

    const excuse = await excuseService.submitExcuse(session, parseResult.data, filePath);

    const isMultiDay = parseResult.data.start_date < parseResult.data.end_date;
    const message = isMultiDay
      ? 'Excusa multidía radicada exitosamente y remitida a Coordinación Académica para aprobación global.'
      : 'Excusa unidía radicada exitosamente y enviada al instructor responsable de la sesión.';

    return NextResponse.json({
      success: true,
      message,
      excuse_id: excuse.id,
      tipo: isMultiDay ? 'multidía' : 'unidía'
    });
  } catch (error: any) {
    console.error('Error in excuse upload controller:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al radicar la excusa.' },
      { status: 500 }
    );
  }
}
