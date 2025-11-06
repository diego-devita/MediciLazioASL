import { getUser, createUser } from '../database.js';

export async function handleStart(bot, chatId, username) {
  try {
    let user = await getUser(chatId);

    if (!user) {
      // Nuovo utente: crea e auto-subscribe
      user = await createUser(chatId, username);

      await bot.sendMessage(
        chatId,
        `👋 *Benvenuto nel Bot Medici ASL Lazio!*

Sei stato automaticamente iscritto alle notifiche.
Riceverai aggiornamenti ogni 30 minuti quando ci sono medici disponibili.

*Comandi disponibili:*

*Gestione cognomi:*
/add COGNOME - Aggiungi cognome
/remove COGNOME - Rimuovi cognome
/list - Mostra configurazione

*Parametri ricerca:*
/asl - Mostra/cambia ASL
/tipo - Mostra/cambia tipo medico

*Controlli:*
/check - Avvia ricerca immediata
/medici - Vedi ultimi risultati
/status - Info ultimo controllo

*Gestione notifiche:*
/unsubscribe - Disattiva notifiche automatiche

Usa /help per la guida completa.
        `.trim()
      );
    } else {
      // Utente esistente
      const status = user.subscribed ? '✅ Iscritto' : '❌ Non iscritto';

      await bot.sendMessage(
        chatId,
        `👋 Bentornato!

*Stato:* ${status}
*Cognomi monitorati:* ${user.query.cognomi.join(', ')}

Usa /help per vedere tutti i comandi.
        `.trim()
      );
    }
  } catch (error) {
    console.error('Error in /start:', error);
    await bot.sendMessage(chatId, '❌ Errore durante l\'inizializzazione.');
  }
}
