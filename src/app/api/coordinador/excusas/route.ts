import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { excuseService } from '@/services/excuse.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'coordinador') {
    return NextResponse.json({ error: 'Acceso no autorizado. Se requiere rol de Coordinador.' }, { status: 403 });
  }

  try {
    const excuses = await excuseService.getPendingExcusesForCoordinator();
    return NextResponse.json({ success: true, excuses });
  } catch (error: any) {
    console.error('Error fetching coordinator excuses:', error);
    return NextResponse.json({ error: 'Error al consultar excusas multidía.' }, { status: 500 });
  }
}
