import { z } from 'zod';

export const MAX_EXTEMPORANEOUS_GRACE_MINUTES = 10;
export const QR_ROTATION_INTERVAL_SECONDS = 30;

export const JORNADAS = ['Diurna', 'Tarde', 'Nocturna', 'Mixta'] as const;
export type Jornada = typeof JORNADAS[number];

export interface QRSession {
  id: number;
  token: string;
  instructor_id: number;
  instructor_name?: string | null;
  ficha_code: string;
  ficha_id?: number | null;
  program_name?: string | null;
  jornada: Jornada;
  ambiente_name?: string | null;
  ambiente_id?: number | null;
  grupo?: string | null;
  sede?: string | null;
  duration_minutes: number;
  hours_duration: number;
  session_type: 'regular' | 'late_qr';
  parent_session_id?: number | null;
  status: 'active' | 'finished';
  created_at: string;
  expires_at: string;
  rotativeToken?: string;
}

export const CreateSessionSchema = z.object({
  ficha_code: z.string().trim().min(1, 'La ficha es obligatoria'),
  ambiente_id: z.coerce.number().int().positive('El ambiente es obligatorio'),
  jornada: z.enum(JORNADAS, { message: 'Jornada no válida' }),
  duration_minutes: z.coerce.number().int().min(1).max(60).default(5),
  hours_duration: z.coerce.number().int().min(1).max(12).default(6),
  grupo: z.string().trim().optional(),
  sede: z.string().trim().optional()
});

export const LateQrSchema = z.object({
  parent_session_id: z.coerce.number().int().positive('ID de sesión principal inválido')
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type LateQrInput = z.infer<typeof LateQrSchema>;
