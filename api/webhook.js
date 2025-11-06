import { TelegramBot } from '../lib/telegram.js';
import { handleStart } from '../lib/commands/start.js';
import { handleSubscribe } from '../lib/commands/subscribe.js';
import { handleUnsubscribe } from '../lib/commands/unsubscribe.js';
import { handleAdd } from '../lib/commands/add.js';
import { handleRemove } from '../lib/commands/remove.js';
import { handleList } from '../lib/commands/list.js';
import { handleAsl } from '../lib/commands/asl.js';
import { handleTipo } from '../lib/commands/tipo.js';
import { handleCheck } from '../lib/commands/check.js';
import { handleMedici } from '../lib/commands/medici.js';
import { handleStatus } from '../lib/commands/status.js';
import { handleHelp } from '../lib/commands/help.js';

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

    // Initialize bot
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

    // Route commands
    switch (command) {
      case '/start':
        await handleStart(bot, chatId, username);
        break;

      case '/subscribe':
        await handleSubscribe(bot, chatId);
        break;

      case '/unsubscribe':
        await handleUnsubscribe(bot, chatId);
        break;

      case '/add':
        await handleAdd(bot, chatId, args);
        break;

      case '/remove':
        await handleRemove(bot, chatId, args);
        break;

      case '/list':
        await handleList(bot, chatId);
        break;

      case '/asl':
        await handleAsl(bot, chatId, args);
        break;

      case '/tipo':
        await handleTipo(bot, chatId, args);
        break;

      case '/check':
        await handleCheck(bot, chatId);
        break;

      case '/medici':
        await handleMedici(bot, chatId);
        break;

      case '/status':
        await handleStatus(bot, chatId);
        break;

      case '/help':
        await handleHelp(bot, chatId);
        break;

      default:
        await bot.sendMessage(
          chatId,
          '❌ Comando non riconosciuto.\n\nUsa /help per vedere tutti i comandi disponibili.'
        );
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
