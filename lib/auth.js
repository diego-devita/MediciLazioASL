import { SignJWT, jwtVerify } from 'jose';

// ===== JWT AUTHENTICATION =====

function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable not configured');
  }
  return new TextEncoder().encode(secret);
}

export async function createJWT(payload = {}) {
  const secret = getJWTSecret();

  const token = await new SignJWT({ ...payload, authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);

  return token;
}

export async function validateJWT(req) {
  try {
    // Estrai cookie dall'header
    const cookieHeader = req.headers.cookie || req.headers.get?.('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...v] = c.split('=');
        return [key, v.join('=')];
      })
    );

    const token = cookies.auth_token;

    if (!token) {
      return { valid: false, error: 'Not authenticated' };
    }

    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Invalid or expired token' };
  }
}

export function requireAuth(handler) {
  return async (req, res) => {
    const authResult = await validateJWT(req);

    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        error: authResult.error
      });
    }

    return handler(req, res);
  };
}

// ===== API KEY AUTHENTICATION (per uso esterno) =====

export function validateApiKey(req) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return { valid: false, error: 'API key missing. Provide X-API-Key header.' };
  }

  const validKeys = (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

  if (validKeys.length === 0) {
    console.error('API_KEYS environment variable not configured');
    return { valid: false, error: 'API authentication not configured' };
  }

  if (!validKeys.includes(apiKey)) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true };
}

export function requireApiKey(handler) {
  return async (req, res) => {
    const authResult = validateApiKey(req);

    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        error: authResult.error
      });
    }

    return handler(req, res);
  };
}
