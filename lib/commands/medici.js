import { getUser } from '../database.js';
import { getStatoEmoji } from '../medici/constants.js';

export async function handleMedici(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    if (!user.lastResults || user.lastResults.length === 0) {
      await bot.sendMessage(
        chatId,
        'ℹ️ Nessun risultato disponibile.\n\nUsa /check per eseguire una ricerca.'
      );
      return;
    }

    // Count assegnabili
    const assegnabili = user.lastResults.filter(m => {
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('assegnazione libera') || stato.includes('deroga');
    });

    let message = `📋 *Risultati ultima ricerca*\n\n`;
    message += `📊 Totali: ${user.lastResults.length}\n`;
    message += `🟢 Assegnabili: ${assegnabili.length}\n\n`;

    if (assegnabili.length > 0) {
      message += `*Medici assegnabili:*\n\n`;

      assegnabili.forEach((medico, i) => {
        const emoji = getStatoEmoji(medico.assegnabilita);
        message += `${emoji} *${medico.cognome} ${medico.nome}*\n`;
        message += `   ASL: ${medico.asl}\n`;
        message += `   Stato: ${medico.assegnabilita}\n`;
        if (i < assegnabili.length - 1) message += `\n`;
      });
    }

    // Show non-assegnabili summary if any
    const nonAssegnabili = user.lastResults.filter(m => {
      const stato = m.assegnabilita.toLowerCase();
      return !stato.includes('assegnazione libera') && !stato.includes('deroga');
    });

    if (nonAssegnabili.length > 0) {
      message += `\n\n🔴 *Non assegnabili: ${nonAssegnabili.length}*\n`;
      nonAssegnabili.forEach(medico => {
        message += `   • ${medico.cognome} ${medico.nome}\n`;
      });
    }

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /medici:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
