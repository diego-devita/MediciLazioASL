import { requireAuth } from '../../lib/auth.js';
import { updateUser } from '../../lib/database.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const chatId = req.user.chatId;
    const { cronEnabled } = req.body;

    // Validazione
    if (typeof cronEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'cronEnabled must be a boolean'
      });
    }

    // Aggiorna l'utente
    const updatedUser = await updateUser(chatId, { cronEnabled });

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return res.status(200).json({
      success: true,
      message: 'User monitoring settings updated successfully',
      cronEnabled: updatedUser.cronEnabled
    });

  } catch (error) {
    console.error('Error updating user cron settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// Wrap con autenticazione utente
export default requireAuth(handler);
