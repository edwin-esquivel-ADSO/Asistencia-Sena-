import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'sena-attendance-super-secret-key-2026';

export interface UserSession {
  id: number;
  document: string;
  full_name: string;
  username: string | null;
  email: string | null;
  role: 'coordinador' | 'instructor';
  is_active: boolean;
}

export function signSessionToken(user: UserSession): string {
  return jwt.sign(
    {
      id: user.id,
      document: user.document,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function verifySessionToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sena_session')?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch (err) {
    return null;
  }
}
