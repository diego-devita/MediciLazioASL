import { getAllUsers, saveResults, markSuccessfulContact, markFailedContact } from '../lib/database.js';
import { sendNotification } from '../lib/telegram.js';
import { MediciSearchClient } from '../lib/medici/client.js';

// Helper per inviare notifiche con gestione 403
async function sendNotificationSafe(chatId, message) {
  try {
    await sendNotification(chatId, message);
    await markSuccessfulContact(chatId);
    return { success: true };
  } catch (error) {
    // Errore 403: bot bloccato o chat cancellata
    if (error.response?.statusCode === 403 || error.code === 403) {
      console.log(`403 error for user ${chatId} - marking as failed`);
      await markFailedContact(chatId);
      return { success: false, reason: 'blocked' };
    }
    // Altri errori: rilancia
    throw error;
  }
}

async function handler(req, res) {
  // Verifica CRON_SECRET_KEY
  const cronKey = req.headers['x-cron-key'];
  const validCronKey = process.env.CRON_SECRET_KEY;

  if (!validCronKey) {
    console.error('CRON_SECRET_KEY not configured');
    return res.status(500).json({
      success: false,
      error: 'Cron authentication not configured'
    });
  }

  if (!cronKey || cronKey !== validCronKey) {
    console.warn('Invalid or missing X-Cron-Key header');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Provide valid X-Cron-Key header.'
    });
  }

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
      debug: true, // Abilita debug temporaneamente per vedere cosa viene parsato
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

        // Skip se non è passato abbastanza tempo dall'ultima interrogazione
        const minIntervalMinutes = user.minIntervalMinutes || 30;
        if (user.lastCheck) {
          const lastCheckTime = new Date(user.lastCheck).getTime();
          const now = Date.now();
          const minutesSinceLastCheck = (now - lastCheckTime) / (1000 * 60);

          if (minutesSinceLastCheck < minIntervalMinutes) {
            console.log(`Skipping user ${user.chatId} - interval not reached (${Math.floor(minutesSinceLastCheck)}/${minIntervalMinutes} min)`);
            continue;
          }
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

        // Mappa nuovi risultati per codiceFiscale
        const newMap = new Map();
        medici.forEach(m => {
          if (m.codiceFiscale) {
            newMap.set(m.codiceFiscale, m);
          }
        });

        // Trova nuovi medici
        const nuoviMedici = medici.filter(m => {
          return m.codiceFiscale && !oldMap.has(m.codiceFiscale);
        });

        // Trova medici rimossi
        const mediciRimossi = oldResults.filter(m => {
          return m.codiceFiscale && !newMap.has(m.codiceFiscale);
        });

        // Trova medici con stato cambiato (con dettagli da->a)
        const medicinCambiati = [];
        medici.forEach(m => {
          if (!m.codiceFiscale) return;
          const old = oldMap.get(m.codiceFiscale);
          if (!old) return; // Nuovo, già contato sopra
          if (old.assegnabilita !== m.assegnabilita) {
            medicinCambiati.push({
              medico: m,
              statoVecchio: old.assegnabilita,
              statoNuovo: m.assegnabilita
            });
          }
        });

        // Prepara oggetto differenze
        const differences = {
          nuovi: nuoviMedici.map(m => ({
            codiceFiscale: m.codiceFiscale,
            cognome: m.cognome,
            nome: m.nome,
            assegnabilita: m.assegnabilita,
            azienda: m.azienda,
            ambito: m.ambito
          })),
          rimossi: mediciRimossi.map(m => ({
            codiceFiscale: m.codiceFiscale,
            cognome: m.cognome,
            nome: m.nome,
            assegnabilita: m.assegnabilita,
            azienda: m.azienda,
            ambito: m.ambito
          })),
          cambiati: medicinCambiati.map(item => ({
            codiceFiscale: item.medico.codiceFiscale,
            cognome: item.medico.cognome,
            nome: item.medico.nome,
            statoVecchio: item.statoVecchio,
            statoNuovo: item.statoNuovo,
            azienda: item.medico.azienda,
            ambito: item.medico.ambito
          })),
          timestamp: new Date().toISOString()
        };

        // Salva risultati con differenze
        await saveResults(user.chatId, medici, differences);

        // Controlla se ci sono variazioni
        const ciSonoVariazioni = nuoviMedici.length > 0 || mediciRimossi.length > 0 || medicinCambiati.length > 0;
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

        const mainResult = await sendNotificationSafe(user.chatId, message);

        // Se utente bloccato/inattivo, skip notifiche diff
        if (!mainResult.success) {
          console.log(`Skipping user ${user.chatId} - blocked or deleted`);
          continue;
        }

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

          await sendNotificationSafe(user.chatId, nuoviMsg.trim());
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

          await sendNotificationSafe(user.chatId, cambiatoMsg.trim());
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        successCount++;

        // Pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error checking user ${user.chatId}:`, error);
        errorCount++;

        // Notifica errore all'utente (con gestione 403)
        await sendNotificationSafe(
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

export default handler;
