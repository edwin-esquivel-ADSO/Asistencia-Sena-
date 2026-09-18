import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sessionService, GracePeriodExceededError } from '@/services/session.service';
import { auditRepository } from '@/repositories/audit.repository';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const parentSessionId = parseInt(id);

  if (!parentSessionId || isNaN(parentSessionId)) {
    return NextResponse.json({ error: 'ID de sesión principal no válido' }, { status: 400 });
  }

  try {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const originUrl = `${protocol}://${host}`;

    const { lateSession, qrDataUrl, rotativeToken, registerUrl } =
      await sessionService.createLateSession(parentSessionId, user.id, originUrl);

    await auditRepository.log({
      actor_role: user.role,
      actor_id: user.id,
      actor_identifier: user.document,
      event_type: 'LATE_QR_CREATED',
      target_entity: 'qr_sessions',
      target_id: lateSession.id,
      metadata: { parent_session_id: parentSessionId, expires_at: lateSession.expires_at }
    });

    return NextResponse.json({
      success: true,
      lateSession,
      token: lateSession.token,
      rotativeToken,
      qr_data_url: qrDataUrl,
      register_url: registerUrl,
      expires_at: lateSession.expires_at,
      message: 'Código QR para tardíos generado exitosamente con validez de 5 minutos.'
    });
  } catch (error: any) {
    if (error instanceof GracePeriodExceededError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error generating late QR:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar código QR para tardíos.' },
      { status: 500 }
    );
  }
}
