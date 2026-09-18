import { z } from 'zod';

export type UserRole = 'instructor' | 'coordinador';

export interface User {
  id: number;
  document: string;
  full_name: string;
  username: string | null;
  email: string | null;
  password_hash?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserSession {
  id: number;
  document: string;
  full_name: string;
  username: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean;
}

export const LoginSchema = z.object({
  document: z
    .string()
    .trim()
    .min(1, 'El documento es obligatorio'),
  full_name: z
    .string()
    .trim()
    .min(1, 'El nombre completo es obligatorio'),
  accept_terms: z.boolean().refine(val => val === true, {
    message: 'Debe aceptar los términos de tratamiento de datos personales.'
  })
});

export type LoginInput = z.infer<typeof LoginSchema>;
