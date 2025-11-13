import { requireAuth, hashToken } from '../lib/auth.js';
import { deleteSession } from '../lib/database.js';

async function logoutHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Estrai il token dalla richiesta corrente (cookie o header)
    let token = null;

    // Prova con Authorization header
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Se non c'è Authorization header, prova con cookie
    if (!token) {
      const cookieHeader = req.headers.cookie || '';
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [key, ...v] = c.split('=');
          return [key, v.join('=')];
        }).filter(([k]) => k)
      );
      token = cookies.auth_token;
    }

    if (token) {
      // Elimina SOLO la sessione corrente dal database
      const tokenHash = hashToken(token);
      await deleteSession(tokenHash);
      console.log(`Logout: session deleted for user ${req.user.username}`);
    }

    // Cancella il cookie impostando Max-Age=0
    res.setHeader('Set-Cookie', [
      `auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Logout effettuato con successo'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Errore durante il logout' });
  }
}

// Applica il middleware di autenticazione
export default requireAuth(logoutHandler);
