import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

type ImportedStudent = { full_name?: unknown; document?: unknown };

async function ensureInstructorFicha(instructorId: number, fichaCode: string, programName?: string) {
  const ficha = await queryOne<any>(
    `INSERT INTO fichas (code, program_name)
     VALUES ($1, $2)
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING id, code, program_name`,
    [fichaCode, programName?.trim() || 'Formación SENA']
  );
  if (!ficha) throw new Error('No fue posible guardar la ficha.');

  await query(
    `INSERT INTO instructor_fichas (instructor_id, ficha_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [instructorId, ficha.id]
  );
  return ficha;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  const fichaCode = new URL(request.url).searchParams.get('ficha_code')?.trim();
  if (!fichaCode) return NextResponse.json({ error: 'La ficha es obligatoria.' }, { status: 400 });

  const ficha = await queryOne<any>(
    `SELECT f.id, f.code, f.program_name
     FROM fichas f
     JOIN instructor_fichas i ON i.ficha_id = f.id
     WHERE i.instructor_id = $1 AND f.code = $2`,
    [user.id, fichaCode]
  );
  if (!ficha) return NextResponse.json({ error: 'No tiene acceso a esta ficha.' }, { status: 403 });

  const aprendices = await query<any>(
    `SELECT id, full_name, document, is_active, face_registered_at, created_at, updated_at
     FROM aprendices WHERE ficha_id = $1 ORDER BY full_name ASC`,
    [ficha.id]
  );
  return NextResponse.json({ ficha, aprendices });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const fichaCode = String(body.ficha_code || '').trim();
    const programName = String(body.program_name || '').trim();
    if (!fichaCode) return NextResponse.json({ error: 'La ficha es obligatoria.' }, { status: 400 });

    const ficha = await ensureInstructorFicha(user.id, fichaCode, programName);
    const action = body.action || 'upsert';
    const rows: ImportedStudent[] = action === 'import' ? body.students : [body];
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) {
      return NextResponse.json({ error: 'Cargue entre 1 y 1000 aprendices válidos.' }, { status: 400 });
    }

    let imported = 0;
    const rejected: number[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const fullName = String(row.full_name || '').trim().replace(/\s+/g, ' ');
      const document = String(row.document || '').trim();
      if (!fullName || !document || fullName.length > 150 || document.length > 50) {
        rejected.push(index + 1);
        continue;
      }
      await query(
        `INSERT INTO aprendices (document, full_name, ficha_id, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (document) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           ficha_id = EXCLUDED.ficha_id,
           is_active = true,
           updated_at = NOW()`,
        [document, fullName, ficha.id]
      );
      imported += 1;
    }

    await query(
      `INSERT INTO audit_events (actor_role, actor_id, actor_identifier, event_type, target_entity, target_id, metadata_json)
       VALUES ('instructor', $1, $2, $3, 'fichas', $4, $5)`,
      [user.id, user.document, action === 'import' ? 'ROSTER_IMPORTED' : 'ROSTER_MEMBER_UPSERTED', ficha.id, JSON.stringify({ imported, rejected })]
    );

    return NextResponse.json({ success: true, ficha, imported, rejected });
  } catch (error: any) {
    console.error('Error administrando listado de aprendices:', error);
    return NextResponse.json({ error: 'No fue posible guardar el listado de aprendices.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'instructor') return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  try {
    const { id, full_name, document, is_active } = await request.json();
    if (!id || !String(full_name || '').trim() || !String(document || '').trim()) {
      return NextResponse.json({ error: 'Nombre, documento e identificador son obligatorios.' }, { status: 400 });
    }
    const updated = await queryOne<any>(
      `UPDATE aprendices a SET full_name = $1, document = $2, is_active = COALESCE($3, a.is_active), updated_at = NOW()
       FROM instructor_fichas i
       WHERE a.id = $4 AND i.ficha_id = a.ficha_id AND i.instructor_id = $5
       RETURNING a.id, a.full_name, a.document, a.is_active`,
      [String(full_name).trim(), String(document).trim(), typeof is_active === 'boolean' ? is_active : null, id, user.id]
    );
    if (!updated) return NextResponse.json({ error: 'Aprendiz no encontrado o sin permiso.' }, { status: 404 });
    return NextResponse.json({ success: true, aprendiz: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'No fue posible actualizar el aprendiz.' }, { status: 500 });
  }
}
