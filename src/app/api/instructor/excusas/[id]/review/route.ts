import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { excuseService, ConcurrencyConflictError } from '@/services/excuse.service';
import { ExcuseReviewSchema } from '@/domain/excuse.domain';
import { auditRepository } from '@/repositories/audit.repository';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'instructor' && user.role !== 'coordinador')) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id } = await params;
    const excuseId = parseInt(id);

    if (!excuseId || isNaN(excuseId)) {
      return NextResponse.json({ error: 'ID de excusa inválido.' }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = ExcuseReviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Datos de revisión inválidos.' },
        { status: 400 }
      );
    }

    const result = await excuseService.reviewExcuse(excuseId, user, parseResult.data);

    await auditRepository.log({
      actor_role: user.role,
      actor_id: user.id,
      actor_identifier: user.document,
      event_type: `EXCUSE_${parseResult.data.action.toUpperCase()}`,
      target_entity: 'excuse_requests',
      target_id: excuseId,
      metadata: {
        version: parseResult.data.version,
        new_version: result.newVersion,
        comment: parseResult.data.instructor_comment
      }
    });

    return NextResponse.json({
      success: true,
      newVersion: result.newVersion,
      message: result.message
    });
  } catch (error: any) {
    if (error instanceof ConcurrencyConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 } // HTTP 409 Conflict strictly required by ADR-008
      );
    }

    console.error('Error in excuse review controller:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar revisión de excusa.' },
      { status: 500 }
    );
  }
}
