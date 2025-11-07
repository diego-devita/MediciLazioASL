import { getUser, createUser } from '../database.js';

export async function handleStart(bot, chatId, username) {
  try {
    let user = await getUser(chatId);

    if (!user) {
      // Nuovo utente: crea e auto-subscribe
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
      // Utente esistente
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
