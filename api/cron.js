import { getAllUsers, saveResults } from '../lib/database.js';
import { sendNotification } from '../lib/telegram.js';
import { MediciSearchClient } from '../lib/medici/client.js';
import { requireApiKey } from '../lib/auth.js';

async function handler(req, res) {
  // Solo metodo POST o GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🕐 Cron job started:', new Date().toISOString());

  try {
    // Ottieni tutti gli utenti
    const users = await getAllUsers();
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users',
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

        // Esegui ricerca (ASL = Tutte, tipo = MMG)
        const result = await client.searchMedici(
          user.query.cognomi,
          {
            asl: '',  // Tutte le ASL
            type: 'MMG'
          }
        );

        const medici = result.medici;

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

// Wrap con autenticazione API key
export default requireApiKey(handler);
