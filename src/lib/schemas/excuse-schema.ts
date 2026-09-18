import { z } from 'zod';

export const excuseSchema = z
  .object({
    start_date: z
      .string({ error: 'La fecha de inicio es requerida' })
      .min(1, 'La fecha de inicio es requerida'),
    end_date: z
      .string({ error: 'La fecha de fin es requerida' })
      .min(1, 'La fecha de fin es requerida'),
    reason: z
      .string({ error: 'El motivo es requerido' })
      .min(5, 'El motivo debe tener al menos 5 caracteres'),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
    },
    {
      message: 'La fecha de fin debe ser mayor o igual a la fecha de inicio',
      path: ['end_date'],
    }
  );

export type ExcuseInput = z.infer<typeof excuseSchema>;
