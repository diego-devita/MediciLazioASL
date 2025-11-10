import { getUser, createUser, updateUser } from '../database.js';

export async function handleStart(bot, chatId, username) {
  try {
    console.log(`/start called for chatId: ${chatId}`);
    let user = await getUser(chatId);
    console.log(`User found:`, user ? 'yes' : 'no', `- role:`, user?.role);

    if (!user) {
      // Nuovo utente: crea e auto-subscribe
      console.log('Creating new user');
      user = await createUser(chatId, username);

      await bot.sendMessage(
        chatId,
        `👋 Benvenuto!

/add COGNOME - Aggiungi
/remove COGNOME - Rimuovi
/cognomi - Lista
/help - Guida
        `.trim()
      );
    } else {
      // Utente esistente - rivaluta il ruolo admin
      console.log('Checking admin status...');
      const adminChatIds = (process.env.ADMIN_CHAT_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
      console.log('ADMIN_CHAT_IDS:', adminChatIds);
      const shouldBeAdmin = adminChatIds.includes(String(chatId));
      console.log(`Should be admin: ${shouldBeAdmin}, Current role: ${user.role}`);

      // Se il ruolo è cambiato, aggiorna
      if (shouldBeAdmin && user.role !== 'admin') {
        console.log(`Promoting user ${chatId} to admin...`);
        await updateUser(chatId, { role: 'admin' });
        console.log(`User ${chatId} promoted to admin`);
      } else if (!shouldBeAdmin && user.role === 'admin') {
        console.log(`Demoting user ${chatId} to user...`);
        await updateUser(chatId, { role: 'user' });
        console.log(`User ${chatId} demoted to user`);
      } else {
        console.log(`No role change needed for ${chatId}`);
      }

      const cognomiList = user.query.cognomi.length > 0
        ? user.query.cognomi.join(', ')
        : 'nessuno';

      await bot.sendMessage(
        chatId,
        `👋 Bentornato!

Cognomi: ${cognomiList}

/help per i comandi
        `.trim()
      );
    }
  } catch (error) {
    console.error('Error in /start:', error);
    await bot.sendMessage(chatId, '❌ Errore durante l\'inizializzazione.');
  }
}
