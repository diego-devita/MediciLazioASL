import { getAllSubscribedUsers, saveResults } from '../lib/database.js';
import { sendNotification } from '../lib/telegram.js';
import { MediciSearchClient } from '../lib/medici/client.js';

export default async function handler(req, res) {
  // Verifica che sia chiamato da Vercel Cron
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕐 Cron job started:', new Date().toISOString());

  try {
    // Ottieni tutti gli utenti iscritti
    const users = await getAllSubscribedUsers();
    console.log(`Found ${users.length} subscribed users`);

    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No subscribed users',
        checked: 0
      });
    }

    const client = new MediciSearchClient({
      debug: false,
      useStaticConfig: false
    });

    let successCount = 0;
    let errorCount = 0;

    // Processa ogni utente
    for (const user of users) {
      try {
        console.log(`Checking user ${user.chatId}...`);

        // Notifica inizio
        await sendNotification(
          user.chatId,
          '🔄 Ricerca automatica in corso...'
        );

        // Esegui ricerca
        const medici = await client.searchBySurnames(
          user.query.cognomi,
          {
            asl: user.query.asl || '',
            type: user.query.tipo || 'MMG'
          }
        );

        // Conta assegnabili
        const assegnabili = medici.filter(m => {
          if (!m.assegnabilita) return false;
          const stato = m.assegnabilita.toLowerCase();
          return stato.includes('assegnazione libera') || stato.includes('deroga');
        });

        // Salva risultati
        await saveResults(user.chatId, medici);

        // Notifica fine
        const message = `
✅ *Ricerca terminata!*

Trovati *${medici.length}* medici totali
Di cui *${assegnabili.length}* assegnabili (🟢🟠)

Usa /medici per vedere i dettagli.
        `.trim();

        await sendNotification(user.chatId, message);

        successCount++;

        // Pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error checking user ${user.chatId}:`, error);
        errorCount++;

        // Notifica errore all'utente
        await sendNotification(
          user.chatId,
          `❌ Errore durante la ricerca automatica.\n\nRiprova con /check`
        );
      }
    }

    console.log(`✅ Cron job completed: ${successCount} success, ${errorCount} errors`);

    return res.status(200).json({
      success: true,
      checked: users.length,
      successful: successCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
