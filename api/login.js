import { createJWT, hashToken } from '../lib/auth.js';
import { validateWebAuthToken, markWebAuthTokenAsUsed, createSession, logLoginAttempt, checkRateLimit } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    // Estrai IP e User Agent per logging
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Controlla rate limiting PRIMA di validare il token
    const rateLimit = await checkRateLimit(ip);
    if (rateLimit.isBlocked) {
      // Log tentativo bloccato
      await logLoginAttempt({
        ip,
        userAgent,
        success: false,
        blocked: true,
        username: null
      });

      const minutesRemaining = Math.ceil((rateLimit.nextAttemptAllowed - new Date()) / 60000);

      return res.status(429).json({
        error: 'Troppi tentativi falliti',
        message: `Hai superato il numero massimo di tentativi di login (5). Riprova tra ${minutesRemaining} minuti.`,
        nextAttemptAllowed: rateLimit.nextAttemptAllowed.toISOString(),
        attemptsCount: rateLimit.attemptsCount
      });
    }

    if (!token) {
      return res.status(400).json({ error: 'Token richiesto' });
    }

    // Valida token
    const user = await validateWebAuthToken(token);

    if (!user) {
      // Log tentativo fallito
      await logLoginAttempt({
        ip,
        userAgent,
        success: false,
        blocked: false,
        username: null
      });

      return res.status(401).json({
        error: 'Codice non valido',
        message: 'Il codice non è valido, è già stato usato o è scaduto (validità: 20 minuti). Richiedi un nuovo codice con /token nel bot Telegram.'
      });
    }

    // Marca token come usato
    await markWebAuthTokenAsUsed(token);

    // Genera JWT token con informazioni utente
    const jwtToken = await createJWT({
      chatId: user.chatId,
      username: user.username,
      role: user.role || 'user'
    });

    // Salva sessione nel DB
    const tokenHash = hashToken(jwtToken);
    await createSession({
      tokenHash,
      chatId: user.chatId,
      username: user.username,
      role: user.role || 'user',
      userAgent,
      ip
    });

    // Log tentativo riuscito
    await logLoginAttempt({
      ip,
      userAgent,
      success: true,
      blocked: false,
      username: user.username
    });

    // Setta cookie httpOnly SENZA scadenza
    res.setHeader('Set-Cookie', [
      `auth_token=${jwtToken}; Path=/; HttpOnly; SameSite=Strict; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Autenticazione completata',
      user: {
        chatId: user.chatId,
        username: user.username,
        role: user.role || 'user'
      },
      redirectTo: '/'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Errore durante il login' });
  }
}
