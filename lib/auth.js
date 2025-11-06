import jwt from 'jsonwebtoken';
import cookie from 'cookie';

// ===== JWT AUTHENTICATION =====

export function validateJWT(req) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
      return { valid: false, error: 'Not authenticated' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: 'Invalid or expired token' };
  }
}

export function requireAuth(handler) {
  return async (req, res) => {
    const authResult = validateJWT(req);

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
