import { z } from 'zod';

export const ATTENDANCE_STATES = ['Presente', 'Falta', 'Tarde', 'Justificado'] as const;
export type AttendanceState = typeof ATTENDANCE_STATES[number];

export interface Attendance {
  id: number;
  qr_session_id?: number | null;
  fecha: string;
  hora: string;
  instructor_name: string;
  ficha_code: string;
  jornada: string;
  ambiente_name: string;
  grupo?: string | null;
  sede?: string | null;
  aprendiz_name: string;
  aprendiz_document: string;
  estado: AttendanceState;
  registro_tipo: 'puntual' | 'tardio_qr' | 'tardio_manual';
  horas: number;
  ip_publica: string;
  latitud?: string | null;
  longitud?: string | null;
  precision_gps?: string | null;
  location_status?: string | null;
  navegador: string;
  dispositivo: string;
  excuse_path?: string | null;
  excuse_note?: string | null;
  tarea_registrada?: boolean;
  tarea_nota?: string | null;
  created_at: string;
  updated_at: string;
}

export const AttendanceRegisterSchema = z.object({
  token: z.string().trim().min(1, 'El token QR es obligatorio'),
  rotative_token: z.string().trim().min(1, 'El token dinámico rotativo es obligatorio'),
  document: z.string().trim().min(1, 'El documento es obligatorio'),
  full_name: z.string().trim().min(1, 'El nombre es obligatorio'),
  candidate_descriptor: z.array(z.number()).length(128, 'El descriptor facial debe tener exactamente 128 valores').optional().nullable(),
  latitud: z.string().optional(),
  longitud: z.string().optional(),
  precision_gps: z.string().optional(),
  location_status: z.string().optional()
});

export const AttendanceEditSchema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum(ATTENDANCE_STATES),
  horas: z.coerce.number().int().min(0).max(12).optional(),
  tarea_registrada: z.boolean().optional(),
  tarea_nota: z.string().trim().optional().nullable()
});

export type AttendanceRegisterInput = z.infer<typeof AttendanceRegisterSchema>;
export type AttendanceEditInput = z.infer<typeof AttendanceEditSchema>;
