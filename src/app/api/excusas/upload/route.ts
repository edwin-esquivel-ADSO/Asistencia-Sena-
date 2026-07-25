import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'excusas');

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se ha adjuntado ningún archivo.' }, { status: 400 });
    }

    const fileNameLower = file.name.toLowerCase();
    const isPng = fileNameLower.endsWith('.png') || file.type === 'image/png';
    const isPdf = fileNameLower.endsWith('.pdf') || file.type === 'application/pdf';

    if (!isPng && !isPdf) {
      return NextResponse.json(
        { error: 'Formato no permitido. Únicamente se aceptan archivos en formato PNG o PDF.' },
        { status: 400 }
      );
    }

    // 5MB Limit check
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 5 MB.' },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const ext = isPdf ? 'pdf' : 'png';
    const uniqueFileName = `excusa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const targetPath = path.join(UPLOAD_DIR, uniqueFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    fs.writeFileSync(targetPath, buffer);

    const relativeUrl = `/uploads/excusas/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      filePath: relativeUrl,
      fileName: uniqueFileName,
      originalName: file.name
    });
  } catch (error: any) {
    console.error('Error in excuse file upload:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar y guardar la excusa adjunta.' },
      { status: 500 }
    );
  }
}
