import { kv } from '@vercel/kv';

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
    const user = await kv.get(`user:${chatId}`);
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
      cognomi: ['ROSSI', 'BIANCHI'], // Default
      asl: '120202', // Roma 2
      tipo: 'MMG' // Medicina generale
    },
    lastResults: [],
    lastCheck: null,
    createdAt: new Date().toISOString()
  };

  try {
    await kv.set(`user:${chatId}`, user);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUser(chatId, updates) {
  try {
    const user = await getUser(chatId);
    if (!user) return null;

    const updatedUser = { ...user, ...updates };
    await kv.set(`user:${chatId}`, updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function updateUserQuery(chatId, queryUpdates) {
  try {
    const user = await getUser(chatId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      query: { ...user.query, ...queryUpdates }
    };

    await kv.set(`user:${chatId}`, updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Error updating user query:', error);
    return null;
  }
}

export async function saveResults(chatId, results) {
  try {
    const user = await getUser(chatId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      lastResults: results,
      lastCheck: new Date().toISOString()
    };

    await kv.set(`user:${chatId}`, updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Error saving results:', error);
    return null;
  }
}

export async function getAllSubscribedUsers() {
  try {
    // Scan all user keys
    const keys = [];
    let cursor = 0;

    do {
      const result = await kv.scan(cursor, { match: 'user:*', count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== 0);

    // Get all users
    const users = [];
    for (const key of keys) {
      const user = await kv.get(key);
      if (user && user.subscribed) {
        users.push(user);
      }
    }

    return users;
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
