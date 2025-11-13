import { TelegramBot } from '../lib/telegram.js';
import { handleStart } from '../lib/commands/start.js';
import { handleMedici } from '../lib/commands/medici.js';
import { handleHelp } from '../lib/commands/help.js';
import { handleOtp } from '../lib/commands/otp.js';
import { handleRuolo } from '../lib/commands/ruolo.js';
import { handleSito } from '../lib/commands/sito.js';

export default async function handler(req, res) {
  // Only accept POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate Telegram secret token
  const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
  if (secretToken) {
    const telegramToken = req.headers['x-telegram-bot-api-secret-token'];
    if (telegramToken !== secretToken) {
      console.warn('Invalid Telegram secret token');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const update = req.body;
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      // Answer callback query to remove loading state
      await bot.answerCallbackQuery(callbackQuery.id);

      // Handle button actions
      if (data === 'cmd_otp') {
        await handleOtp(bot, chatId);
      }

      return res.status(200).json({ ok: true });
    }

    // Ignore non-message updates
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const username = message.from.username || message.from.first_name || 'User';
    const text = message.text.trim();

    // Parse command and arguments
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Route commands
    switch (command) {
      case '/start':
        await handleStart(bot, chatId, username);
        break;

      case '/medici':
        await handleMedici(bot, chatId);
        break;

      case '/help':
        await handleHelp(bot, chatId);
        break;

      case '/otp':
        await handleOtp(bot, chatId);
        break;

      case '/sito':
        await handleSito(bot, chatId);
        break;

      case '/ruolo':
        await handleRuolo(bot, chatId);
        break;

      default:
        await bot.sendMessage(
          chatId,
          '❌ Comando non riconosciuto. Usa /help'
        );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
