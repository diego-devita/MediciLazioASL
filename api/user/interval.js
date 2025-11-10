import { requireAuth } from '../../lib/auth.js';
import { updateUser } from '../../lib/database.js';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId;
    const { minutes } = req.body;

    // Validazione
    if (!minutes || typeof minutes !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Intervallo non valido'
      });
    }

    if (minutes < 1 || minutes > 300) {
      return res.status(400).json({
        success: false,
        error: 'L\'intervallo deve essere tra 1 e 300 minuti'
      });
    }

    // Aggiorna intervallo
    await updateUser(chatId, {
      minIntervalMinutes: Math.floor(minutes)
    });

    return res.status(200).json({
      success: true,
      message: `Intervallo aggiornato a ${Math.floor(minutes)} minuti`,
      minutes: Math.floor(minutes)
    });

  } catch (error) {
    console.error('Error updating interval:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore nell\'aggiornamento dell\'intervallo'
    });
  }
}

export default requireAuth(handler);
