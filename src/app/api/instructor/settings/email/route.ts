import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'instructor') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const body = await request.json();
    const { alert_email } = body;

    if (!alert_email || !alert_email.includes('@')) {
      return NextResponse.json({ error: 'Proporcione una dirección de correo válida.' }, { status: 400 });
    }

    const token = 'token_' + Math.random().toString(36).substring(2, 15);

    await query(
      `INSERT INTO instructor_notification_settings (instructor_id, alert_email, email_verified, email_verification_token)
       VALUES ($1, $2, false, $3)
       ON CONFLICT (instructor_id) DO UPDATE SET
         alert_email = EXCLUDED.alert_email,
         email_verified = false,
         email_verification_token = EXCLUDED.email_verification_token,
         updated_at = NOW()`,
      [user.id, alert_email.trim(), token]
    );

    // Intentar enviar correo de verificación
    const emailRes = await sendNotificationEmail({
      to: alert_email.trim(),
      subject: '[Asistencia SENA] Verificación de correo para alertas de instructor',
      html: `<p>Hola ${user.full_name},</p>
             <p>Se ha configurado esta dirección de correo para recibir alertas automáticas del sistema de Asistencia SENA.</p>
             <p>Su correo quedará activado cuando confirme su solicitud ingresando a la plataforma.</p>`
    });

    if (emailRes.success) {
      await query(
        `UPDATE instructor_notification_settings
         SET email_verified = true, email_verification_token = NULL, updated_at = NOW()
         WHERE instructor_id = $1`,
        [user.id]
      );
    }

    return NextResponse.json({
      success: true,
      email_status: emailRes.status,
      message: emailRes.status === 'pending_provider_config'
        ? 'Correo guardado. El proveedor de correo no está configurado en las variables de entorno, las alertas se enviarán únicamente a la bandeja interna.'
        : 'Correo de configuración registrado. Revise su bandeja de entrada para la verificación.'
    });

  } catch (error: any) {
    console.error('Error guardando correo del instructor:', error);
    return NextResponse.json({ error: 'Error interno al guardar la configuración de correo.' }, { status: 500 });
  }
}
