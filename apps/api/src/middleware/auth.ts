import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/crypto.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.userId,
      email: payload.email
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}
