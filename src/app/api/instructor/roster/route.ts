import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { aprendizService, ValidationError } from '@/services/aprendiz.service';
import { fichaRepository } from '@/repositories/ficha.repository';
import { auditRepository } from '@/repositories/audit.repository';
import {
  AprendizCreateSchema,
  AprendizUpdateSchema,
  AprendizDeactivateSchema
} from '@/domain/aprendiz.domain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'instructor' && user.role !== 'coordinador')) {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fichaCode = searchParams.get('ficha_code')?.trim();
  const includeInactive = searchParams.get('include_inactive') === 'true';

  if (!fichaCode) {
    return NextResponse.json({ error: 'El código de ficha es obligatorio.' }, { status: 400 });
  }

  const ficha = await fichaRepository.findFichaByCode(fichaCode);
  if (!ficha) {
    return NextResponse.json({ error: 'La ficha especificada no existe.' }, { status: 404 });
  }

  try {
    const aprendices = await aprendizService.getRoster(fichaCode, includeInactive);
    return NextResponse.json({ success: true, ficha, aprendices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al obtener aprendices.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'instructor' && user.role !== 'coordinador')) {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body.action || 'upsert';

    if (action === 'upsert') {
      const parseResult = AprendizCreateSchema.safeParse({
        ficha_code: body.ficha_code,
        document: body.document,
        full_name: body.full_name
      });

      if (!parseResult.success) {
        return NextResponse.json(
          { error: parseResult.error.issues[0]?.message || 'Datos de aprendiz inválidos.' },
          { status: 400 }
        );
      }

      const aprendiz = await aprendizService.addAprendiz(parseResult.data);

      await auditRepository.log({
        actor_role: user.role,
        actor_id: user.id,
        actor_identifier: user.document,
        event_type: 'APRENDIZ_UPSERTED',
        target_entity: 'aprendices',
        target_id: aprendiz.id,
        metadata: { document: aprendiz.document, ficha_code: body.ficha_code }
      });

      return NextResponse.json({ success: true, aprendiz, message: 'Aprendiz guardado exitosamente.' });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error in roster POST:', error);
    return NextResponse.json({ error: 'Error al agregar aprendiz.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'instructor' && user.role !== 'coordinador')) {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parseResult = AprendizUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Datos de actualización inválidos.' },
        { status: 400 }
      );
    }

    const { id, ...data } = parseResult.data;
    const updated = await aprendizService.updateAprendiz(id, data);

    await auditRepository.log({
      actor_role: user.role,
      actor_id: user.id,
      actor_identifier: user.document,
      event_type: 'APRENDIZ_UPDATED',
      target_entity: 'aprendices',
      target_id: id,
      metadata: data
    });

    return NextResponse.json({ success: true, aprendiz: updated, message: 'Aprendiz actualizado exitosamente.' });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error in roster PUT:', error);
    return NextResponse.json({ error: 'Error al actualizar aprendiz.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'instructor' && user.role !== 'coordinador')) {
    return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parseResult = AprendizDeactivateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Motivo de retiro inválido.' },
        { status: 400 }
      );
    }

    const deactivated = await aprendizService.deactivateAprendiz(parseResult.data);

    await auditRepository.log({
      actor_role: user.role,
      actor_id: user.id,
      actor_identifier: user.document,
      event_type: 'APRENDIZ_DEACTIVATED',
      target_entity: 'aprendices',
      target_id: deactivated.id,
      metadata: { reason: deactivated.deactivation_reason }
    });

    return NextResponse.json({
      success: true,
      aprendiz: deactivated,
      message: `Aprendiz "${deactivated.full_name}" retirado con motivo institucional registrado.`
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error in roster DELETE:', error);
    return NextResponse.json({ error: 'Error al retirar aprendiz.' }, { status: 500 });
  }
}
