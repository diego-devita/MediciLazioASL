import { requireAdmin } from '../lib/auth.js';
import { connectToDatabase, getAllSessions, deleteSession, deleteUserSessions, getSystemSettings, updateSystemSettings, getCronLogs, getCronStats } from '../lib/database.js';
import { DATABASE, LOGGING } from '../lib/config.js';

export const config = {
  api: {
    bodyParser: true
  }
};

async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔸 OPTIONS request received');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const { action } = req.query;

  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'Missing action parameter. Use ?action=stats|users|sessions|login-attempts|cron-logs|cron-logs-get|system-settings|collection'
    });
  }

  switch (action) {
    case 'stats':
      return handleStats(req, res);
    case 'users':
      return handleUsers(req, res);
    case 'toggle-user-cron':
      return handleToggleUserCron(req, res);
    case 'sessions':
      return handleSessions(req, res);
    case 'login-attempts':
      return handleLoginAttempts(req, res);
    case 'cron-logs':
      return handleCronLogs(req, res);
    case 'cron-logs-get':
      return handleCronLogsGet(req, res);
    case 'system-settings':
      return handleSystemSettings(req, res);
    case 'init-system-settings':
      return handleInitSystemSettings(req, res);
    case 'init-counters':
      return handleInitCounters(req, res);
    case 'trigger-cron':
      return handleTriggerCron(req, res);
    case 'collection':
      return handleCollection(req, res);
    default:
      return res.status(400).json({
        success: false,
        error: `Unknown action: ${action}`
      });
  }
}

// ===== STATS =====
async function handleStats(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();

    // Collection references
    const usersCollection = db.collection(DATABASE.COLLECTIONS.USERS);
    const loginAttemptsCollection = db.collection(DATABASE.COLLECTIONS.LOGIN_ATTEMPTS);

    // Users stats
    const totalUsers = await usersCollection.countDocuments();

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await usersCollection.countDocuments({
      createdAt: { $gte: sevenDaysAgo.toISOString() }
    });

    // Login attempts stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalLoginAttempts = await loginAttemptsCollection.countDocuments({
      timestamp: { $gte: thirtyDaysAgo }
    });

    const successfulLogins = await loginAttemptsCollection.countDocuments({
      timestamp: { $gte: thirtyDaysAgo },
      success: true
    });

    const failedLogins = await loginAttemptsCollection.countDocuments({
      timestamp: { $gte: thirtyDaysAgo },
      success: false
    });

    const blockedAttempts = await loginAttemptsCollection.countDocuments({
      timestamp: { $gte: thirtyDaysAgo },
      blocked: true
    });

    // Top failed IPs (last 30 days)
    const topFailedIPs = await loginAttemptsCollection.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          success: false
        }
      },
      {
        $group: {
          _id: '$ip',
          count: { $sum: 1 },
          lastAttempt: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          ip: '$_id',
          count: 1,
          lastAttempt: 1,
          _id: 0
        }
      }
    ]).toArray();

    // Login attempts by day (last 7 days)
    const loginsByDay = await loginAttemptsCollection.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: ['$success', 1, 0] }
          },
          failed: {
            $sum: { $cond: ['$success', 0, 1] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          total: 1,
          successful: 1,
          failed: 1,
          _id: 0
        }
      }
    ]).toArray();

    // Database info
    let dbStats = { dataSize: 0, storageSize: 0, indexes: 0 };
    try {
      dbStats = await db.command({ dbStats: 1 });
    } catch (err) {
      console.error('Error getting db stats:', err);
    }

    const collectionsList = await db.listCollections().toArray();

    // Get detailed stats for each collection
    const collectionsWithStats = await Promise.all(
      collectionsList.map(async (c) => {
        const collection = db.collection(c.name);

        // Count e indexes sono affidabili, stats() può fallire
        let count = 0;
        let indexes = [];
        let size = 0;
        let storageSize = 0;

        try {
          count = await collection.countDocuments();
        } catch (err) {
          console.error(`Error counting documents for ${c.name}:`, err);
        }

        try {
          indexes = await collection.indexes();
        } catch (err) {
          console.error(`Error getting indexes for ${c.name}:`, err);
        }

        try {
          const collStats = await db.command({ collStats: c.name });
          size = collStats.size || 0;
          storageSize = collStats.storageSize || 0;
        } catch (err) {
          console.error(`Error getting stats for ${c.name}:`, err);
          // Non è critico se stats() fallisce
        }

        return {
          name: c.name,
          type: c.type,
          count,
          size,
          storageSize,
          indexCount: indexes.length,
          indexes: indexes.map(idx => ({
            name: idx.name,
            keys: idx.key
          }))
        };
      })
    );

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      users: {
        total: totalUsers,
        recentNew: recentUsers
      },
      loginAttempts: {
        total: totalLoginAttempts,
        successful: successfulLogins,
        failed: failedLogins,
        blocked: blockedAttempts,
        topFailedIPs,
        byDay: loginsByDay
      },
      database: {
        name: DATABASE.NAME,
        size: dbStats.dataSize || 0,
        storageSize: dbStats.storageSize || 0,
        indexSize: dbStats.indexSize || 0,
        collections: collectionsWithStats
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
}

