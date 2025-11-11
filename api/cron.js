import { getAllUsers, saveResults, markSuccessfulContact, markFailedContact, saveCronLog, saveVariationHistory, getSystemSettings } from '../lib/database.js';
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
  const startTime = Date.now();

  try {
    // Check global system settings first
    const systemSettings = await getSystemSettings();
    if (systemSettings.cronEnabled === false) {
      console.log('Cron globally disabled - skipping all users');

      // Salva log anche se disabilitato
      await saveCronLog({
        success: true,
        usersChecked: 0,
        usersSuccessful: 0,
        usersErrors: 0,
        duration: Date.now() - startTime,
        skipped: true,
        reason: 'globally_disabled'
      });

      return res.status(200).json({
        success: true,
        message: 'Cron monitoring is globally disabled',
        skipped: true
      });
    }

    // Ottieni tutti gli utenti
    const users = await getAllUsers();
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      // Salva log anche se non ci sono utenti
      await saveCronLog({
        success: true,
        usersChecked: 0,
        usersSuccessful: 0,
        usersErrors: 0,
        duration: Date.now() - startTime
      });

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
        // Skip se il monitoraggio è disabilitato
        if (user.cronEnabled === false) {
          console.log(`Skipping user ${user.chatId} - monitoring disabled`);
          continue;
        }

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

        console.log(`Checking user ${user.chatId} with ${user.query.cognomi.length} queries...`);

        // Esegui una query singola per ogni elemento configurato
        const allMedici = [];
        const allQueries = [];

        for (const queryItem of user.query.cognomi) {
          // Supporto retrocompatibilità: se è una stringa, converti in oggetto query
          const query = typeof queryItem === 'string'
            ? { cognome: queryItem }
            : queryItem;

          console.log(`Executing query for: ${JSON.stringify(query)}`);

          // Esegui ricerca con parametri specifici della query
          const result = await client.searchMedici(
            [query.cognome],  // Array con singolo cognome
            {
              asl: query.asl || '',  // ASL specifica o tutte
              type: 'MMG',
              zip: query.cap || '',
              name: query.nome || ''
            }
          );

          allMedici.push(...result.medici);
          allQueries.push(...result.singleQueries);
        }

        // Deduplicazione per codiceFiscale
        const mediciMap = new Map();
        allMedici.forEach(m => {
          if (m.codiceFiscale) {
            mediciMap.set(m.codiceFiscale, m);
          }
        });
        const medici = Array.from(mediciMap.values());

        console.log(`Total results before dedup: ${allMedici.length}, after dedup: ${medici.length}`);

        // Conta assegnabili
        const assegnabili = medici.filter(m => {
          if (!m.assegnabilita) return false;
          const stato = m.assegnabilita.toLowerCase();
          return stato.includes('assegnazione libera') || stato.includes('deroga');
        });

        // === DIFF CON RISULTATI PRECEDENTI ===
        const oldResults = user.lastResults || [];

        console.log(`User ${user.chatId} - Old results count: ${oldResults.length}, New results count: ${medici.length}`);

        // Debug: controlla se i vecchi risultati hanno codiceFiscale
        const oldWithCF = oldResults.filter(m => m.codiceFiscale);
        const oldWithoutCF = oldResults.filter(m => !m.codiceFiscale);
        console.log(`Old results: ${oldWithCF.length} with CF, ${oldWithoutCF.length} without CF`);
        if (oldResults.length > 0) {
          console.log('First old result:', JSON.stringify(oldResults[0], null, 2));
        }

        // Debug: controlla se i nuovi risultati hanno codiceFiscale
        const newWithCF = medici.filter(m => m.codiceFiscale);
        const newWithoutCF = medici.filter(m => !m.codiceFiscale);
        console.log(`New results: ${newWithCF.length} with CF, ${newWithoutCF.length} without CF`);
        if (medici.length > 0) {
          console.log('First new result:', JSON.stringify(medici[0], null, 2));
        }

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

        console.log(`Differences - New: ${nuoviMedici.length}, Removed: ${mediciRimossi.length}`);

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
            asl: m.asl
          })),
          rimossi: mediciRimossi.map(m => ({
            codiceFiscale: m.codiceFiscale,
            cognome: m.cognome,
            nome: m.nome,
            assegnabilita: m.assegnabilita,
            asl: m.asl
          })),
          cambiati: medicinCambiati.map(item => ({
            codiceFiscale: item.medico.codiceFiscale,
            cognome: item.medico.cognome,
            nome: item.medico.nome,
            statoVecchio: item.statoVecchio,
            statoNuovo: item.statoNuovo,
            asl: item.medico.asl
          })),
          timestamp: new Date().toISOString()
        };

        console.log('Saving differences:', JSON.stringify(differences, null, 2));

        // Salva risultati con differenze
        const saveResult = await saveResults(user.chatId, medici, differences);
        console.log('Save result:', saveResult ? 'success' : 'failed');

        // Controlla se ci sono variazioni
        const ciSonoVariazioni = nuoviMedici.length > 0 || mediciRimossi.length > 0 || medicinCambiati.length > 0;
        const variazioniMsg = ciSonoVariazioni
          ? 'Ci sono state variazioni.'
          : 'Non ci sono state variazioni.';

        // Salva history delle variazioni (solo se ci sono variazioni)
        if (ciSonoVariazioni) {
          await saveVariationHistory(user.chatId, {
            queries: user.query.cognomi,
            variations: {
              new: nuoviMedici.map(m => ({
                codiceFiscale: m.codiceFiscale,
                cognome: m.cognome,
                nome: m.nome,
                assegnabilita: m.assegnabilita,
                asl: m.asl
              })),
              removed: mediciRimossi.map(m => ({
                codiceFiscale: m.codiceFiscale,
                cognome: m.cognome,
                nome: m.nome,
                assegnabilita: m.assegnabilita,
                asl: m.asl
              })),
              changed: medicinCambiati.map(item => ({
                codiceFiscale: item.medico.codiceFiscale,
                cognome: item.medico.cognome,
                nome: item.medico.nome,
                statoVecchio: item.statoVecchio,
                statoNuovo: item.statoNuovo,
                asl: item.medico.asl
              }))
            },
            totalResults: medici.length,
            totalAvailable: assegnabili.length
          });
        }

        // Preferenze notifiche (default a true se non esistono)
        const notifications = user.notifications || {
          searchCompleted: true,
          newDoctors: true,
          removedDoctors: true,
          statusChanged: true
        };

        // Notifica fine ricerca (se abilitata)
        let mainResult = { success: true };
        if (notifications.searchCompleted) {
          const message = `
✅ Ricerca terminata!

Trovati ${medici.length} medici totali
Di cui ${assegnabili.length} assegnabili (🟢🟠)

${variazioniMsg}

Usa /medici per vedere i dettagli.
          `.trim();

          mainResult = await sendNotificationSafe(user.chatId, message);

          // Se utente bloccato/inattivo, skip notifiche diff
          if (!mainResult.success) {
            console.log(`Skipping user ${user.chatId} - blocked or deleted`);
            continue;
          }
        }

        // Notifica totale liberi (se abilitata)
        if (notifications.totalAvailable) {
          // Filtra solo i medici con "Assegnazione libera"
          const liberi = medici.filter(m => {
            if (!m.assegnabilita) return false;
            const stato = m.assegnabilita.toLowerCase();
            return stato.includes('assegnazione libera');
          });

          if (liberi.length > 0) {
            const message = `
🟢 Totale medici con assegnazione libera: ${liberi.length}

Usa /medici per vedere i dettagli.
            `.trim();

            const result = await sendNotificationSafe(user.chatId, message);
            if (!result.success) {
              console.log(`Skipping user ${user.chatId} - blocked or deleted`);
              continue;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // === NOTIFICHE DIFF ===

        // Notifica nuovi medici (se abilitata)
        if (notifications.newDoctors && nuoviMedici.length > 0) {
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

        // Notifica medici rimossi (se abilitata)
        if (notifications.removedDoctors && mediciRimossi.length > 0) {
          let rimossiMsg = `❌ Medici rimossi (${mediciRimossi.length}):\n\n`;
          mediciRimossi.forEach(m => {
            rimossiMsg += `⚫ ${m.cognome} ${m.nome}\n`;
          });

          await sendNotificationSafe(user.chatId, rimossiMsg.trim());
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Notifica medici cambiati (se abilitata)
        if (notifications.statusChanged && medicinCambiati.length > 0) {
          const getEmoji = (assegnabilita) => {
            if (!assegnabilita) return '🔴';
            const stato = assegnabilita.toLowerCase();
            if (stato.includes('assegnazione libera')) return '🟢';
            if (stato.includes('deroga')) return '🟠';
            return '🔴';
          };

          // Filtra in base a onlyToAssignable se abilitato
          let medicinDaNotificare = medicinCambiati;
          if (notifications.onlyToAssignable) {
            // Mostra solo i cambiamenti verso "Assegnazione libera"
            medicinDaNotificare = medicinCambiati.filter(item => {
              const statoNuovo = item.statoNuovo?.toLowerCase() || '';
              return statoNuovo.includes('assegnazione libera');
            });
          }

          if (medicinDaNotificare.length > 0) {
            let cambiatoMsg = `🔄 Medici che hanno cambiato stato (${medicinDaNotificare.length}):\n\n`;
            medicinDaNotificare.forEach(item => {
              const emoji = getEmoji(item.statoNuovo);
              cambiatoMsg += `${emoji} ${item.cognome} ${item.nome}\n`;
            });

            await sendNotificationSafe(user.chatId, cambiatoMsg.trim());
            await new Promise(resolve => setTimeout(resolve, 500));
          }
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

    // Salva log esecuzione
    await saveCronLog({
      success: true,
      usersChecked: users.length,
      usersSuccessful: successCount,
      usersErrors: errorCount,
      duration: Date.now() - startTime
    });

    return res.status(200).json({
      success: true,
      checked: users.length,
      successful: successCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('Cron job error:', error);

    // Salva log errore
    await saveCronLog({
      success: false,
      usersChecked: 0,
      usersSuccessful: 0,
      usersErrors: 0,
      duration: Date.now() - startTime,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default handler;
