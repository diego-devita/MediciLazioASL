import { getUser, generateWebAuthToken } from '../database.js';

export async function handleToken(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Usa /start prima');
      return;
    }

    // Genera nuovo token (invalida il precedente)
    const token = await generateWebAuthToken(chatId);

    if (!token) {
      await bot.sendMessage(chatId, '❌ Errore nella generazione del token');
      return;
    }

    const message = `
🔑 Codice di accesso generato!

\`${token}\`

Usa questo codice per accedere alla pagina web.

⚠️ Importante:
• Il codice è valido per 20 minuti
• Puoi usarlo una sola volta
• Ogni nuovo /token invalida il precedente
    `.trim();

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /token:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
