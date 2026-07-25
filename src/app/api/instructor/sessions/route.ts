import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';
import { generateRotativeToken } from '@/lib/qr-security';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const activeSession = await queryOne(`
      SELECT *
      FROM qr_sessions
      WHERE instructor_id = $1 AND status = 'active' AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `, [user.id]);

    if (!activeSession) {
      return NextResponse.json({ activeSession: null });
    }

    const rotativeToken = generateRotativeToken(activeSession.token);

    return NextResponse.json({
      activeSession: {
        ...activeSession,
        rotativeToken
      }
    });
  } catch (error: any) {
    console.error('Error getting active session:', error);
    return NextResponse.json({ error: 'Error al consultar sesión activa' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    let {
      ficha_code,
      program_name,
      jornada,
      ambiente_name,
      grupo,
      sede,
      hours_duration,
      save_master_data
    } = body;

    // Validation
    if (!ficha_code || !jornada || !ambiente_name) {
      return NextResponse.json(
        { error: 'La Ficha, Jornada y Ambiente son campos obligatorios.' },
        { status: 400 }
      );
    }

    if (!['Diurna', 'Tarde', 'Nocturna', 'Mixta'].includes(jornada.trim())) {
      return NextResponse.json({ error: 'La jornada seleccionada no es válida. Las jornadas admitidas son: Diurna, Tarde, Nocturna y Mixta.' }, { status: 400 });
    }

    // Regla obligatoria: Todo QR regular tiene vigencia de exactamente 5 minutos.
    // El servidor y la base de datos imponen NOW() + INTERVAL '5 minutes'.
    const durationMinutes = 5;
    const hours = parseInt(hours_duration) || 6;

    // Check if instructor already has an active session
    const existingActive = await queryOne(`
      SELECT id FROM qr_sessions
      WHERE instructor_id = $1 AND status = 'active' AND expires_at > NOW()
      LIMIT 1
    `, [user.id]);

    if (existingActive) {
      return NextResponse.json(
        { error: 'Ya tienes una sesión activa en progreso. Finalízala antes de crear una nueva.' },
        { status: 400 }
      );
    }

    // Optional: save custom manual entries to master records if explicitly requested
    if (save_master_data) {
      await query(
        `INSERT INTO fichas (code, program_name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
        [ficha_code.trim(), program_name?.trim() || 'Programa Personalizado']
      );
      await query(
        `INSERT INTO ambientes (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [ambiente_name.trim()]
      );
    }

    const token = crypto.randomBytes(16).toString('hex');
    const session = await queryOne(`
      INSERT INTO qr_sessions (
        token, instructor_id, instructor_name, ficha_code, program_name,
        jornada, ambiente_name, grupo, sede, duration_minutes, hours_duration,
        session_type, status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'regular', 'active', NOW() + INTERVAL '5 minutes')
      RETURNING *
    `, [
      token,
      user.id,
      user.full_name,
      ficha_code.trim(),
      program_name?.trim() || 'Formación SENA',
      jornada.trim(),
      ambiente_name.trim(),
      grupo?.trim() || 'Grupo 1',
      sede?.trim() || 'Sede Principal',
      durationMinutes,
      hours
    ]);

    const rotativeToken = generateRotativeToken(token);

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        rotativeToken
      }
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Error al crear la sesión de asistencia' }, { status: 500 });
  }
}
