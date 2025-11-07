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
  const user = {
    chatId: String(chatId),
    username,
    subscribed: true, // Auto-subscribe al primo /start
    query: {
      cognomi: [], // Lista vuota all'inizio
      asl: '120202', // Roma 2
      tipo: 'MMG' // Medicina generale
    },
    lastResults: [],
    lastCheck: null,
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

export async function getAllSubscribedUsers() {
  try {
    const users = await getUsersCollection();
    const subscribedUsers = await users.find({ subscribed: true }).toArray();
    return subscribedUsers;
  } catch (error) {
    console.error('Error getting subscribed users:', error);
    return [];
  }
}

export async function subscribe(chatId) {
  return updateUser(chatId, { subscribed: true });
}

export async function unsubscribe(chatId) {
  return updateUser(chatId, { subscribed: false });
}
