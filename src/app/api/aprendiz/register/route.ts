import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { validateRotativeToken, calculateDistanceMeters } from '@/lib/qr-security';

function parseUserAgent(ua: string | null) {
  if (!ua) return { navegador: 'Desconocido', dispositivo: 'Móvil/Computador' };
  const t = ua.toLowerCase();

  let navegador = 'Navegador Web';
  if (t.includes('opera') || t.includes('opr')) navegador = 'Opera';
  else if (t.includes('edg')) navegador = 'Edge';
  else if (t.includes('chrome')) navegador = 'Chrome';
  else if (t.includes('safari')) navegador = 'Safari';
  else if (t.includes('firefox')) navegador = 'Firefox';

  let dispositivo = 'Dispositivo Web';
  if (t.includes('iphone')) dispositivo = 'iPhone';
  else if (t.includes('ipad')) dispositivo = 'iPad';
  else if (t.includes('android')) dispositivo = 'Android Phone';
  else if (t.includes('windows')) dispositivo = 'Windows PC';
  else if (t.includes('macintosh')) dispositivo = 'macOS';

  return { navegador, dispositivo };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      token,
      rotative_token,
      full_name,
      document,
      latitud,
      longitud,
      precision_gps,
      location_status
    } = body;

    if (!token || !full_name || !document) {
      return NextResponse.json(
        { error: 'El Token, Nombre Completo y Documento son requeridos.' },
        { status: 400 }
      );
    }

    const cleanDocument = String(document).trim();
    const cleanName = String(full_name).trim();

    // 1. Verify session in PostgreSQL
    const session = await queryOne(
      `SELECT * FROM qr_sessions WHERE token = $1 LIMIT 1`,
      [token]
    );

    if (!session) {
      return NextResponse.json({ error: 'El código QR es inválido o no existe.' }, { status: 404 });
    }

    // 2. Validate expiration (5-minute strict rule)
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (session.status !== 'active' || expiresAt < now) {
      return NextResponse.json(
        { error: 'Este código QR ha expirado (duración exacta de 5 minutos) o la sesión fue cerrada por el instructor.' },
        { status: 410 }
      );
    }

    // 3. Validate rotative token if provided
    if (rotative_token) {
      const isValidRotative = validateRotativeToken(session.token, rotative_token);
      if (!isValidRotative) {
        return NextResponse.json(
          { error: 'El código QR dinámico ha rotado y esta captura ya no es válida. Por favor escanee el código QR activo en pantalla.' },
          { status: 410 }
        );
      }
    }

    // 4. Mandatory GPS Location Validation
    const hasValidGps =
      latitud &&
      longitud &&
      latitud !== 'Ubicación no disponible' &&
      longitud !== 'Ubicación no disponible' &&
      !String(location_status || '').toLowerCase().includes('denegad');

    if (!hasValidGps) {
      return NextResponse.json(
        { error: 'La ubicación GPS es obligatoria para verificar su presencia física en el ambiente. Active el GPS y conceda permisos al navegador.' },
        { status: 400 }
      );
    }

    const studentLat = parseFloat(latitud);
    const studentLon = parseFloat(longitud);

    // 5. Geofence Validation per Ambiente
    const ambiente = await queryOne(
      `SELECT * FROM ambientes WHERE name = $1 LIMIT 1`,
      [session.ambiente_name]
    );

    if (ambiente && ambiente.latitud && ambiente.longitud) {
      const ambLat = parseFloat(ambiente.latitud);
      const ambLon = parseFloat(ambiente.longitud);
      const maxRadius = ambiente.radio_maximo_metros || 100;

      if (!isNaN(studentLat) && !isNaN(studentLon) && !isNaN(ambLat) && !isNaN(ambLon)) {
        const distanceMeters = calculateDistanceMeters(studentLat, studentLon, ambLat, ambLon);
        if (distanceMeters > maxRadius) {
          return NextResponse.json(
            {
              error: `Geocerca violada: Estás a ${Math.round(distanceMeters)} metros del ambiente "${ambiente.name}". Tu ubicación está fuera del radio permitido (máximo ${maxRadius} metros).`
            },
            { status: 403 }
          );
        }
      }
    }

    // 6. Check duplicate registration in this session
    const existing = await queryOne(
      `SELECT id FROM attendances WHERE qr_session_id = $1 AND aprendiz_document = $2 LIMIT 1`,
      [session.id, cleanDocument]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'Ya has registrado tu asistencia para esta sesión.' },
        { status: 409 }
      );
    }

    // Get IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || 'Desconocida';

    const userAgent = request.headers.get('user-agent');
    const { navegador, dispositivo } = parseUserAgent(userAgent);

    // Determine state and registration type based on session_type
    const isLateSession = session.session_type === 'late_qr';
    const estado = isLateSession ? 'Tarde' : 'Presente';
    const registro_tipo = isLateSession ? 'tarde_qr' : 'puntual';

    // Insert attendance using server timestamp (CURRENT_DATE and CURRENT_TIME)
    const attendance = await queryOne(`
      INSERT INTO attendances (
        qr_session_id, fecha, hora, instructor_name, ficha_code, jornada, ambiente_name,
        grupo, sede, aprendiz_name, aprendiz_document, estado, registro_tipo,
        horas, ip_publica, latitud, longitud, precision_gps, location_status,
        navegador, dispositivo
      ) VALUES (
        $1, CURRENT_DATE, CURRENT_TIME, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19
      )
      RETURNING *
    `, [
      session.id,
      session.instructor_name,
      session.ficha_code,
      session.jornada,
      session.ambiente_name,
      session.grupo || 'Grupo 1',
      session.sede || 'Sede Principal',
      cleanName,
      cleanDocument,
      estado,
      registro_tipo,
      session.hours_duration || 6,
      clientIp,
      String(studentLat),
      String(studentLon),
      precision_gps || 'GPS Alta Precisión',
      location_status || 'Permiso concedido',
      navegador,
      dispositivo
    ]);

    return NextResponse.json({
      success: true,
      message: isLateSession
        ? '¡Asistencia registrada como Llegada Tarde en el sistema!'
        : '¡Asistencia registrada correctamente en el sistema!',
      attendance
    });
  } catch (error: any) {
    console.error('Error registering attendance:', error);
    return NextResponse.json({ error: 'Error interno al registrar la asistencia.' }, { status: 500 });
  }
}
