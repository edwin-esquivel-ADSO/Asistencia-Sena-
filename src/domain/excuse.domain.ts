import { z } from 'zod';

export type ExcuseStatus = 'pending' | 'approved' | 'rejected';
export type ExcuseType = 'unidía' | 'multidía';

export interface ExcuseRequest {
  id: number;
  aprendiz_id: number;
  aprendiz_name?: string;
  aprendiz_document?: string;
  ficha_id?: number;
  ficha_code?: string;
  attendance_id?: number | null;
  start_date: string;
  end_date: string;
  reason: string;
  file_path: string;
  signed_file_url?: string;
  status: ExcuseStatus;
  version: number;
  tipo?: ExcuseType;
  decided_by_instructor_id?: number | null;
  decided_by_name?: string | null;
  instructor_comment?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const ExcuseCreateSchema = z.object({
  ficha_id: z.coerce.number().int().positive('Debe seleccionar obligatoriamente la ficha a la cual va dirigida la excusa'),
  attendance_id: z.coerce.number().int().positive().optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (AAAA-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha fin inválida (AAAA-MM-DD)'),
  reason: z.string().trim().min(5, 'El motivo de la excusa debe tener al menos 5 caracteres')
}).refine(data => data.end_date >= data.start_date, {
  message: 'La fecha fin no puede ser anterior a la fecha de inicio',
  path: ['end_date']
});

export const ExcuseReviewSchema = z.object({
  action: z.enum(['approved', 'rejected'], {
    message: 'Acción no válida. Debe ser approved o rejected.'
  }),
  version: z.coerce.number().int().min(1, 'El número de versión es obligatorio para control de concurrencia'),
  instructor_comment: z.string().trim().optional().nullable()
}).refine(data => {
  if (data.action === 'rejected') {
    return Boolean(data.instructor_comment && data.instructor_comment.trim().length > 0);
  }
  return true;
}, {
  message: 'El motivo de rechazo es obligatorio al rechazar una excusa',
  path: ['instructor_comment']
});

export type ExcuseCreateInput = z.infer<typeof ExcuseCreateSchema>;
export type ExcuseReviewInput = z.infer<typeof ExcuseReviewSchema>;
