import fetch from 'node-fetch';

export class TelegramBot {
  constructor(token) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options.parseMode || 'Markdown',
          ...options
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      return data.result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async setWebhook(url) {
    const response = await fetch(`${this.apiUrl}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    return response.json();
  }

  async deleteWebhook() {
    const response = await fetch(`${this.apiUrl}/deleteWebhook`, {
      method: 'POST'
    });

    return response.json();
  }

  async getWebhookInfo() {
    const response = await fetch(`${this.apiUrl}/getWebhookInfo`);
    return response.json();
  }
}

// Helper per inviare notifica (usato da cron e comandi)
export async function sendNotification(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  const bot = new TelegramBot(token);

  try {
    await bot.sendMessage(chatId, message);
    return true;
  } catch (error) {
    console.error(`Error sending notification to ${chatId}:`, error);
    return false;
  }
}
