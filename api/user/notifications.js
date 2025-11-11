import { requireAuth } from '../../lib/auth.js';
import { getUser, updateUser } from '../../lib/database.js';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId;
    const { notifications } = req.body;

    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid notifications object'
      });
    }

    // Valida che i campi siano booleani
    const validKeys = ['searchCompleted', 'newDoctors', 'removedDoctors', 'statusChanged', 'onlyToAssignable'];
    for (const key of validKeys) {
      if (notifications[key] !== undefined && typeof notifications[key] !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: `${key} must be a boolean`
        });
      }
    }

    // Verifica che l'utente esista
    const user = await getUser(chatId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Merge con le notifiche esistenti (default a true se non esistono)
    const currentNotifications = user.notifications || {
      searchCompleted: true,
      newDoctors: true,
      removedDoctors: true,
      statusChanged: true,
      onlyToAssignable: true
    };

    const updatedNotifications = {
      ...currentNotifications,
      ...notifications
    };

    // Aggiorna nel DB
    const result = await updateUser(chatId, { notifications: updatedNotifications });

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update notifications'
      });
    }

    return res.status(200).json({
      success: true,
      notifications: updatedNotifications
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAuth(handler);
