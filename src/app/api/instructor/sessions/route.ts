import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sessionRepository } from '@/repositories/session.repository';
import { fichaRepository } from '@/repositories/ficha.repository';
import { query, queryOne } from '@/lib/db';
import { generateRotativeToken } from '@/lib/qr-security';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const activeSession = await sessionRepository.findActiveByInstructor(user.id);

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
    const {
      ficha_code,
      program_name,
      jornada,
      ambiente_name,
      ambiente_id,
      grupo,
      sede,
      hours_duration
    } = body;

    if (!ficha_code || !jornada || (!ambiente_name && !ambiente_id)) {
      return NextResponse.json(
        { error: 'La Ficha, Jornada y Ambiente son campos obligatorios.' },
        { status: 400 }
      );
    }

    const validJornadas = ['Diurna', 'Tarde', 'Nocturna', 'Mixta'];
    if (!validJornadas.includes(jornada.trim())) {
      return NextResponse.json(
        { error: 'La jornada seleccionada no es válida. Las jornadas admitidas son: Diurna, Tarde, Nocturna y Mixta.' },
        { status: 400 }
      );
    }

    // Check existing active session
    const existingActive = await sessionRepository.findActiveByInstructor(user.id);
    if (existingActive) {
      return NextResponse.json(
        { error: 'Ya tienes una sesión activa en progreso. Finalízala antes de crear una nueva.' },
        { status: 400 }
      );
    }

    // Upsert ficha
    const cleanFichaCode = String(ficha_code).trim();
    let ficha = await fichaRepository.findFichaByCode(cleanFichaCode);
    if (!ficha) {
      ficha = await queryOne<any>(
        `INSERT INTO fichas (code, program_name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
         RETURNING id, code, program_name`,
        [cleanFichaCode, program_name?.trim() || 'Programa SENA']
      );
    }

    if (ficha) {
      await query(
        `INSERT INTO instructor_fichas (instructor_id, ficha_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, ficha.id]
      );
    }

    // Ambiente
    let ambName = ambiente_name?.trim() || '';
    let ambId = ambiente_id ? Number(ambiente_id) : null;

    if (!ambName && ambId) {
      const amb = await fichaRepository.findAmbienteById(ambId);
      ambName = amb?.name || 'Ambiente';
    } else if (ambName && !ambId) {
      const amb = await queryOne<any>(
        `INSERT INTO ambientes (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name`,
        [ambName]
      );
      ambId = amb?.id || null;
    }

    const durationMinutes = 5;
    const hours = parseInt(hours_duration) || 6;
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const session = await sessionRepository.create({
      token,
      instructor_id: user.id,
      instructor_name: user.full_name,
      ficha_code: cleanFichaCode,
      ficha_id: ficha?.id || null,
      program_name: ficha?.program_name || program_name || 'Formación SENA',
      jornada: jornada.trim() as any,
      ambiente_name: ambName,
      ambiente_id: ambId,
      grupo: grupo?.trim() || 'Grupo 1',
      sede: sede?.trim() || 'Sede Principal',
      duration_minutes: durationMinutes,
      hours_duration: hours,
      session_type: 'regular',
      expires_at: expiresAt
    });

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
    return NextResponse.json({ error: 'Error al crear la sesión de asistencia.' }, { status: 500 });
  }
}
