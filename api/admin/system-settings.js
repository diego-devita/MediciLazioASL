import { requireAdmin } from '../../lib/auth.js';
import { getSystemSettings, updateSystemSettings } from '../../lib/database.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    // GET: Ottieni le impostazioni di sistema
    try {
      const settings = await getSystemSettings();

      return res.status(200).json({
        success: true,
        settings: settings
      });

    } catch (error) {
      console.error('Error getting system settings:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }

  } else if (req.method === 'POST') {
    // POST: Aggiorna le impostazioni di sistema
    try {
      const updates = req.body;

      // Validazione: accetta solo cronEnabled per ora
      const allowedFields = ['cronEnabled'];
      const filteredUpdates = {};

      for (const field of allowedFields) {
        if (field in updates) {
          filteredUpdates[field] = updates[field];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      const success = await updateSystemSettings(filteredUpdates);

      if (!success) {
        throw new Error('Failed to update system settings');
      }

      return res.status(200).json({
        success: true,
        message: 'System settings updated successfully'
      });

    } catch (error) {
      console.error('Error updating system settings:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }

  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
  }
}

// Wrap con autenticazione admin
export default requireAdmin(handler);
