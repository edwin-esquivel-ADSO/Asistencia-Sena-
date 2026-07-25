import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'excusas', safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'El archivo de excusa no existe.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : 'image/png';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${safeFilename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error reading excuse file:', error);
    return NextResponse.json({ error: 'Error al obtener el archivo de excusa.' }, { status: 500 });
  }
}
