import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Middleware check helper
async function checkCoordinator() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'coordinador') {
    return null;
  }
  return user;
}

export async function GET() {
  const auth = await checkCoordinator();
  if (!auth) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const users = await query(`
      SELECT id, document, full_name, username, email, role, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json({ error: 'Error al obtener la lista de usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await checkCoordinator();
  if (!auth) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { full_name, document, username, email, role, is_active } = body;

    if (!full_name || !document) {
      return NextResponse.json(
        { error: 'Nombre completo y número de documento son obligatorios.' },
        { status: 400 }
      );
    }

    // Check document duplication
    const existingDoc = await queryOne(`SELECT id FROM users WHERE document = $1 LIMIT 1`, [document.trim()]);
    if (existingDoc) {
      return NextResponse.json({ error: 'Ya existe un usuario con este número de documento.' }, { status: 400 });
    }

    const userRole = role === 'coordinador' ? 'coordinador' : 'instructor';
    const activeState = is_active !== false;

    const newUser = await queryOne(`
      INSERT INTO users (document, full_name, username, email, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, document, full_name, username, email, role, is_active, created_at
    `, [
      document.trim(),
      full_name.trim(),
      username?.trim() || null,
      email?.trim() || null,
      userRole,
      activeState
    ]);

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error interno al crear usuario' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await checkCoordinator();
  if (!auth) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, full_name, document, username, email, is_active, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario es requerido.' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIdx++}`);
      params.push(full_name.trim());
    }
    if (document !== undefined) {
      updates.push(`document = $${paramIdx++}`);
      params.push(document.trim());
    }
    if (username !== undefined) {
      updates.push(`username = $${paramIdx++}`);
      params.push(username ? username.trim() : null);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIdx++}`);
      params.push(email ? email.trim() : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      params.push(Boolean(is_active));
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIdx++}`);
      params.push(role === 'coordinador' ? 'coordinador' : 'instructor');
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return NextResponse.json({ error: 'No hay datos para actualizar.' }, { status: 400 });
    }

    params.push(id);
    const queryText = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, document, full_name, username, email, role, is_active`;
    const updatedUser = await queryOne(queryText, params);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}
