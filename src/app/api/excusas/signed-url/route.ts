import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentAprendiz } from '@/lib/aprendiz-auth';
import { excuseService } from '@/services/excuse.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const [user, aprendiz] = await Promise.all([
    getCurrentUser(),
    getCurrentAprendiz()
  ]);

  if (!user && !aprendiz) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const shouldRedirect = searchParams.get('redirect') === 'true';

  if (!filePath) {
    return NextResponse.json({ error: 'Ruta o identificador de archivo requerido.' }, { status: 400 });
  }

  try {
    const signedUrl = excuseService.resolveSignedFileUrl(filePath);

    if (shouldRedirect && signedUrl) {
      return NextResponse.redirect(signedUrl);
    }

    return NextResponse.json({ success: true, signedUrl });
  } catch (error: any) {
    console.error('Error signing file url:', error);
    return NextResponse.json({ error: 'Error al generar enlace seguro de visualización.' }, { status: 500 });
  }
}
