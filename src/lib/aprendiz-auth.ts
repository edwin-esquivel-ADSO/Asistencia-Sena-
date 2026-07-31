import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'sena-attendance-super-secret-key-2026';

export interface AprendizSession {
  id: number;
  document: string;
  full_name: string;
  ficha_id: number;
  face_verified: boolean;
  verified_at?: string;
}

export function signAprendizSessionToken(aprendiz: AprendizSession): string {
  return jwt.sign(
    {
      id: aprendiz.id,
      document: aprendiz.document,
      full_name: aprendiz.full_name,
      ficha_id: aprendiz.ficha_id,
      face_verified: aprendiz.face_verified,
      verified_at: aprendiz.verified_at || new Date().toISOString(),
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function verifyAprendizSessionToken(token: string): AprendizSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AprendizSession;
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function getCurrentAprendiz(): Promise<AprendizSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sena_aprendiz_session')?.value;
    if (!token) return null;
    return verifyAprendizSessionToken(token);
  } catch (err) {
    return null;
  }
}
