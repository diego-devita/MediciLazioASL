import { requireAdmin } from '../../lib/auth.js';
import { connectToDatabase } from '../../lib/database.js';
import { DATABASE } from '../../lib/config.js';

async function handler(req, res) {
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
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();

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
        size: stats.dataSize,
        collections: collections.map(c => ({
          name: c.name,
          type: c.type
        }))
      },
      environment: {
        region: process.env.VERCEL_REGION || 'unknown',
        env: process.env.VERCEL_ENV || 'unknown'
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

export default requireAdmin(handler);
