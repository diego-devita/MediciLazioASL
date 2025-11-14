import { getUser, generateWebAuthToken } from '../database.js';
import { APP } from '../config.js';

export async function handleOtp(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Usa /start prima');
      return;
    }

    // Genera nuovo token (invalida il precedente)
    const token = await generateWebAuthToken(chatId);

    if (!token) {
      await bot.sendMessage(chatId, '❌ Errore nella generazione del codice OTP');
      return;
    }

    const message = `
🔑 Codice OTP generato!

\`${token}\`

Usa questo codice per accedere alla pagina web ${APP.URL}

⚠️ Importante:
• Il codice è valido per 20 minuti
• Puoi usarlo una sola volta
• Ogni nuovo /otp invalida il precedente
    `.trim();

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /otp:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
