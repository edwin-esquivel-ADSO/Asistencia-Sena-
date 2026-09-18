import { z } from 'zod';

export const MOTIVOS_RETIRO = [
  'Deserción',
  'Traslado',
  'Cancelación de matrícula',
  'Retiro voluntario',
  'Otro'
] as const;

export type MotivoRetiro = typeof MOTIVOS_RETIRO[number];

export const DOCUMENT_REGEX = /^\d+$/;
export const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

export interface Aprendiz {
  id: number;
  document: string;
  full_name: string;
  ficha_id?: number | null;
  ficha_code?: string;
  program_name?: string;
  is_active: boolean;
  deactivation_reason?: string | null;
  face_asset_public_id?: string | null;
  face_descriptor_json?: string | null;
  face_registered_at?: string | null;
  biometric_consent_at?: string | null;
  biometric_consent_version?: string;
  created_at: string;
  updated_at?: string;
}

export const AprendizCreateSchema = z.object({
  ficha_code: z.string().trim().min(1, 'La ficha es obligatoria'),
  document: z
    .string()
    .trim()
    .min(1, 'El documento es obligatorio')
    .regex(DOCUMENT_REGEX, 'El documento debe contener exclusivamente dígitos numéricos (sin letras ni caracteres especiales)'),
  full_name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .regex(NAME_REGEX, 'El nombre debe contener exclusivamente letras y espacios (sin números ni símbolos)')
});

export const AprendizUpdateSchema = z.object({
  id: z.number().int().positive('ID de aprendiz inválido'),
  document: z
    .string()
    .trim()
    .regex(DOCUMENT_REGEX, 'El documento debe contener exclusivamente dígitos numéricos')
    .optional(),
  full_name: z
    .string()
    .trim()
    .min(3)
    .regex(NAME_REGEX, 'El nombre debe contener exclusivamente letras y espacios')
    .optional(),
  is_active: z.boolean().optional(),
  deactivation_reason: z.string().trim().optional()
});

export const AprendizDeactivateSchema = z.object({
  id: z.number().int().positive('ID de aprendiz inválido'),
  reason: z.string().min(1, 'El motivo de retiro es obligatorio').refine(
    val => MOTIVOS_RETIRO.some(m => val.startsWith(m)),
    {
      message: 'El motivo de retiro debe pertenecer al catálogo institucional: Deserción, Traslado, Cancelación de matrícula, Retiro voluntario u Otro.'
    }
  ),
  notes: z.string().trim().optional()
});

export type AprendizCreateInput = z.infer<typeof AprendizCreateSchema>;
export type AprendizUpdateInput = z.infer<typeof AprendizUpdateSchema>;
export type AprendizDeactivateInput = z.infer<typeof AprendizDeactivateSchema>;
