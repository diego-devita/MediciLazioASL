import { requireAuth } from '../../lib/auth.js';
import { getCronLogs, getCronStats } from '../../lib/database.js';

async function handler(req, res) {
  // Solo admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden. Admin access required.'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, page = 1, limit = 50 } = req.query;

    // Se richiede statistiche
    if (action === 'stats') {
      const stats = await getCronStats();
      return res.status(200).json({
        success: true,
        stats
      });
    }

    // Altrimenti ritorna i log con paginazione
    const result = await getCronLogs(parseInt(page), parseInt(limit));

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error fetching cron logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAuth(handler);
