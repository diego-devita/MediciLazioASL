import { verifySession } from '../lib/auth.js';
import { updateUser, getUser, getVariationHistory } from '../lib/database.js';

async function handler(req, res) {
  // Verifica autenticazione
  const user = await verifySession(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  req.user = user;

  const { action } = req.query;

  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'Missing action parameter. Use ?action=me|cognomi|interval|notifications|cron-enabled|variations'
    });
  }

  switch (action) {
    case 'me':
      return handleMe(req, res);
    case 'cognomi':
      return handleCognomi(req, res);
    case 'interval':
      return handleInterval(req, res);
    case 'notifications':
      return handleNotifications(req, res);
    case 'cron-enabled':
      return handleCronEnabled(req, res);
    case 'variations':
      return handleVariations(req, res);
    default:
      return res.status(400).json({
        success: false,
        error: `Unknown action: ${action}`
      });
  }
}

// ===== ME =====
async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId;
    const user = await getUser(chatId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// ===== COGNOMI =====
async function handleCognomi(req, res) {
  const chatId = req.user.chatId;

  if (req.method === 'POST') {
    // Aggiungi cognome
    try {
      const { query } = req.body;

      if (!query || !query.cognome) {
        return res.status(400).json({
          success: false,
          error: 'query.cognome is required'
        });
      }

      // Normalizza cognome
      query.cognome = query.cognome.trim().toUpperCase();

      // Valida cognome (solo lettere, apostrofi e spazi)
      if (!/^[A-Z'\s]+$/.test(query.cognome)) {
        return res.status(400).json({
          success: false,
          error: 'Cognome must contain only uppercase letters, apostrophes and spaces'
        });
      }

      // Normalizza nome se presente
      if (query.nome) {
        query.nome = query.nome.trim().toUpperCase();
        if (!/^[A-Z'\s]+$/.test(query.nome)) {
          return res.status(400).json({
            success: false,
            error: 'Nome must contain only uppercase letters, apostrophes and spaces'
          });
        }
      }

      // Normalizza CAP se presente
      if (query.cap) {
        query.cap = query.cap.trim();
        if (!/^\d{5}$/.test(query.cap)) {
          return res.status(400).json({
            success: false,
            error: 'CAP must be exactly 5 digits'
          });
        }
      }

      // Ottieni utente corrente
      const user = await getUser(chatId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Aggiungi query alla lista
      const updatedCognomi = [...(user.query.cognomi || []), query];

      // Aggiorna utente
      const updatedUser = await updateUser(chatId, {
        query: { cognomi: updatedCognomi }
      });

      return res.status(200).json({
        success: true,
        message: 'Query added successfully',
        cognomi: updatedUser.query.cognomi
      });

    } catch (error) {
      console.error('Error adding cognome:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }

  } else if (req.method === 'PUT') {
    // Modifica cognome
    try {
      const { oldQuery, newQuery } = req.body;

      if (!oldQuery || !newQuery || !newQuery.cognome) {
        return res.status(400).json({
          success: false,
          error: 'oldQuery and newQuery are required'
        });
      }

      // Normalizza nuovo cognome
      newQuery.cognome = newQuery.cognome.trim().toUpperCase();

      // Valida nuovo cognome
      if (!/^[A-Z'\s]+$/.test(newQuery.cognome)) {
        return res.status(400).json({
          success: false,
          error: 'Cognome must contain only uppercase letters, apostrophes and spaces'
        });
      }

      // Normalizza nome se presente
      if (newQuery.nome) {
        newQuery.nome = newQuery.nome.trim().toUpperCase();
        if (!/^[A-Z'\s]+$/.test(newQuery.nome)) {
          return res.status(400).json({
            success: false,
            error: 'Nome must contain only uppercase letters, apostrophes and spaces'
          });
        }
      }

      // Normalizza CAP se presente
      if (newQuery.cap) {
        newQuery.cap = newQuery.cap.trim();
        if (!/^\d{5}$/.test(newQuery.cap)) {
          return res.status(400).json({
            success: false,
            error: 'CAP must be exactly 5 digits'
          });
        }
      }

      // Ottieni utente corrente
      const user = await getUser(chatId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Trova e sostituisci query
      const cognomi = user.query.cognomi || [];
      const index = cognomi.findIndex(q => JSON.stringify(q) === JSON.stringify(oldQuery));

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Query not found'
        });
      }

      cognomi[index] = newQuery;

      // Aggiorna utente
      const updatedUser = await updateUser(chatId, {
        query: { cognomi }
      });

      return res.status(200).json({
        success: true,
        message: 'Query updated successfully',
        cognomi: updatedUser.query.cognomi
      });

    } catch (error) {
      console.error('Error updating cognome:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }

  } else if (req.method === 'DELETE') {
    // Rimuovi cognome
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'query is required'
        });
      }

      // Ottieni utente corrente
      const user = await getUser(chatId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Rimuovi query dalla lista
      const cognomi = user.query.cognomi || [];
      const updatedCognomi = cognomi.filter(q => JSON.stringify(q) !== JSON.stringify(query));

      if (updatedCognomi.length === cognomi.length) {
        return res.status(404).json({
          success: false,
          error: 'Query not found'
        });
      }

      // Aggiorna utente
      const updatedUser = await updateUser(chatId, {
        query: { cognomi: updatedCognomi }
      });

      return res.status(200).json({
        success: true,
        message: 'Query removed successfully',
        cognomi: updatedUser.query.cognomi
      });

    } catch (error) {
      console.error('Error removing cognome:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// ===== INTERVAL =====
async function handleInterval(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId;
    const { minIntervalMinutes } = req.body;

    // Validazione
    if (typeof minIntervalMinutes !== 'number' || minIntervalMinutes < 1 || minIntervalMinutes > 1440) {
      return res.status(400).json({
        success: false,
        error: 'minIntervalMinutes must be a number between 1 and 1440 (24 hours)'
      });
    }

    // Aggiorna utente
    const updatedUser = await updateUser(chatId, { minIntervalMinutes });

    return res.status(200).json({
      success: true,
      message: 'Interval updated successfully',
      minIntervalMinutes: updatedUser.minIntervalMinutes
    });

  } catch (error) {
    console.error('Error updating interval:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// ===== NOTIFICATIONS =====
async function handleNotifications(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId;
    const { notifications } = req.body;

    // Validazione
    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'notifications object is required'
      });
    }

    // Campi validi
    const validFields = ['searchCompleted', 'newDoctors', 'removedDoctors', 'statusChanged', 'totalAvailable', 'onlyToAssignable'];

    // Filtra solo i campi validi
    const filteredNotifications = {};
    for (const field of validFields) {
      if (field in notifications) {
        filteredNotifications[field] = Boolean(notifications[field]);
      }
    }

    if (Object.keys(filteredNotifications).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one notification field is required'
      });
    }

    // Ottieni notifiche attuali
    const user = await getUser(chatId);
    const currentNotifications = user.notifications || {};

    // Merge con nuovi valori
    const updatedNotifications = {
      ...currentNotifications,
      ...filteredNotifications
    };

    // Aggiorna utente
    const updatedUser = await updateUser(chatId, {
      notifications: updatedNotifications
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications updated successfully',
      notifications: updatedUser.notifications
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// ===== CRON ENABLED =====
async function handleCronEnabled(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId;
    const { cronEnabled } = req.body;

    // Validazione
    if (typeof cronEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'cronEnabled must be a boolean'
      });
    }

    // Aggiorna utente
    const updatedUser = await updateUser(chatId, { cronEnabled });

    return res.status(200).json({
      success: true,
      message: 'User monitoring settings updated successfully',
      cronEnabled: updatedUser.cronEnabled
    });

  } catch (error) {
    console.error('Error updating user cron settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// ===== VARIATIONS =====
async function handleVariations(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chatId = req.user.chatId;
    const { page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const result = await getVariationHistory(chatId, pageNum, limitNum);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error fetching variations:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default handler;
