import { getUser } from '../database.js';

// Emoji per assegnabilità
function getEmoji(assegnabilita) {
  if (!assegnabilita) return '🔴';
  const stato = assegnabilita.toLowerCase();
  if (stato.includes('assegnazione libera')) return '🟢';
  if (stato.includes('deroga')) return '🟠';
  return '🔴';
}

export async function handleMedici(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Usa /start prima');
      return;
    }

    if (!user.lastResults || user.lastResults.length === 0) {
      await bot.sendMessage(chatId, '📭 Nessun risultato.\n\nDati aggiornati dal check automatico.');
      return;
    }

    // Data ultimo check
    const lastCheck = user.lastCheck
      ? new Date(user.lastCheck).toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'mai';

    // Raggruppa per assegnabilità
    const assegnabili = user.lastResults.filter(m => {
      if (!m.assegnabilita) return false;
      return m.assegnabilita.toLowerCase().includes('assegnazione libera');
    });

    const conDeroga = user.lastResults.filter(m => {
      if (!m.assegnabilita) return false;
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('deroga') && !stato.includes('assegnazione libera');
    });

    const nonAssegnabili = user.lastResults.length - assegnabili.length - conDeroga.length;

    // Messaggio header
    let message = `📊 Medici (${user.lastResults.length})\n`;
    message += `🕐 ${lastCheck}\n\n`;
    message += `🟢 ${assegnabili.length}  🟠 ${conDeroga.length}  🔴 ${nonAssegnabili}\n\n`;

    // Lista primi 10 medici
    const maxShow = 10;
    const toShow = user.lastResults.slice(0, maxShow);

    toShow.forEach(medico => {
      const emoji = getEmoji(medico.assegnabilita);
      message += `${emoji} ${medico.cognome} ${medico.nome}\n`;
      if (medico.indirizzo) {
        message += `   ${medico.indirizzo}\n`;
      }
    });

    if (user.lastResults.length > maxShow) {
      message += `\n... +${user.lastResults.length - maxShow} medici`;
    }

    await bot.sendMessage(chatId, message.trim());

  } catch (error) {
    console.error('Error in /medici:', error);
    await bot.sendMessage(chatId, `❌ Errore: ${error.message}`);
  }
}
