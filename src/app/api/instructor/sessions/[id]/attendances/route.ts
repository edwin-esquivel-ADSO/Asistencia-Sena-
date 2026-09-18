import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sessionRepository } from '@/repositories/session.repository';
import { attendanceRepository } from '@/repositories/attendance.repository';
import { excuseService } from '@/services/excuse.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const sessionId = parseInt(id);

  if (!sessionId || isNaN(sessionId)) {
    return NextResponse.json({ error: 'ID de sesión no válido' }, { status: 400 });
  }

  try {
    const session = await sessionRepository.findById(sessionId);
    if (!session || session.instructor_id !== user.id) {
      return NextResponse.json({ error: 'Sesión no encontrada o no autorizada' }, { status: 404 });
    }

    const rawAttendances = await attendanceRepository.findBySession(sessionId);

    const attendances = rawAttendances.map(att => ({
      ...att,
      signed_excuse_url: att.excuse_path ? excuseService.resolveSignedFileUrl(att.excuse_path) : null
    }));

    return NextResponse.json({
      session,
      attendances
    });
  } catch (error: any) {
    console.error('Error fetching session attendances:', error);
    return NextResponse.json({ error: 'Error al consultar asistencias' }, { status: 500 });
  }
}
