import { MongoClient } from 'mongodb';
import { DATABASE, RATE_LIMIT } from './config.js';

// ===== MONGODB CONNECTION =====

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db(DATABASE.NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function getUsersCollection() {
  const { db } = await connectToDatabase();
  return db.collection(DATABASE.COLLECTIONS.USERS);
}

async function getLoginAttemptsCollection() {
  const { db } = await connectToDatabase();
  return db.collection(DATABASE.COLLECTIONS.LOGIN_ATTEMPTS);
}

/**
 * Logga un tentativo di login
 * @param {Object} attemptData - Dati del tentativo (ip, success, blocked, username, userAgent)
 */
export async function logLoginAttempt(attemptData) {
  try {
    const loginAttempts = await getLoginAttemptsCollection();

    const attempt = {
      timestamp: new Date(),
      ip: attemptData.ip || 'unknown',
      success: attemptData.success || false,
      blocked: attemptData.blocked || false,
      username: attemptData.username || null,
      userAgent: attemptData.userAgent || 'unknown'
    };

    await loginAttempts.insertOne(attempt);
    console.log(`Login attempt logged: ${attempt.ip} - ${attempt.success ? 'success' : 'failed'}${attempt.blocked ? ' (BLOCKED)' : ''}`);
  } catch (error) {
    console.error('Error logging login attempt:', error);
    // Non bloccare il flusso se il logging fallisce
  }
}

/**
 * Controlla se un IP è bloccato per rate limiting
 * @param {string} ip - L'indirizzo IP da controllare
 * @returns {Promise<{isBlocked: boolean, attemptsCount: number, nextAttemptAllowed: Date|null}>}
 */
export async function checkRateLimit(ip) {
  try {
    const loginAttempts = await getLoginAttemptsCollection();

    // Calcola la finestra temporale (ultimi 15 minuti)
    const windowStart = new Date(Date.now() - RATE_LIMIT.LOGIN_WINDOW_MS);

    // Conta i tentativi falliti nell'ultima finestra
    const failedAttempts = await loginAttempts.countDocuments({
      ip: ip,
      success: false,
      timestamp: { $gte: windowStart }
    });

    // Se ha superato il limite, è bloccato
    const isBlocked = failedAttempts >= RATE_LIMIT.MAX_LOGIN_ATTEMPTS;

    // Calcola quando può riprovare (se bloccato)
    let nextAttemptAllowed = null;
    if (isBlocked) {
      // Trova il primo tentativo fallito nella finestra
      const firstAttempt = await loginAttempts.findOne(
        {
          ip: ip,
          success: false,
          timestamp: { $gte: windowStart }
        },
        { sort: { timestamp: 1 } }
      );

      if (firstAttempt) {
        // Può riprovare dopo BLOCK_DURATION_MS dal primo tentativo
        nextAttemptAllowed = new Date(firstAttempt.timestamp.getTime() + RATE_LIMIT.BLOCK_DURATION_MS);
      }
    }

    return {
      isBlocked,
      attemptsCount: failedAttempts,
      nextAttemptAllowed
    };

  } catch (error) {
    console.error('Error checking rate limit:', error);
    // In caso di errore, non bloccare (fail-open per evitare lockout ingiustificati)
    return {
      isBlocked: false,
      attemptsCount: 0,
      nextAttemptAllowed: null
    };
  }
}

export { connectToDatabase, getLoginAttemptsCollection };

// ===== SYSTEM SETTINGS =====

/**
 * Ottiene i system settings globali
 * @returns {Promise<Object>} System settings
 */
export async function getSystemSettings() {
  try {
    const { db } = await connectToDatabase();
    const settingsCollection = db.collection(DATABASE.COLLECTIONS.SYSTEM_SETTINGS);

    let settings = await settingsCollection.findOne({ _id: 'global' });

    // Se non esiste, crea i settings di default
    if (!settings) {
      settings = {
        _id: 'global',
        cronEnabled: true,
        jwtExpiryDays: 30, // Default: 30 giorni
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await settingsCollection.insertOne(settings);
    }

    // Assicura che jwtExpiryDays esista (per retrocompatibilità)
    if (!settings.jwtExpiryDays) {
      settings.jwtExpiryDays = 30;
    }

    return settings;
  } catch (error) {
    console.error('Error getting system settings:', error);
    // In caso di errore, ritorna default
    return { cronEnabled: true, jwtExpiryDays: 30 };
  }
}

/**
 * Aggiorna i system settings globali
 * @param {Object} updates - Campi da aggiornare
 * @returns {Promise<boolean>} Success
 */
export async function updateSystemSettings(updates) {
  try {
    const { db } = await connectToDatabase();
    const settingsCollection = db.collection(DATABASE.COLLECTIONS.SYSTEM_SETTINGS);

    const result = await settingsCollection.updateOne(
      { _id: 'global' },
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    return result.acknowledged;
  } catch (error) {
    console.error('Error updating system settings:', error);
    return false;
  }
}

// ===== USER STATE MANAGEMENT =====

/**
 * User state structure:
 * {
 *   chatId: string,
 *   username: string,
 *   subscribed: boolean,
 *   query: {
 *     cognomi: string[],
 *     asl: string,
 *     tipo: string
 *   },
 *   lastResults: array,
 *   lastCheck: string (ISO date),
 *   createdAt: string (ISO date)
 * }
 */

export async function getUser(chatId) {
  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ chatId: String(chatId) });
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function createUser(chatId, username = null) {
  // Controlla se l'utente è admin tramite environment variable
  const adminChatIds = (process.env.ADMIN_CHAT_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  const isAdmin = adminChatIds.includes(String(chatId));

  const user = {
    chatId: String(chatId),
    username,
    role: isAdmin ? 'admin' : 'user', // Ruolo basato su ADMIN_CHAT_IDS
    query: {
      cognomi: [] // Lista vuota all'inizio
    },
    minIntervalMinutes: 30, // Intervallo minimo tra interrogazioni (default 30 minuti)
    cronEnabled: true, // Monitoraggio automatico abilitato per l'utente
    notifications: {
      searchCompleted: true,   // Notifica "Ricerca terminata"
      newDoctors: true,         // Notifica "Nuovi medici"
      removedDoctors: true,     // Notifica "Medici rimossi"
      statusChanged: true       // Notifica "Stato cambiato"
    },
    lastResults: [],
    lastCheck: null,
    lastSuccessfulContact: new Date().toISOString(), // Ultimo messaggio riuscito
    firstFailedAttempt: null, // Primo tentativo fallito (403)
    webAuthToken: null, // Token per login web
    webAuthTokenCreatedAt: null, // Timestamp creazione token
    webAuthTokenUsed: false, // Se il token è già stato usato
    createdAt: new Date().toISOString()
  };

  try {
    const users = await getUsersCollection();
    await users.insertOne(user);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUser(chatId, updates) {
  try {
    const users = await getUsersCollection();
    const result = await users.findOneAndUpdate(
      { chatId: String(chatId) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    console.log('updateUser result for', chatId, ':', JSON.stringify(result, null, 2));
    // MongoDB findOneAndUpdate può ritornare { value: document } oppure direttamente il documento
    // Ritorniamo il documento effettivo
    return result?.value || result;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function updateUserQuery(chatId, queryUpdates) {
  try {
    const users = await getUsersCollection();
    const user = await getUser(chatId);
    if (!user) return null;

    const updatedQuery = { ...user.query, ...queryUpdates };

    const result = await users.findOneAndUpdate(
      { chatId: String(chatId) },
      { $set: { query: updatedQuery } },
      { returnDocument: 'after' }
    );
    return result?.value || result;
  } catch (error) {
    console.error('Error updating user query:', error);
    return null;
  }
}

export async function saveResults(chatId, results, differences = null) {
  try {
    const users = await getUsersCollection();
    const updateData = {
      lastResults: results,
      lastCheck: new Date().toISOString()
    };

    // Se ci sono differenze, salvale
    if (differences) {
      updateData.lastDifferences = differences;
    }

    const result = await users.findOneAndUpdate(
      { chatId: String(chatId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result?.value || result;
  } catch (error) {
    console.error('Error saving results:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    const users = await getUsersCollection();
    const allUsers = await users.find({}).toArray();
    return allUsers;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

export async function markSuccessfulContact(chatId) {
  try {
    const users = await getUsersCollection();
    await users.updateOne(
      { chatId: String(chatId) },
      {
        $set: {
          lastSuccessfulContact: new Date().toISOString(),
          firstFailedAttempt: null // Reset fallimenti
        }
      }
    );
  } catch (error) {
    console.error('Error marking successful contact:', error);
  }
}

export async function markFailedContact(chatId) {
  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ chatId: String(chatId) });

    if (!user) return;

    // Se è il primo fallimento, setta il timestamp
    if (!user.firstFailedAttempt) {
      await users.updateOne(
        { chatId: String(chatId) },
        {
          $set: {
            firstFailedAttempt: new Date().toISOString()
          }
        }
      );
      console.log(`User ${chatId} - first failed attempt recorded`);
    } else {
      // Calcola giorni passati dal primo fallimento
      const firstFailed = new Date(user.firstFailedAttempt);
      const now = new Date();
      const daysPassed = (now - firstFailed) / (1000 * 60 * 60 * 24);

      console.log(`User ${chatId} - failed for ${daysPassed.toFixed(1)} days`);

      // Se >= 3 giorni, cancella utente
      if (daysPassed >= 3) {
        await users.deleteOne({ chatId: String(chatId) });
        console.log(`User ${chatId} - DELETED after ${daysPassed.toFixed(1)} days of failures`);
      }
    }
  } catch (error) {
    console.error('Error marking failed contact:', error);
  }
}

// ===== WEB AUTH TOKEN MANAGEMENT =====

/**
 * Genera un nuovo token web per l'utente
 * Invalida eventuali token precedenti
 * @param {string} chatId - ID della chat Telegram
 * @returns {string|null} Token generato o null in caso di errore
 */
export async function generateWebAuthToken(chatId) {
  try {
    const users = await getUsersCollection();

    // Genera OTP a 6 cifre
    const { generateOTP } = await import('./otp.js');
    const token = generateOTP();

    await users.updateOne(
      { chatId: String(chatId) },
      {
        $set: {
          webAuthToken: token,
          webAuthTokenCreatedAt: new Date().toISOString(),
          webAuthTokenUsed: false
        }
      }
    );

    console.log(`Generated web auth OTP for user ${chatId}`);
    return token;
  } catch (error) {
    console.error('Error generating web auth token:', error);
    return null;
  }
}

/**
 * Valida un token web e ritorna l'utente associato
 * @param {string} token - Token da validare
 * @returns {Object|null} User object o null se token non valido
 */
export async function validateWebAuthToken(token) {
  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ webAuthToken: token });

    if (!user) {
      console.log('Token not found');
      return null;
    }

    // Controlla se già usato
    if (user.webAuthTokenUsed) {
      console.log(`Token already used for user ${user.chatId}`);
      return null;
    }

    // Controlla scadenza (20 minuti)
    const { OTP_VALIDITY_MS } = await import('./otp.js');
    const tokenAge = Date.now() - new Date(user.webAuthTokenCreatedAt).getTime();

    if (tokenAge > OTP_VALIDITY_MS) {
      console.log(`OTP expired for user ${user.chatId} (age: ${Math.round(tokenAge / 1000 / 60)} minutes)`);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error validating web auth token:', error);
    return null;
  }
}

/**
 * Marca un token come usato
 * @param {string} token - Token da marcare
 */
export async function markWebAuthTokenAsUsed(token) {
  try {
    const users = await getUsersCollection();
    await users.updateOne(
      { webAuthToken: token },
      { $set: { webAuthTokenUsed: true } }
    );
    console.log('Token marked as used');
  } catch (error) {
    console.error('Error marking token as used:', error);
  }
}

// ===== SESSION MANAGEMENT =====

async function getSessionsCollection() {
  const { db } = await connectToDatabase();
  return db.collection(DATABASE.COLLECTIONS.SESSIONS);
}

/**
 * Session structure:
 * {
 *   token: string (JWT token - hashed for security),
 *   chatId: string,
 *   username: string,
 *   role: string,
 *   createdAt: string (ISO date),
 *   lastUsed: string (ISO date),
 *   userAgent: string (optional),
 *   ip: string (optional)
 * }
 */

/**
 * Crea una nuova sessione
 */
export async function createSession(sessionData) {
  try {
    const sessions = await getSessionsCollection();
    const session = {
      ...sessionData,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    await sessions.insertOne(session);
    console.log(`Session created for chatId: ${sessionData.chatId}`);
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Ottiene una sessione dal token
 */
export async function getSession(tokenHash) {
  try {
    const sessions = await getSessionsCollection();
    const session = await sessions.findOne({ tokenHash });
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Aggiorna ultimo utilizzo della sessione
 */
export async function updateSessionLastUsed(tokenHash) {
  try {
    const sessions = await getSessionsCollection();
    await sessions.updateOne(
      { tokenHash },
      { $set: { lastUsed: new Date().toISOString() } }
    );
  } catch (error) {
    console.error('Error updating session last used:', error);
  }
}

/**
 * Elimina una sessione specifica
 */
export async function deleteSession(tokenHash) {
  try {
    const sessions = await getSessionsCollection();
    const result = await sessions.deleteOne({ tokenHash });
    console.log(`Session deleted:`, result.deletedCount > 0);
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Elimina tutte le sessioni di un utente
 */
export async function deleteUserSessions(chatId) {
  try {
    const sessions = await getSessionsCollection();
    const result = await sessions.deleteMany({ chatId: String(chatId) });
    console.log(`Deleted ${result.deletedCount} sessions for user ${chatId}`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    return 0;
  }
}

/**
 * Ottiene tutte le sessioni attive (con paginazione)
 */
export async function getAllSessions(page = 1, limit = 50) {
  try {
    const sessions = await getSessionsCollection();
    const skip = (page - 1) * limit;

    const total = await sessions.countDocuments();
    const items = await sessions
      .find({})
      .sort({ lastUsed: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      sessions: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return { sessions: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
  }
}

/**
 * Ottiene le sessioni di un utente specifico
 */
export async function getUserSessions(chatId) {
  try {
    const sessions = await getSessionsCollection();
    const items = await sessions
      .find({ chatId: String(chatId) })
      .sort({ lastUsed: -1 })
      .toArray();
    return items;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

// ===== CRON LOGS MANAGEMENT =====

async function getCronLogsCollection() {
  const { db } = await connectToDatabase();
  return db.collection(DATABASE.COLLECTIONS.CRON_LOGS);
}

/**
 * Cron log structure:
 * {
 *   timestamp: string (ISO date),
 *   success: boolean,
 *   usersChecked: number,
 *   usersSuccessful: number,
 *   usersErrors: number,
 *   duration: number (milliseconds),
 *   error: string (optional)
 * }
 */

/**
 * Salva un log di esecuzione del cron
 */
export async function saveCronLog(logData) {
  try {
    const cronLogs = await getCronLogsCollection();
    const log = {
      timestamp: new Date().toISOString(),
      ...logData
    };
    await cronLogs.insertOne(log);
    console.log('Cron log saved:', log);
    return log;
  } catch (error) {
    console.error('Error saving cron log:', error);
    return null;
  }
}

/**
 * Ottiene i log del cron con paginazione
 */
export async function getCronLogs(page = 1, limit = 50) {
  try {
    const cronLogs = await getCronLogsCollection();
    const skip = (page - 1) * limit;

    const total = await cronLogs.countDocuments();
    const items = await cronLogs
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      logs: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting cron logs:', error);
    return { logs: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
  }
}

/**
 * Ottiene statistiche aggregate sui log del cron
 */
export async function getCronStats() {
  try {
    const cronLogs = await getCronLogsCollection();

    // Ultimi 7 giorni
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = await cronLogs
      .find({ timestamp: { $gte: sevenDaysAgo.toISOString() } })
      .toArray();

    const totalExecutions = recentLogs.length;
    const successfulExecutions = recentLogs.filter(log => log.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;

    const avgDuration = totalExecutions > 0
      ? recentLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalExecutions
      : 0;

    const lastExecution = await cronLogs
      .find({})
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgDuration: Math.round(avgDuration),
      lastExecution: lastExecution.length > 0 ? lastExecution[0] : null
    };
  } catch (error) {
    console.error('Error getting cron stats:', error);
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgDuration: 0,
      lastExecution: null
    };
  }
}

// ===== VARIATIONS HISTORY =====

/**
 * Genera il prossimo runId progressivo
 */
async function getNextRunId() {
  try {
    const { db } = await connectToDatabase();
    const counters = db.collection('counters');

    const result = await counters.findOneAndUpdate(
      { _id: 'variation_runs' },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: 'after' }
    );

    return result.sequence;
  } catch (error) {
    console.error('Error getting next runId:', error);
    return Date.now(); // Fallback a timestamp
  }
}

/**
 * Salva una history delle variazioni per un utente
 * @param {string} chatId - ID utente Telegram
 * @param {Object} variationData - Dati variazioni { queries, variations, totalResults, totalAvailable }
 */
export async function saveVariationHistory(chatId, variationData) {
  try {
    const { db } = await connectToDatabase();
    const variations = db.collection(DATABASE.COLLECTIONS.VARIATIONS_HISTORY);

    const runId = await getNextRunId();

    // Costruisci array eventi ordinato con sequence
    const events = [];
    let seq = 1;

    // Nuovi medici
    for (const medico of variationData.variations.new) {
      events.push({
        seq: seq++,
        type: 'new',
        medico
      });
    }

    // Medici rimossi
    for (const medico of variationData.variations.removed) {
      events.push({
        seq: seq++,
        type: 'removed',
        medico
      });
    }

    // Medici cambiati
    for (const item of variationData.variations.changed) {
      events.push({
        seq: seq++,
        type: 'changed',
        medico: {
          codiceFiscale: item.codiceFiscale,
          cognome: item.cognome,
          nome: item.nome,
          assegnabilita: item.statoNuovo,
          asl: item.asl
        },
        statoVecchio: item.statoVecchio,
        statoNuovo: item.statoNuovo
      });
    }

    const document = {
      runId,
      chatId: String(chatId),
      timestamp: new Date(),
      queries: variationData.queries,
      events,
      eventCount: events.length,
      totalResults: variationData.totalResults,
      totalAvailable: variationData.totalAvailable
    };

    await variations.insertOne(document);
    console.log(`Variation history saved for user ${chatId}, runId: ${runId}, events: ${events.length}`);
  } catch (error) {
    console.error('Error saving variation history:', error);
  }
}

/**
 * Ottiene la history delle variazioni per un utente
 * @param {string} chatId - ID utente Telegram
 * @param {number} limit - Numero massimo di record da recuperare
 */
export async function getVariationHistory(chatId, page = 1, limit = 50) {
  try {
    const { db } = await connectToDatabase();
    const variations = db.collection(DATABASE.COLLECTIONS.VARIATIONS_HISTORY);

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      variations
        .find({ chatId: String(chatId) })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      variations.countDocuments({ chatId: String(chatId) })
    ]);

    return {
      variations: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting variation history:', error);
    return {
      variations: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 0
    };
  }
}

/**
 * Salva un log di audit per tracciare azioni sensibili
 * @param {Object} logEntry - Dati del log { action, adminChatId, targetChatId, metadata, ipAddress }
 */
export async function saveAuditLog(logEntry) {
  try {
    const { db } = await connectToDatabase();
    const auditLogs = db.collection(DATABASE.COLLECTIONS.AUDIT_LOGS);

    const document = {
      timestamp: new Date(),
      action: logEntry.action,
      adminChatId: String(logEntry.adminChatId),
      targetChatId: logEntry.targetChatId ? String(logEntry.targetChatId) : null,
      metadata: logEntry.metadata || {},
      ipAddress: logEntry.ipAddress || null
    };

    await auditLogs.insertOne(document);
    console.log(`Audit log saved: ${logEntry.action} by ${logEntry.adminChatId}`);
  } catch (error) {
    console.error('Error saving audit log:', error);
  }
}

/**
 * Ottiene i log di audit con filtri opzionali
 * @param {Object} filters - Filtri { adminChatId, action, startDate, endDate }
 * @param {number} limit - Numero massimo di record
 */
export async function getAuditLogs(filters = {}, limit = 100) {
  try {
    const { db } = await connectToDatabase();
    const auditLogs = db.collection(DATABASE.COLLECTIONS.AUDIT_LOGS);

    const query = {};

    if (filters.adminChatId) {
      query.adminChatId = String(filters.adminChatId);
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    return await auditLogs
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
}
