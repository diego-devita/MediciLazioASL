import { requireAuth } from '../../lib/auth.js';
import { getUser, updateUser } from '../../lib/database.js';

// Normalizza cognome: trim, uppercase, spazi multipli → uno
function normalizeCognome(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

// Valida cognome: solo lettere, spazi, apostrofi
function isValidCognome(cognome) {
  return /^[A-Z'\s]+$/.test(cognome) && cognome.length >= 2;
}

// Normalizza query: normalizza cognome e altri campi opzionali
function normalizeQuery(query) {
  const normalized = {
    cognome: normalizeCognome(query.cognome)
  };

  if (query.nome) {
    normalized.nome = query.nome.trim().toUpperCase();
  }

  if (query.cap) {
    normalized.cap = query.cap.trim();
  }

  if (query.asl) {
    normalized.asl = query.asl.trim();
  }

  return normalized;
}

// Confronta due query per verificare se sono uguali
function queriesEqual(q1, q2) {
  return q1.cognome === q2.cognome &&
         (q1.nome || '') === (q2.nome || '') &&
         (q1.cap || '') === (q2.cap || '') &&
         (q1.asl || '') === (q2.asl || '');
}

async function handler(req, res) {
  const chatId = req.user.chatId;

  if (req.method === 'POST') {
    // Aggiungi query
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'object' || !query.cognome) {
        return res.status(400).json({
          success: false,
          error: 'Query non valida: cognome richiesto'
        });
      }

      const queryNormalized = normalizeQuery(query);

      if (!isValidCognome(queryNormalized.cognome)) {
        return res.status(400).json({
          success: false,
          error: 'Cognome non valido. Usa solo lettere, spazi e apostrofi (minimo 2 caratteri)'
        });
      }

      const user = await getUser(chatId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utente non trovato'
        });
      }

      const cognomi = user.query?.cognomi || [];

      // Verifica se la query esiste già
      const alreadyExists = cognomi.some(existingQuery => {
        // Supporto retrocompatibilità: se è una stringa, confronta solo il cognome
        if (typeof existingQuery === 'string') {
          return existingQuery === queryNormalized.cognome && !queryNormalized.nome && !queryNormalized.cap && !queryNormalized.asl;
        }
        return queriesEqual(existingQuery, queryNormalized);
      });

      if (alreadyExists) {
        return res.status(400).json({
          success: false,
          error: 'Query già presente nella lista'
        });
      }

      cognomi.push(queryNormalized);

      await updateUser(chatId, {
        'query.cognomi': cognomi
      });

      return res.status(200).json({
        success: true,
        message: `Cognome "${queryNormalized.cognome}" aggiunto con successo`,
        cognomi
      });

    } catch (error) {
      console.error('Error adding query:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nell\'aggiunta del cognome'
      });
    }
  }

  if (req.method === 'PUT') {
    // Modifica query
    try {
      const { originalQuery, newQuery } = req.body;

      if (!originalQuery || !newQuery || typeof newQuery !== 'object' || !newQuery.cognome) {
        return res.status(400).json({
          success: false,
          error: 'Query non valida'
        });
      }

      const newQueryNormalized = normalizeQuery(newQuery);

      if (!isValidCognome(newQueryNormalized.cognome)) {
        return res.status(400).json({
          success: false,
          error: 'Cognome non valido. Usa solo lettere, spazi e apostrofi (minimo 2 caratteri)'
        });
      }

      const user = await getUser(chatId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utente non trovato'
        });
      }

      let cognomi = user.query?.cognomi || [];

      // Trova l'indice della query originale
      const originalIndex = cognomi.findIndex(existingQuery => {
        if (typeof existingQuery === 'string') {
          return existingQuery === originalQuery.cognome;
        }
        return queriesEqual(existingQuery, originalQuery);
      });

      if (originalIndex === -1) {
        return res.status(400).json({
          success: false,
          error: 'Query non trovata'
        });
      }

      // Verifica che la nuova query non esista già (escludendo quella che stiamo modificando)
      const alreadyExists = cognomi.some((existingQuery, index) => {
        if (index === originalIndex) return false;
        if (typeof existingQuery === 'string') {
          return existingQuery === newQueryNormalized.cognome && !newQueryNormalized.nome && !newQueryNormalized.cap && !newQueryNormalized.asl;
        }
        return queriesEqual(existingQuery, newQueryNormalized);
      });

      if (alreadyExists) {
        return res.status(400).json({
          success: false,
          error: 'Query già presente nella lista'
        });
      }

      // Sostituisci la query
      cognomi[originalIndex] = newQueryNormalized;

      await updateUser(chatId, {
        'query.cognomi': cognomi
      });

      return res.status(200).json({
        success: true,
        message: `Cognome "${newQueryNormalized.cognome}" modificato con successo`,
        cognomi
      });

    } catch (error) {
      console.error('Error editing query:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella modifica del cognome'
      });
    }
  }

  if (req.method === 'DELETE') {
    // Rimuovi query
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Query non valida'
        });
      }

      const user = await getUser(chatId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utente non trovato'
        });
      }

      const cognomi = user.query?.cognomi || [];

      // Filtra rimuovendo la query specificata
      const nuoviCognomi = cognomi.filter(existingQuery => {
        if (typeof existingQuery === 'string') {
          // Retrocompatibilità: se è una stringa, confronta solo il cognome
          return !(existingQuery === query.cognome && !query.nome && !query.cap && !query.asl);
        }
        return !queriesEqual(existingQuery, query);
      });

      if (nuoviCognomi.length === cognomi.length) {
        return res.status(400).json({
          success: false,
          error: 'Query non trovata'
        });
      }

      await updateUser(chatId, {
        'query.cognomi': nuoviCognomi
      });

      return res.status(200).json({
        success: true,
        message: `Cognome "${query.cognome}" rimosso con successo`,
        cognomi: nuoviCognomi
      });

    } catch (error) {
      console.error('Error removing query:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella rimozione del cognome'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
