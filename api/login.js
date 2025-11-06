import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key richiesta' });
    }

    // Valida API key
    const validKeys = process.env.API_KEYS.split(',').map(k => k.trim());
    if (!validKeys.includes(apiKey)) {
      return res.status(401).json({ error: 'API key non valida' });
    }

    // Genera JWT token (valido 30 giorni)
    const token = jwt.sign(
      { authenticated: true, timestamp: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Setta cookie httpOnly
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
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
