import { getUser } from '../database.js';

export async function handleCognomi(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Usa /start prima');
      return;
    }

    if (user.query.cognomi.length === 0) {
      await bot.sendMessage(chatId, '📋 Lista vuota\n\nUsa /add COGNOME per aggiungere');
      return;
    }

    const lista = user.query.cognomi
      .map((c, i) => `${i + 1}. ${c}`)
      .join('\n');

    await bot.sendMessage(
      chatId,
      `📋 Cognomi (${user.query.cognomi.length}):\n\n${lista}`
    );
  } catch (error) {
    console.error('Error in /cognomi:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
