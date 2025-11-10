import { MongoClient } from 'mongodb';
import { DATABASE } from './config.js';

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

export { connectToDatabase, getLoginAttemptsCollection };

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
    return result;
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
    return result;
  } catch (error) {
    console.error('Error updating user query:', error);
    return null;
  }
}

export async function saveResults(chatId, results) {
  try {
    const users = await getUsersCollection();
    const result = await users.findOneAndUpdate(
      { chatId: String(chatId) },
      {
        $set: {
          lastResults: results,
          lastCheck: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );
    return result;
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
