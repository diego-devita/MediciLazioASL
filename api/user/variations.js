import { requireAuth } from '../../lib/auth.js';
import { getVariationHistory } from '../../lib/database.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chatId = req.user.chatId;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const history = await getVariationHistory(chatId, limit);

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error getting variation history:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default requireAuth(handler);
