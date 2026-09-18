import { query, queryOne } from '@/lib/db';

export interface Ficha {
  id: number;
  code: string;
  program_name: string;
}

export interface Ambiente {
  id: number;
  name: string;
  latitud?: number | null;
  longitud?: number | null;
  radio_maximo_metros?: number;
}

export class FichaRepository {
  async getAllFichas(): Promise<Ficha[]> {
    const sql = `SELECT id, code, program_name FROM fichas ORDER BY code ASC`;
    return query<Ficha>(sql);
  }

  async getFichasByInstructor(instructorId: number): Promise<Ficha[]> {
    const sql = `
      SELECT f.id, f.code, f.program_name
      FROM fichas f
      JOIN instructor_fichas ifi ON ifi.ficha_id = f.id
      WHERE ifi.instructor_id = $1
      ORDER BY f.code ASC
    `;
    const fichas = await query<Ficha>(sql, [instructorId]);
    if (fichas.length === 0) {
      // Fallback: Return all if none explicitly assigned yet
      return this.getAllFichas();
    }
    return fichas;
  }

  async findFichaByCode(code: string): Promise<Ficha | null> {
    const sql = `SELECT id, code, program_name FROM fichas WHERE code = $1 LIMIT 1`;
    return queryOne<Ficha>(sql, [code.trim()]);
  }

  async findFichaById(id: number): Promise<Ficha | null> {
    const sql = `SELECT id, code, program_name FROM fichas WHERE id = $1 LIMIT 1`;
    return queryOne<Ficha>(sql, [id]);
  }

  async getAllAmbientes(): Promise<Ambiente[]> {
    const sql = `SELECT id, name, latitud, longitud, radio_maximo_metros FROM ambientes ORDER BY name ASC`;
    return query<Ambiente>(sql);
  }

  async findAmbienteById(id: number): Promise<Ambiente | null> {
    const sql = `SELECT id, name, latitud, longitud, radio_maximo_metros FROM ambientes WHERE id = $1 LIMIT 1`;
    return queryOne<Ambiente>(sql, [id]);
  }
}

export const fichaRepository = new FichaRepository();
