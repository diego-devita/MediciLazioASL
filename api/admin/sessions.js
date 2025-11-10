import { requireAdmin } from '../../lib/auth.js';
import { getAllSessions, deleteSession, deleteUserSessions } from '../../lib/database.js';

async function handler(req, res) {
  // GET: Lista tutte le sessioni
  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const result = await getAllSessions(pageNum, limitNum);

      return res.status(200).json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions'
      });
    }
  }

  // DELETE: Revoca una sessione o tutte le sessioni di un utente
  if (req.method === 'DELETE') {
    try {
      const { tokenHash, chatId } = req.query;

      if (!tokenHash && !chatId) {
        return res.status(400).json({
          success: false,
          error: 'Provide either tokenHash or chatId query parameter'
        });
      }

      if (tokenHash) {
        // Revoca sessione specifica
        const deleted = await deleteSession(tokenHash);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: 'Session not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Session revoked successfully'
        });
      }

      if (chatId) {
        // Revoca tutte le sessioni dell'utente
        const deletedCount = await deleteUserSessions(chatId);

        return res.status(200).json({
          success: true,
          message: `Revoked ${deletedCount} session(s)`,
          deletedCount
        });
      }

    } catch (error) {
      console.error('Error deleting session:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete session'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAdmin(handler);
