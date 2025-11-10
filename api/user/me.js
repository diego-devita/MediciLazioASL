import { requireAuth } from '../../lib/auth.js';
import { getUser } from '../../lib/database.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Il chatId è già disponibile dal JWT grazie a requireAuth
    const chatId = req.user.chatId;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'ChatId not found in session'
      });
    }

    // Recupera l'utente dal database
    const user = await getUser(chatId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Ritorna i dati dell'utente (senza campi sensibili)
    return res.status(200).json({
      success: true,
      user: {
        chatId: user.chatId,
        username: user.username,
        role: user.role,
        query: user.query,
        lastResults: user.lastResults || [],
        lastCheck: user.lastCheck,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
}

export default requireAuth(handler);
