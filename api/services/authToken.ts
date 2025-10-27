import crypto from 'crypto';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface VerifyResult {
  success: boolean;
  payload?: AuthTokenPayload;
  reason?: string;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

let cachedSecret: Buffer | null = null;
let hasWarned = false;

function getSecret(): Buffer {
  if (cachedSecret) {
    return cachedSecret;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (!hasWarned) {
      console.warn('JWT_SECRET not set, falling back to development default. Set JWT_SECRET in .env for security.');
      hasWarned = true;
    }
    cachedSecret = Buffer.from('development-secret-key', 'utf-8');
    return cachedSecret;
  }

  cachedSecret = Buffer.from(secret, 'utf-8');
  return cachedSecret;
}

function base64UrlEncode(value: Buffer): string {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function base64UrlEncodeJson(value: object): string {
  return base64UrlEncode(Buffer.from(JSON.stringify(value)));
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (normalized.length % 4)) % 4;
  const padded = normalized.padEnd(normalized.length + paddingNeeded, '=');
  return Buffer.from(padded, 'base64');
}

export function createAuthToken(payload: AuthTokenPayload, options?: { expiresIn?: number }): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options?.expiresIn ?? TOKEN_TTL_SECONDS;

  const payloadWithMeta: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const headerEncoded = base64UrlEncodeJson(header);
  const payloadEncoded = base64UrlEncodeJson(payloadWithMeta);
  const data = `${headerEncoded}.${payloadEncoded}`;

  const signature = crypto.createHmac('sha256', getSecret()).update(data).digest();
  const signatureEncoded = base64UrlEncode(signature);

  return `${data}.${signatureEncoded}`;
}

export function verifyAuthToken(token: string | undefined): VerifyResult {
  if (!token || typeof token !== 'string') {
    return { success: false, reason: 'Token missing' };
  }

  const segments = token.split('.');
  if (segments.length !== 3) {
    return { success: false, reason: 'Token structure invalid' };
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const data = `${headerSegment}.${payloadSegment}`;

  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(data).digest();
  const receivedSignature = base64UrlDecode(signatureSegment);

  if (
    expectedSignature.length !== receivedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return { success: false, reason: 'Token signature mismatch' };
  }

  try {
    const payloadJson = base64UrlDecode(payloadSegment).toString('utf-8');
    const payload = JSON.parse(payloadJson) as AuthTokenPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { success: false, reason: 'Token expired' };
    }

    return { success: true, payload };
  } catch (error) {
    console.error('Failed to parse auth token payload:', error);
    return { success: false, reason: 'Token payload invalid' };
  }
}
