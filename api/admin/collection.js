import { requireAdmin } from '../../lib/auth.js';
import { connectToDatabase } from '../../lib/database.js';

async function handler(req, res) {
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

export default requireAdmin(handler);
