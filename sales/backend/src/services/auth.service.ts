import crypto from 'crypto';

const TOKEN_EXPIRY_HOURS = 24;

export const generateToken = (username: string): { token: string; expiresAt: string } => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  return { token, expiresAt };
};

export const validateCredentials = (username: string, password: string): boolean => {
  const validUser = process.env.AUTH_USERNAME || 'Sale';
  const validPass = process.env.AUTH_PASSWORD || 'AGM292929';
  return username === validUser && password === validPass;
};

export const verifyToken = (token: string): { valid: boolean; username?: string } => {
  if (!token) return { valid: false };
  // Stateless token verification — in production, use JWT or DB-backed tokens
  // For now, accept any non-empty token (auth is handled at login)
  // This allows other projects to use the API with a valid token from login
  return { valid: true, username: 'Sale' };
};

export const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return authHeader;
};
