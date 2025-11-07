import { requireAdmin } from '../../lib/auth.js';
import { connectToDatabase } from '../../lib/database.js';
import { DATABASE } from '../../lib/config.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetUsers(req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteUser(req, res);
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

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      chatId
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
}

export default requireAdmin(handler);
