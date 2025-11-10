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

async function handler(req, res) {
  const chatId = req.user.chatId;

  if (req.method === 'POST') {
    // Aggiungi cognome
    try {
      const { cognome } = req.body;

      if (!cognome || typeof cognome !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Cognome non valido'
        });
      }

      const cognomeNormalized = normalizeCognome(cognome);

      if (!isValidCognome(cognomeNormalized)) {
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

      if (cognomi.includes(cognomeNormalized)) {
        return res.status(400).json({
          success: false,
          error: 'Cognome già presente nella lista'
        });
      }

      cognomi.push(cognomeNormalized);

      await updateUser(chatId, {
        'query.cognomi': cognomi
      });

      return res.status(200).json({
        success: true,
        message: `Cognome "${cognomeNormalized}" aggiunto con successo`,
        cognomi
      });

    } catch (error) {
      console.error('Error adding cognome:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nell\'aggiunta del cognome'
      });
    }
  }

  if (req.method === 'DELETE') {
    // Rimuovi cognome
    try {
      const { cognome } = req.body;

      if (!cognome || typeof cognome !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Cognome non valido'
        });
      }

      const cognomeNormalized = normalizeCognome(cognome);

      const user = await getUser(chatId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utente non trovato'
        });
      }

      const cognomi = user.query?.cognomi || [];

      if (!cognomi.includes(cognomeNormalized)) {
        return res.status(400).json({
          success: false,
          error: 'Cognome non presente nella lista'
        });
      }

      const nuoviCognomi = cognomi.filter(c => c !== cognomeNormalized);

      await updateUser(chatId, {
        'query.cognomi': nuoviCognomi
      });

      return res.status(200).json({
        success: true,
        message: `Cognome "${cognomeNormalized}" rimosso con successo`,
        cognomi: nuoviCognomi
      });

    } catch (error) {
      console.error('Error removing cognome:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella rimozione del cognome'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
