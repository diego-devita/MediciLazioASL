import { getUser } from '../database.js';
import { getAslNome, getTipoNome } from '../medici/constants.js';

export async function handleStatus(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    const aslNome = getAslNome(user.query.asl);
    const tipoNome = getTipoNome(user.query.tipo);
    const subscriptionStatus = user.subscribed ? '✅ Attivo' : '❌ Disattivo';

    let message = `📊 *Stato sistema*\n\n`;
    message += `*Notifiche automatiche:* ${subscriptionStatus}\n\n`;
    message += `*Configurazione ricerca:*\n`;
    message += `• Cognomi: ${user.query.cognomi.join(', ')}\n`;
    message += `• ASL: ${aslNome}\n`;
    message += `• Tipo: ${tipoNome}\n\n`;

    if (user.lastCheck) {
      const lastCheckDate = new Date(user.lastCheck);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastCheckDate) / (1000 * 60));

      let timeAgo;
      if (diffMinutes < 1) {
        timeAgo = 'meno di un minuto fa';
      } else if (diffMinutes < 60) {
        timeAgo = `${diffMinutes} minuti fa`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        timeAgo = `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
      }

      message += `*Ultima ricerca:* ${timeAgo}\n`;
      message += `*Risultati trovati:* ${user.lastResults?.length || 0}\n\n`;
    } else {
      message += `*Ultima ricerca:* Mai eseguita\n\n`;
    }

    message += `Usa /check per una ricerca immediata.`;

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /status:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