// ===== USERS =====
async function handleUsers(req, res) {
  if (req.method === 'GET') {
    return handleGetUsers(req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteUser(req, res);
  } else if (req.method === 'PATCH') {
    return handleUpdateUser(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetUsers(req, res) {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection(DATABASE.COLLECTIONS.USERS);

    // Query params per paginazione e filtri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Filtri opzionali (nessuno per ora)
    const filter = {};

    // Sort (default: più recenti prima)
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // Query
    const total = await usersCollection.countDocuments(filter);
    const users = await usersCollection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
}

async function handleDeleteUser(req, res) {
  try {
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chatId is required'
      });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection(DATABASE.COLLECTIONS.USERS);

    const result = await usersCollection.deleteOne({ chatId: String(chatId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Revoca tutte le sessioni dell'utente
    const deletedSessions = await deleteUserSessions(chatId);

    // Cancella tutte le entry nella storia variazioni dell'utente
    const variationsCollection = db.collection(DATABASE.COLLECTIONS.VARIATIONS_HISTORY);
    const deletedVariations = await variationsCollection.deleteMany({ chatId: String(chatId) });

    console.log(`Deleted user ${chatId}, revoked ${deletedSessions} session(s), and deleted ${deletedVariations.deletedCount} variation history entries`);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      chatId,
      sessionsRevoked: deletedSessions,
      variationsDeleted: deletedVariations.deletedCount
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
}

async function handleToggleUserCron(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chatId is required'
      });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection(DATABASE.COLLECTIONS.USERS);

    // Leggi l'utente
    const user = await usersCollection.findOne({ chatId: String(chatId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Toggle del valore
    const newCronEnabled = !user.cronEnabled;

    // Aggiorna
    await usersCollection.updateOne(
      { chatId: String(chatId) },
      { $set: { cronEnabled: newCronEnabled } }
    );

    return res.status(200).json({
      success: true,
      chatId,
      cronEnabled: newCronEnabled,
      message: `Monitoring ${newCronEnabled ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('Error toggling user cron:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle monitoring'
    });
  }
}

// ===== SESSIONS =====
async function handleSessions(req, res) {
  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const result = await getAllSessions(pageNum, limitNum);

      return res.status(200).json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { tokenHash, chatId } = req.query;

      if (!tokenHash && !chatId) {
        return res.status(400).json({
          success: false,
          error: 'Provide either tokenHash or chatId query parameter'
        });
      }

      if (tokenHash) {
        // Revoca sessione specifica
        const deleted = await deleteSession(tokenHash);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: 'Session not found'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Session revoked successfully'
        });
      }

      if (chatId) {
        // Revoca tutte le sessioni dell'utente
        const deletedCount = await deleteUserSessions(chatId);

        return res.status(200).json({
          success: true,
          message: `Revoked ${deletedCount} session(s)`,
          deletedCount
        });
      }

    } catch (error) {
      console.error('Error deleting session:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete session'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ===== LOGIN ATTEMPTS =====
async function handleLoginAttempts(req, res) {
  if (req.method === 'GET') {
    return handleGetLoginAttempts(req, res);
  } else if (req.method === 'DELETE') {
    return handleCleanupOldAttempts(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetLoginAttempts(req, res) {
  try {
    const { db } = await connectToDatabase();
    const loginAttemptsCollection = db.collection(DATABASE.COLLECTIONS.LOGIN_ATTEMPTS);

    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Filtri
    const filter = {};

    // Filtro successo
    if (req.query.success === 'true') {
      filter.success = true;
    } else if (req.query.success === 'false') {
      filter.success = false;
    }

    // Filtro bloccati
    if (req.query.blocked === 'true') {
      filter.blocked = true;
    }

    // Filtro IP
    if (req.query.ip) {
      filter.ip = req.query.ip;
    }

    // Filtro data (ultimi N giorni)
    if (req.query.days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(req.query.days));
      filter.timestamp = { $gte: daysAgo };
    }

    // Sort (più recenti prima)
    const sort = { timestamp: -1 };

    // Query
    const total = await loginAttemptsCollection.countDocuments(filter);
    const attempts = await loginAttemptsCollection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      attempts
    });

  } catch (error) {
    console.error('Error fetching login attempts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch login attempts'
    });
  }
}

async function handleCleanupOldAttempts(req, res) {
  try {
    const { db } = await connectToDatabase();
    const loginAttemptsCollection = db.collection(DATABASE.COLLECTIONS.LOGIN_ATTEMPTS);

    // Elimina tentativi più vecchi di RETENTION_DAYS (default: 90 giorni)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - LOGGING.RETENTION_DAYS);

    const result = await loginAttemptsCollection.deleteMany({
      timestamp: { $lt: retentionDate }
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old login attempts`,
      deletedCount: result.deletedCount,
      olderThan: retentionDate.toISOString()
    });

  } catch (error) {
    console.error('Error cleaning up login attempts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cleanup login attempts'
    });
  }
}

// ===== CRON LOGS =====
async function handleCronLogs(req, res) {
  if (req.method === 'DELETE') {
    return handleCleanupCronLogs(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCleanupCronLogs(req, res) {
  try {
    const { db } = await connectToDatabase();
    const cronLogsCollection = db.collection(DATABASE.COLLECTIONS.CRON_LOGS);

    // Elimina log più vecchi di RETENTION_DAYS (default: 90 giorni)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - LOGGING.RETENTION_DAYS);

    const result = await cronLogsCollection.deleteMany({
      timestamp: { $lt: retentionDate }
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old cron logs`,
      deletedCount: result.deletedCount,
      olderThan: retentionDate.toISOString()
    });

  } catch (error) {
    console.error('Error cleaning up cron logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cleanup cron logs'
    });
  }
}

// ===== COLLECTION =====
async function handleCollection(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, page = '1', limit = '50' } = req.query;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Collection name is required'
    });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(name);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Count total documents
    const total = await collection.countDocuments();
    const totalPages = Math.ceil(total / limitNum);

    // Get documents
    const documents = await collection
      .find({})
      .skip(skip)
      .limit(limitNum)
      .toArray();

    return res.status(200).json({
      success: true,
      collection: name,
      documents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching collection:', error);
    return res.status(500).json({
      success: false,
      error: `Failed to fetch collection: ${error.message}`
    });
  }
}

// ===== CRON LOGS GET =====
async function handleCronLogsGet(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stats, page = '1', limit = '50' } = req.query;

    // Se richiede statistiche
    if (stats === 'true') {
      const cronStats = await getCronStats();
      return res.status(200).json({
        success: true,
        stats: cronStats
      });
    }

    // Altrimenti ritorna i log con paginazione
    const result = await getCronLogs(parseInt(page), parseInt(limit));

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error fetching cron logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// ===== SYSTEM SETTINGS =====
async function handleSystemSettings(req, res) {
  if (req.method === 'GET') {
    // GET: Ottieni le impostazioni di sistema
    try {
      const settings = await getSystemSettings();

      return res.status(200).json({
        success: true,
        settings: settings
      });

    } catch (error) {
      console.error('Error getting system settings:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }

  } else if (req.method === 'POST') {
    // POST: Aggiorna le impostazioni di sistema
    try {
      const updates = req.body;

      // Validazione: accetta solo cronEnabled per ora
      const allowedFields = ['cronEnabled'];
      const filteredUpdates = {};

      for (const field of allowedFields) {
        if (field in updates) {
          filteredUpdates[field] = updates[field];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      const success = await updateSystemSettings(filteredUpdates);

      if (!success) {
        throw new Error('Failed to update system settings');
      }

      return res.status(200).json({
        success: true,
        message: 'System settings updated successfully'
      });

    } catch (error) {
      console.error('Error updating system settings:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }

  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
  }
}

// ===== INIT SYSTEM SETTINGS =====
async function handleInitSystemSettings(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const settingsCollection = db.collection(DATABASE.COLLECTIONS.SYSTEM_SETTINGS);

    // Controlla se esiste già
    const existing = await settingsCollection.findOne({ _id: 'global' });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: '✅ System settings già esistente',
        alreadyExists: true,
        data: existing
      });
    }

    // Crea il documento
    const now = new Date().toISOString();
    const systemSettings = {
      _id: 'global',
      cronEnabled: true,
      createdAt: now,
      updatedAt: now
    };

    await settingsCollection.insertOne(systemSettings);

    console.log('✅ System settings initialized');

    return res.status(200).json({
      success: true,
      message: '✅ System settings inizializzato con successo',
      alreadyExists: false,
      data: systemSettings
    });

  } catch (error) {
    console.error('Error initializing system_settings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize system_settings'
    });
  }
}

// ===== INIT COUNTERS =====
async function handleInitCounters(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const countersCollection = db.collection('counters');

    // Controlla se esiste già
    const existing = await countersCollection.findOne({ _id: 'variation_runs' });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: '✅ Counter variation_runs già esistente',
        alreadyExists: true,
        data: existing
      });
    }

    // Crea il counter
    const counter = {
      _id: 'variation_runs',
      sequence: 0
    };

    await countersCollection.insertOne(counter);

    console.log('✅ Counter variation_runs initialized');

    return res.status(200).json({
      success: true,
      message: '✅ Counter variation_runs inizializzato con successo',
      alreadyExists: false,
      data: counter
    });

  } catch (error) {
    console.error('Error initializing counters:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize counters'
    });
  }
}

// ===== TRIGGER CRON MANUALLY =====
async function handleTriggerCron(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cronSecret = process.env.CRON_SECRET_KEY;

    if (!cronSecret) {
      return res.status(500).json({
        success: false,
        error: 'CRON_SECRET_KEY not configured on server'
      });
    }

    console.log('🔧 Admin triggering cron manually...');

    // Chiama l'endpoint /api/cron con il secret
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = req.headers.host || 'localhost:3000';
    const cronUrl = `${protocol}://${host}/api/cron`;

    const response = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'X-Cron-Key': cronSecret,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Cron execution failed');
    }

    console.log('✅ Cron triggered successfully:', data);

    // Mappa i campi dal formato cron al formato admin
    return res.status(200).json({
      success: true,
      message: 'Cron job eseguito con successo',
      usersChecked: data.checked,
      usersSuccessful: data.successful,
      usersErrors: data.errors,
      duration: data.duration || 0,
      skipped: data.skipped
    });

  } catch (error) {
    console.error('Error triggering cron:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger cron'
    });
  }
}

export default requireAdmin(handler);
