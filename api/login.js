import { createJWT } from '../lib/auth.js';
import { getLoginAttemptsCollection } from '../lib/database.js';
import { RATE_LIMIT, AUTH, LOGGING } from '../lib/config.js';

// ===== RATE LIMITING (in-memory) =====
const loginAttempts = new Map();
let lastCleanup = Date.now();

function getClientIP(req) {
  // Vercel fornisce l'IP reale in x-forwarded-for
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isIPBlocked(ip) {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return false;

  // Controlla se IP è ancora bloccato
  if (attempt.blockedUntil && Date.now() < attempt.blockedUntil) {
    return {
      blocked: true,
      retryAfter: Math.ceil((attempt.blockedUntil - Date.now()) / 1000)
    };
  }

  // Se la finestra è scaduta, reset
  if (Date.now() - attempt.firstAttempt > RATE_LIMIT.LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }

  return false;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    // Primo tentativo fallito
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
      blockedUntil: null
    });
    return { blocked: false, remaining: RATE_LIMIT.MAX_LOGIN_ATTEMPTS - 1 };
  }

  // Incrementa contatore
  attempt.count++;

  // Se raggiunto il limite, blocca
  if (attempt.count >= RATE_LIMIT.MAX_LOGIN_ATTEMPTS) {
    attempt.blockedUntil = now + RATE_LIMIT.BLOCK_DURATION_MS;
    return {
      blocked: true,
      retryAfter: Math.ceil(RATE_LIMIT.BLOCK_DURATION_MS / 1000)
    };
  }

  return {
    blocked: false,
    remaining: RATE_LIMIT.MAX_LOGIN_ATTEMPTS - attempt.count
  };
}

function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMIT.CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [ip, attempt] of loginAttempts.entries()) {
    // Rimuovi entry scadute
    if (attempt.blockedUntil && now > attempt.blockedUntil) {
      loginAttempts.delete(ip);
    } else if (now - attempt.firstAttempt > RATE_LIMIT.LOGIN_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }

  lastCleanup = now;
}

async function logLoginAttempt({ ip, success, apiKeyPartial, userAgent, blocked }) {
  try {
    const collection = await getLoginAttemptsCollection();
    await collection.insertOne({
      ip,
      timestamp: new Date(),
      success,
      apiKeyPartial,
      userAgent,
      blocked,
      metadata: {
        server: 'vercel',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    });

    // Log anche su console per Vercel dashboard
    console.log(JSON.stringify({
      type: 'LOGIN_ATTEMPT',
      ip,
      success,
      blocked,
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    console.error('Failed to log login attempt:', err);
    // Non blocchiamo il login se logging fallisce
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cleanup periodico delle entry vecchie
  cleanupOldEntries();

  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key richiesta' });
    }

    // Controlla se IP è bloccato
    const blockStatus = isIPBlocked(ip);
    if (blockStatus && blockStatus.blocked) {
      // Log tentativo bloccato
      await logLoginAttempt({
        ip,
        success: false,
        apiKeyPartial: apiKey.substring(0, LOGGING.API_KEY_PARTIAL_LENGTH),
        userAgent,
        blocked: true
      });

      res.setHeader('Retry-After', blockStatus.retryAfter);
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT.MAX_LOGIN_ATTEMPTS);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + blockStatus.retryAfter * 1000) / 1000));

      return res.status(429).json({
        error: 'Troppi tentativi di login falliti',
        message: `Account temporaneamente bloccato. Riprova tra ${blockStatus.retryAfter} secondi.`,
        retryAfter: blockStatus.retryAfter
      });
    }

    // Valida API key
    const validKeys = process.env.API_KEYS.split(',').map(k => k.trim());
    if (!validKeys.includes(apiKey)) {
      // Registra tentativo fallito
      const result = recordFailedAttempt(ip);

      // Log tentativo fallito
      await logLoginAttempt({
        ip,
        success: false,
        apiKeyPartial: apiKey.substring(0, LOGGING.API_KEY_PARTIAL_LENGTH),
        userAgent,
        blocked: result.blocked
      });

      res.setHeader('X-RateLimit-Limit', RATE_LIMIT.MAX_LOGIN_ATTEMPTS);
      res.setHeader('X-RateLimit-Remaining', result.remaining || 0);

      if (result.blocked) {
        res.setHeader('Retry-After', result.retryAfter);
        return res.status(429).json({
          error: 'Troppi tentativi di login falliti',
          message: `Account temporaneamente bloccato. Riprova tra ${result.retryAfter} secondi.`,
          retryAfter: result.retryAfter
        });
      }

      return res.status(401).json({
        error: 'API key non valida',
        remaining: result.remaining
      });
    }

    // Login riuscito - reset tentativi
    resetAttempts(ip);

    // Log tentativo riuscito
    await logLoginAttempt({
      ip,
      success: true,
      apiKeyPartial: apiKey.substring(0, LOGGING.API_KEY_PARTIAL_LENGTH),
      userAgent,
      blocked: false
    });

    // Genera JWT token
    const token = await createJWT({ timestamp: Date.now() });

    // Setta cookie httpOnly
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${AUTH.COOKIE_MAX_AGE}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Autenticazione completata',
      redirectTo: '/'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Errore durante il login' });
  }
}
