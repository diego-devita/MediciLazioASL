import { TELEGRAM, APP } from '../lib/config.js';

/**
 * API endpoint per fornire configurazione pubblica al frontend
 * GET /api/config
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Restituisce solo informazioni pubbliche e sicure
    return res.status(200).json({
      success: true,
      telegram: {
        botUsername: TELEGRAM.BOT_USERNAME
      },
      app: {
        url: APP.URL
      }
    });
  } catch (error) {
    console.error('Error in /api/config:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
