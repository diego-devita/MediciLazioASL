import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { getSession, updateSessionLastUsed, getUser } from './database.js';

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

  // JWT senza scadenza (solo per sessioni web)
  const token = await new SignJWT({ ...payload, authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(secret);

  return token;
}

// Helper per creare hash del token
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
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

    // 1. Verifica firma JWT
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);

    // 2. Verifica che la sessione esista nel DB
    const tokenHash = hashToken(token);
    const session = await getSession(tokenHash);

    if (!session) {
      return { valid: false, error: 'Session not found or revoked' };
    }

    // 3. Verifica che l'utente esista ancora nel DB
    const user = await getUser(payload.chatId);

    if (!user) {
      return { valid: false, error: 'User not found' };
    }

    // 4. Aggiorna ultimo utilizzo (non-blocking)
    updateSessionLastUsed(tokenHash).catch(err =>
      console.error('Error updating session last used:', err)
    );

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Invalid or expired token' };
  }
}

// Esporta hashToken per uso in altri moduli
export { hashToken };

export function requireAuth(handler) {
  return async (req, res) => {
    const authResult = await validateJWT(req);

    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        error: authResult.error
      });
    }

    // Passa le informazioni utente al handler
    req.user = authResult.payload;

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

// ===== AUTHENTICATION IBRIDA (JWT o API Key) =====

export function requireAuthOrApiKey(handler) {
  return async (req, res) => {
    // Prova prima con JWT (cookie)
    const jwtResult = await validateJWT(req);
    if (jwtResult.valid) {
      return handler(req, res);
    }

    // Se JWT non valido, prova con API key
    const apiKeyResult = validateApiKey(req);
    if (apiKeyResult.valid) {
      return handler(req, res);
    }

    // Nessuno dei due metodi è valido
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide either a valid session cookie or X-API-Key header.'
    });
  };
}

// ===== ADMIN AUTHENTICATION =====

/**
 * Middleware che richiede autenticazione JWT con ruolo admin
 * Aggiunge req.user al handler con informazioni dell'utente
 */
export function requireAdmin(handler) {
  return async (req, res) => {
    const authResult = await validateJWT(req);

    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Please login.'
      });
    }

    // Controlla se l'utente ha ruolo admin
    if (authResult.payload.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. Admin access required.'
      });
    }

    // Passa le informazioni utente al handler
    req.user = authResult.payload;

    return handler(req, res);
  };
}
