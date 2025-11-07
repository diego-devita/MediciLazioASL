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
        // Skip se non ha cognomi configurati
        if (!user.query.cognomi || user.query.cognomi.length === 0) {
          console.log(`Skipping user ${user.chatId} - no cognomi configured`);
          continue;
        }

        console.log(`Checking user ${user.chatId} with ${user.query.cognomi.length} cognomi...`);

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

        // === DIFF CON RISULTATI PRECEDENTI ===
        const oldResults = user.lastResults || [];

        // Mappa vecchi risultati per codiceFiscale
        const oldMap = new Map();
        oldResults.forEach(m => {
          if (m.codiceFiscale) {
            oldMap.set(m.codiceFiscale, m);
          }
        });

        // Trova nuovi medici
        const nuoviMedici = medici.filter(m => {
          return m.codiceFiscale && !oldMap.has(m.codiceFiscale);
        });

        // Trova medici con stato cambiato
        const medicinCambiati = medici.filter(m => {
          if (!m.codiceFiscale) return false;
          const old = oldMap.get(m.codiceFiscale);
          if (!old) return false; // Nuovo, già contato sopra
          return old.assegnabilita !== m.assegnabilita;
        });

        // Salva risultati
        await saveResults(user.chatId, medici);

        // Controlla se ci sono variazioni
        const ciSonoVariazioni = nuoviMedici.length > 0 || medicinCambiati.length > 0;
        const variazioniMsg = ciSonoVariazioni
          ? 'Ci sono state variazioni.'
          : 'Non ci sono state variazioni.';

        // Notifica fine ricerca
        const message = `
✅ Ricerca terminata!

Trovati ${medici.length} medici totali
Di cui ${assegnabili.length} assegnabili (🟢🟠)

${variazioniMsg}

Usa /medici per vedere i dettagli.
        `.trim();

        await sendNotification(user.chatId, message);

        // === NOTIFICHE DIFF ===

        // Notifica nuovi medici
        if (nuoviMedici.length > 0) {
          const getEmoji = (assegnabilita) => {
            if (!assegnabilita) return '🔴';
            const stato = assegnabilita.toLowerCase();
            if (stato.includes('assegnazione libera')) return '🟢';
            if (stato.includes('deroga')) return '🟠';
            return '🔴';
          };

          let nuoviMsg = `🆕 Nuovi medici trovati (${nuoviMedici.length}):\n\n`;
          nuoviMedici.forEach(m => {
            const emoji = getEmoji(m.assegnabilita);
            nuoviMsg += `${emoji} ${m.cognome} ${m.nome}\n`;
          });

          await sendNotification(user.chatId, nuoviMsg.trim());
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Notifica medici cambiati
        if (medicinCambiati.length > 0) {
          const getEmoji = (assegnabilita) => {
            if (!assegnabilita) return '🔴';
            const stato = assegnabilita.toLowerCase();
            if (stato.includes('assegnazione libera')) return '🟢';
            if (stato.includes('deroga')) return '🟠';
            return '🔴';
          };

          let cambiatoMsg = `🔄 Medici che hanno cambiato stato (${medicinCambiati.length}):\n\n`;
          medicinCambiati.forEach(m => {
            const emoji = getEmoji(m.assegnabilita);
            cambiatoMsg += `${emoji} ${m.cognome} ${m.nome}\n`;
          });

          await sendNotification(user.chatId, cambiatoMsg.trim());
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        successCount++;

        // Pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error checking user ${user.chatId}:`, error);
        errorCount++;

        // Notifica errore all'utente
        await sendNotification(
          user.chatId,
          `❌ Errore durante la ricerca automatica`
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
