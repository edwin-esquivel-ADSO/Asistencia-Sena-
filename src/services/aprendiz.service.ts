import { aprendizRepository } from '@/repositories/aprendiz.repository';
import { fichaRepository } from '@/repositories/ficha.repository';
import {
  Aprendiz,
  AprendizCreateInput,
  AprendizCreateSchema,
  AprendizDeactivateInput,
  AprendizDeactivateSchema,
  MOTIVOS_RETIRO
} from '@/domain/aprendiz.domain';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AprendizService {
  async getRoster(fichaCode: string, includeInactive: boolean = false): Promise<Aprendiz[]> {
    if (!fichaCode || !fichaCode.trim()) {
      throw new ValidationError('El código de ficha es obligatorio para consultar aprendices.');
    }
    return aprendizRepository.findByFicha(fichaCode.trim(), includeInactive);
  }

  async addAprendiz(input: AprendizCreateInput): Promise<Aprendiz> {
    const parseRes = AprendizCreateSchema.safeParse(input);
    if (!parseRes.success) {
      throw new ValidationError(parseRes.error.issues[0]?.message || 'Datos de aprendiz inválidos.');
    }

    const { ficha_code, document, full_name } = parseRes.data;

    const ficha = await fichaRepository.findFichaByCode(ficha_code);
    if (!ficha) {
      throw new ValidationError(`La ficha ${ficha_code} no existe en el sistema.`);
    }

    // Capitalize properly
    const cleanName = full_name.trim().toUpperCase();

    return aprendizRepository.create({
      document: document.trim(),
      full_name: cleanName,
      ficha_id: ficha.id,
      is_active: true
    });
  }

  async updateAprendiz(id: number, data: {
    full_name?: string;
    document?: string;
    is_active?: boolean;
  }): Promise<Aprendiz> {
    if (!id || id <= 0) {
      throw new ValidationError('ID de aprendiz inválido.');
    }

    if (data.document) {
      if (!/^\d+$/.test(data.document.trim())) {
        throw new ValidationError('El documento debe contener únicamente números.');
      }
    }

    if (data.full_name) {
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(data.full_name.trim())) {
        throw new ValidationError('El nombre debe contener exclusivamente letras y espacios.');
      }
    }

    const updated = await aprendizRepository.update(id, data);
    if (!updated) {
      throw new ValidationError('No se encontró el aprendiz para actualizar.');
    }
    return updated;
  }

  async deactivateAprendiz(input: AprendizDeactivateInput): Promise<Aprendiz> {
    const parseRes = AprendizDeactivateSchema.safeParse(input);
    if (!parseRes.success) {
      throw new ValidationError(parseRes.error.issues[0]?.message || 'Motivo de retiro inválido.');
    }

    const { id, reason, notes } = parseRes.data;
    const fullReason = notes?.trim() ? `${reason} - ${notes.trim()}` : reason;

    const deactivated = await aprendizRepository.deactivate(id, fullReason);
    if (!deactivated) {
      throw new ValidationError('No se encontró el aprendiz especificado.');
    }
    return deactivated;
  }

  async reactivateAprendiz(id: number): Promise<Aprendiz> {
    if (!id || id <= 0) {
      throw new ValidationError('ID de aprendiz inválido.');
    }
    const reactivated = await aprendizRepository.reactivate(id);
    if (!reactivated) {
      throw new ValidationError('No se encontró el aprendiz especificado.');
    }
    return reactivated;
  }
}

export const aprendizService = new AprendizService();
