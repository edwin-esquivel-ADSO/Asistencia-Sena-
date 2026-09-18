import { userRepository } from '@/repositories/user.repository';
import { User, UserSession, LoginInput } from '@/domain/user.domain';
import { signSessionToken } from '@/lib/auth';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Normalizes strings by removing accents/tildes, converting to lower case and trimming spaces.
 * Example: "Carlos Mario Restrépo" -> "carlos mario restrepo"
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export class AuthService {
  async authenticateUser(input: LoginInput): Promise<{ user: UserSession; token: string; redirect: string }> {
    const cleanDoc = input.document.trim();

    // 1. Prioritize Document as the primary identifier
    const user = await userRepository.findByDocument(cleanDoc, true);

    if (!user) {
      throw new AuthenticationError('El número de documento o nombre no corresponden a un usuario activo en el sistema.');
    }

    // 2. Name validation: case-insensitive AND accent/tilde-insensitive
    const normalizedInputName = normalizeText(input.full_name);
    const normalizedDbName = normalizeText(user.full_name);

    if (normalizedInputName !== normalizedDbName) {
      // If full name does not match exactly without accents, check partial match or throw
      const inputTokens = normalizedInputName.split(' ');
      const dbTokens = normalizedDbName.split(' ');
      const allTokensMatch = inputTokens.every(token => dbTokens.includes(token));

      if (!allTokensMatch) {
        throw new AuthenticationError('El nombre completo no coincide con el registro del documento proporcionado.');
      }
    }

    const sessionUser: UserSession = {
      id: user.id,
      document: user.document,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    };

    const token = signSessionToken(sessionUser);
    const redirect = user.role === 'coordinador' ? '/coordinador/dashboard' : '/instructor/dashboard';

    return { user: sessionUser, token, redirect };
  }
}

export const authService = new AuthService();
