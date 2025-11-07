import { verifyJWT } from '../../lib/auth.js';
import { connectToDatabase } from '../../lib/database.js';
import { DATABASE, LOGGING } from '../../lib/config.js';

export default async function handler(req, res) {
  // Verifica JWT
  const decoded = verifyJWT(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
