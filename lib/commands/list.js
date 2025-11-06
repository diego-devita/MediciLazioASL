import { getUser } from '../database.js';
import { getAslNome, getTipoNome } from '../medici/constants.js';

export async function handleList(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    const aslNome = getAslNome(user.query.asl);
    const tipoNome = getTipoNome(user.query.tipo);
    const status = user.subscribed ? '✅ Attivo' : '❌ Disattivo';

    const message = `
📋 *Configurazione attuale*

*Notifiche automatiche:* ${status}

*Cognomi monitorati* (${user.query.cognomi.length}):
${user.query.cognomi.map((c, i) => `${i + 1}. ${c}`).join('\n')}

*ASL:* ${aslNome}
*Tipo medico:* ${tipoNome}

Usa /add o /remove per modificare i cognomi.
Usa /asl o /tipo per cambiare i parametri.
    `.trim();

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /list:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
