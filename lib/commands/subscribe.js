import { getUser, subscribe } from '../database.js';

export async function handleSubscribe(bot, chatId) {
  try {
    const user = await getUser(chatId);

    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    if (user.subscribed) {
      await bot.sendMessage(
        chatId,
        'ℹ️ Sei già iscritto alle notifiche!\n\nUsa /unsubscribe per disattivarle.'
      );
      return;
    }

    await subscribe(chatId);

    await bot.sendMessage(
      chatId,
      `✅ *Iscrizione riattivata!*

Riceverai notifiche automatiche ogni 30 minuti quando ci sono medici disponibili.

Query attuale:
• Cognomi: ${user.query.cognomi.join(', ')}
• ASL: ${user.query.asl || 'Tutte'}
• Tipo: ${user.query.tipo}

Usa /list per modificare la configurazione.
      `.trim()
    );
  } catch (error) {
    console.error('Error in /subscribe:', error);
    await bot.sendMessage(chatId, '❌ Errore durante l\'iscrizione.');
  }
}
