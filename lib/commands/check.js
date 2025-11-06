import { getUser } from '../database.js';
import { MediciSearchClient } from '../medici/client.js';
import { sendNotification } from '../telegram.js';
import { saveResults } from '../database.js';

export async function handleCheck(bot, chatId) {
  try {
    const user = await getUser(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '❌ Utente non trovato. Usa /start prima.');
      return;
    }

    if (user.query.cognomi.length === 0) {
      await bot.sendMessage(chatId, '❌ Nessun cognome configurato. Usa /add per aggiungerne uno.');
      return;
    }

    // Send start notification
    await sendNotification(chatId, '🔄 Ricerca manuale in corso...');

    // Execute search
    const client = new MediciSearchClient();
    const result = await client.searchMedici(
      user.query.cognomi,
      user.query.asl,
      user.query.tipo
    );

    const medici = result.medici;

    // Count assegnabili (libera + deroga)
    const assegnabili = medici.filter(m => {
      const stato = m.assegnabilita.toLowerCase();
      return stato.includes('assegnazione libera') || stato.includes('deroga');
    });

    // Save results
    await saveResults(chatId, medici);

    // Send completion notification
    await sendNotification(
      chatId,
      `✅ Ricerca terminata!\n\n` +
      `📊 Totali: ${medici.length}\n` +
      `🟢 Assegnabili: ${assegnabili.length}\n\n` +
      `Usa /medici per vedere i risultati.`
    );
  } catch (error) {
    console.error('Error in /check:', error);
    await bot.sendMessage(chatId, `❌ Errore durante la ricerca: ${error.message}`);
  }
}
