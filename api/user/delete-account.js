import { requireAuth, hashToken } from '../../lib/auth.js';
import { connectToDatabase, deleteUserSessions } from '../../lib/database.js';
import { DATABASE } from '../../lib/config.js';

async function deleteAccountHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId; // Utente autenticato dal middleware

    const { db } = await connectToDatabase();
    const usersCollection = db.collection(DATABASE.COLLECTIONS.USERS);

    // Elimina l'utente
    const result = await usersCollection.deleteOne({ chatId: String(chatId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Revoca tutte le sessioni dell'utente (compresa quella corrente)
    const deletedSessions = await deleteUserSessions(chatId);

    // Cancella tutte le entry nella storia variazioni dell'utente
    const variationsCollection = db.collection(DATABASE.COLLECTIONS.VARIATIONS_HISTORY);
    const deletedVariations = await variationsCollection.deleteMany({ chatId: String(chatId) });

    console.log(`User ${chatId} deleted their account, revoked ${deletedSessions} session(s), and deleted ${deletedVariations.deletedCount} variation history entries`);

    // Cancella il cookie
    res.setHeader('Set-Cookie', [
      `auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Account eliminato con successo',
      sessionsRevoked: deletedSessions,
      variationsDeleted: deletedVariations.deletedCount
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore durante l\'eliminazione dell\'account'
    });
  }
}

// Applica il middleware di autenticazione
export default requireAuth(deleteAccountHandler);
