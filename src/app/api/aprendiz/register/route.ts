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
    const registro_tipo = isLateSession ? 'qr_tardio' : 'puntual';

    // Obtener sesión activa del aprendiz (sena_aprendiz_session) si está disponible
    const { getCurrentAprendiz } = await import('@/lib/aprendiz-auth');
    const aprendizSession = await getCurrentAprendiz();

    // Intentar relacionar con el aprendiz registrado en la DB
    const aprendizDb = await queryOne<any>(
      `SELECT id FROM aprendices WHERE document = $1 LIMIT 1`,
      [cleanDocument]
    );

    // Obtener la última verificación facial reciente del aprendiz si existe
    let faceVerifId = null;
    if (aprendizDb) {
      const lastVerif = await queryOne<any>(
        `SELECT id FROM face_verifications WHERE aprendiz_id = $1 AND result = 'verified' ORDER BY created_at DESC LIMIT 1`,
        [aprendizDb.id]
      );
      faceVerifId = lastVerif?.id || null;
    }

    let attendance: any = null;

    if (isLateSession && session.parent_session_id) {
      // Buscar falta previa registrada en la sesión principal
      const existingAbsence = await queryOne<any>(
        `SELECT id FROM attendances WHERE qr_session_id = $1 AND aprendiz_document = $2 LIMIT 1`,
        [session.parent_session_id, cleanDocument]
      );

      if (existingAbsence) {
        // Transformar el registro principal de Falta a Tarde sin duplicar fila
        attendance = await queryOne(`
          UPDATE attendances SET
            estado = 'Tarde',
            registro_tipo = 'qr_tardio',
            hora = (NOW() AT TIME ZONE 'America/Bogota')::time,
            horas = $1,
            ip_publica = $2,
            latitud = $3,
            longitud = $4,
            precision_gps = $5,
            location_status = $6,
            navegador = $7,
            dispositivo = $8,
            aprendiz_id = COALESCE($9, aprendiz_id),
            face_verification_id = COALESCE($10, face_verification_id),
            updated_at = NOW()
          WHERE id = $11
          RETURNING *
        `, [
          session.hours_duration || 6,
          clientIp,
          String(studentLat),
          String(studentLon),
          precision_gps || 'Ubicación reportada por el dispositivo',
          location_status || 'Permiso concedido',
          navegador,
          dispositivo,
          aprendizDb?.id || null,
          faceVerifId,
          existingAbsence.id
        ]);
      }
    }

    if (!attendance) {
      // Insert attendance using server timestamp
      attendance = await queryOne(`
        INSERT INTO attendances (
          qr_session_id, fecha, hora, instructor_name, ficha_code, jornada, ambiente_name,
          grupo, sede, aprendiz_name, aprendiz_document, estado, registro_tipo,
          horas, ip_publica, latitud, longitud, precision_gps, location_status,
          navegador, dispositivo, aprendiz_id, face_verification_id
        ) VALUES (
          $1, (NOW() AT TIME ZONE 'America/Bogota')::date, (NOW() AT TIME ZONE 'America/Bogota')::time, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21
        )
        RETURNING *
      `, [
        session.parent_session_id || session.id,
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
        precision_gps || 'Ubicación reportada por el dispositivo',
        location_status || 'Permiso concedido',
        navegador,
        dispositivo,
        aprendizDb?.id || null,
        faceVerifId
      ]);
    }

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
