export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendNotificationEmail(payload: EmailPayload): Promise<{ success: boolean; status: string }> {
  const provider = process.env.EMAIL_PROVIDER;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Asistencia SENA <no-reply@sena.edu.co>';

  if (!provider || !apiKey) {
    console.log('[EMAIL] Proveedor de correo no configurado. Registrado como pending_provider_config:', payload.to);
    return { success: false, status: 'pending_provider_config' };
  }

  try {
    if (provider.toLowerCase() === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html
        })
      });

      if (res.ok) {
        return { success: true, status: 'sent' };
      } else {
        const errorData = await res.json();
        console.error('[EMAIL] Error enviando correo vía Resend:', errorData);
        return { success: false, status: 'failed' };
      }
    }

    return { success: false, status: 'unsupported_provider' };
  } catch (error) {
    console.error('[EMAIL] Excepción al enviar correo:', error);
    return { success: false, status: 'failed' };
  }
}
