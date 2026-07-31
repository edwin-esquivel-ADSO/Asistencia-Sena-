import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { generateRotativeToken } from '@/lib/qr-security';

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

  if (!parentSessionId) {
    return NextResponse.json({ error: 'ID de sesión principal no válido' }, { status: 400 });
  }

  try {
    const parentSession = await queryOne(`SELECT * FROM qr_sessions WHERE id = $1 AND instructor_id = $2`, [parentSessionId, user.id]);
    if (!parentSession) {
      return NextResponse.json({ error: 'La sesión de asistencia de origen no existe' }, { status: 404 });
    }

    // Regla obligatoria: Todo QR para tardíos dura exactamente 5 minutos.
    const durationMinutes = 5;
    const token = crypto.randomBytes(16).toString('hex');

    const lateSession = await queryOne(`
      INSERT INTO qr_sessions (
        token, instructor_id, instructor_name, ficha_code, program_name,
        jornada, ambiente_name, grupo, sede, duration_minutes, hours_duration,
        session_type, parent_session_id, status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'late_qr', $12, 'active', NOW() + INTERVAL '5 minutes')
      RETURNING *
    `, [
      token,
      parentSession.instructor_id,
      parentSession.instructor_name,
      parentSession.ficha_code,
      parentSession.program_name,
      parentSession.jornada,
      parentSession.ambiente_name,
      parentSession.grupo,
      parentSession.sede,
      durationMinutes,
      parentSession.hours_duration,
      parentSessionId
    ]);

    const rotativeToken = generateRotativeToken(token);
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const registerUrl = `${protocol}://${host}/aprendiz/register?token=${token}&rot=${rotativeToken}`;

    const qrDataUrl = await QRCode.toDataURL(registerUrl, { width: 320, margin: 2 });

    return NextResponse.json({
      success: true,
      lateSession,
      token,
      rotativeToken,
      qr_data_url: qrDataUrl,
      expires_at: lateSession.expires_at
    });
  } catch (error: any) {
    console.error('Error generating late QR:', error);
    return NextResponse.json({ error: 'Error al generar código QR para tardíos' }, { status: 500 });
  }
}
