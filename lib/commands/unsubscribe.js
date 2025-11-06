import { getUser, unsubscribe } from '../database.js';

export async function handleUnsubscribe(bot, chatId) {
  try {
    const user = await getUser(chatId);

    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    if (!user.subscribed) {
      await bot.sendMessage(
        chatId,
        'ℹ️ Non sei iscritto alle notifiche.\n\nUsa /subscribe per iscriverti.'
      );
      return;
    }

    await unsubscribe(chatId);

    await bot.sendMessage(
      chatId,
      `✅ *Iscrizione annullata*

Non riceverai più notifiche automatiche ogni 30 minuti.

Puoi comunque:
• Usare /check per ricerche manuali
• Usare /medici per vedere gli ultimi risultati
• Usare /subscribe per riattivare le notifiche
      `.trim()
    );
  } catch (error) {
    console.error('Error in /unsubscribe:', error);
    await bot.sendMessage(chatId, '❌ Errore durante l\'annullamento.');
  }
}
