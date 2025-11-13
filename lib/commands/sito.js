import { APP } from '../config.js';

export async function handleSito(bot, chatId) {
  try {
    await bot.sendMessage(
      chatId,
      `🌐 *Accedi al sito web*

${APP.URL}

Usa il codice OTP generato con /otp per accedere.
      `.trim(),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error in /sito:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
