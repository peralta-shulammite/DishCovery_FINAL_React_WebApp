import express from 'express';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const DETECTION_API_URL = process.env.YOLO_API_URL || 'http://localhost:8000/detect';

/**
 * ✅ Safe query wrapper (fully compatible with Aiven + localhost)
 */
async function safeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);

    // 💥 Force log the raw structure Aiven returns
    console.log('🧠 FULL result from MySQL:', JSON.stringify(result, null, 2));

    let rows;
    if (Array.isArray(result) && Array.isArray(result[0])) {
      rows = result[0];
    } else if (Array.isArray(result)) {
      rows = result;
    } else {
      rows = [result];
    }

    console.log('🧠 EXTRACTED rows:', JSON.stringify(rows, null, 2));
    return rows;
  } catch (error) {
    console.error('❌ safeQuery error:', error.message);
    return [];
  }
}


/**
 * ✅ Match ingredient to database
 */
async function matchIngredientToDatabase(ingredientName) {
  try {
    // Exact match
    const exactRows = await safeQuery(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) = LOWER(?)',
      [ingredientName]
    );

    if (exactRows.length > 0) {
      console.log(`✅ Exact match: "${ingredientName}" → ${exactRows[0].ingredient_name} (ID ${exactRows[0].ingredient_id})`);
      return {
        id: exactRows[0].ingredient_id,
        name: exactRows[0].ingredient_name,
        matched: true,
      };
    }

    // Fuzzy match
    const fuzzyRows = await safeQuery(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) LIKE LOWER(?)',
      [`%${ingredientName}%`]
    );

    if (fuzzyRows.length > 0) {
      console.log(`✅ Fuzzy match: "${ingredientName}" → ${fuzzyRows[0].ingredient_name} (ID ${fuzzyRows[0].ingredient_id})`);
      return {
        id: fuzzyRows[0].ingredient_id,
        name: fuzzyRows[0].ingredient_name,
        matched: true,
      };
    }

    console.warn(`⚠️ No match for "${ingredientName}"`);
    return { id: null, name: ingredientName, matched: false };
  } catch (error) {
    console.error('❌ matchIngredientToDatabase error:', error.message);
    return { id: null, name: ingredientName, matched: false };
  }
}

/**
 * ✅ POST /api/scan
 */
router.post('/', upload.single('image'), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    tempFilePath = req.file.path;
    console.log(`📸 Received image: ${req.file.originalname} (${req.file.size} bytes)`);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    console.log(`🔄 Sending to YOLO API: ${DETECTION_API_URL}`);

    const response = await axios.post(DETECTION_API_URL, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 120000,
    });

    console.log(`✅ Detection complete: ${response.data.num_detections} ingredients found`);

    // Match detected ingredients
    const detectionsWithIds = await Promise.all(
      response.data.detections.map(async (det) => {
        const dbMatch = await matchIngredientToDatabase(det.class_name);
        return {
          ...det,
          ingredient_id: dbMatch.id,
          ingredient_name: dbMatch.name,
          db_matched: dbMatch.matched,
          original_detection: det.class_name,
        };
      })
    );

    const matched = detectionsWithIds.filter((d) => d.db_matched);
    const unmatched = detectionsWithIds.filter((d) => !d.db_matched);

    console.log(`✅ Matched ${matched.length} ingredient(s)`);
    if (unmatched.length > 0)
      console.warn(`⚠️ Unmatched:`, unmatched.map((u) => u.original_detection));

    res.json({
      success: true,
      device: response.data.device,
      total_detections: response.data.num_detections,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      detections: detectionsWithIds,
      matched_ingredients: matched,
      unmatched_ingredients: unmatched,
    });
  } catch (error) {
    console.error('❌ Detection error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data?.detail || 'Detection service error',
      });
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Detection service unavailable',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️  Cleaned up temp file');
    }
  }
});

/**
 * ✅ GET /api/scan/health
 */
router.get('/health', async (req, res) => {
  try {
    const healthUrl = DETECTION_API_URL.replace('/detect', '/health');
    const response = await axios.get(healthUrl, { timeout: 5000 });
    res.json({ success: true, detection_service: response.data });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Detection service unavailable',
      details: error.message,
    });
  }
});

/**
 * ✅ GET /api/scan/history - Get user's scan history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // Get user ID from auth token (assumes authenticateToken middleware)
    const userId = req.user?.userId || req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    const { limit = 10 } = req.query;

    console.log(`🔍 Fetching scan history for user ${userId}`);

    // Query to get user's recent scans with ingredient details
    const scanHistory = await safeQuery(`
      SELECT 
        usi.scan_id,
        usi.scanned_at,
        i.ingredient_id,
        i.ingredient_name,
        i.category
      FROM user_scanned_ingredients usi
      LEFT JOIN ingredients i ON usi.ingredient_id = i.ingredient_id
      WHERE usi.user_id = ?
      ORDER BY usi.scanned_at DESC
      LIMIT ?
    `, [userId, parseInt(limit)]);

    // Group by scan session (by date/time proximity)
    const groupedScans = [];
    let currentGroup = null;
    
    scanHistory.forEach(scan => {
      const scanDate = new Date(scan.scanned_at);
      
      // Create new group if no current group or time gap > 5 minutes
      if (!currentGroup || 
          (scanDate - new Date(currentGroup.date)) > 5 * 60 * 1000) {
        currentGroup = {
          id: scan.scan_id || `scan_${scanDate.getTime()}`,
          date: scanDate.toISOString(),
          ingredients: []
        };
        groupedScans.push(currentGroup);
      }
      
      if (scan.ingredient_name) {
        currentGroup.ingredients.push({
          id: scan.ingredient_id,
          name: scan.ingredient_name,
          category: scan.category
        });
      }
    });

    console.log(`✅ Found ${groupedScans.length} scan sessions for user ${userId}`);

    res.json({
      success: true,
      data: groupedScans,
      count: groupedScans.length
    });

  } catch (error) {
    console.error('❌ Error fetching scan history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scan history',
      details: error.message
    });
  }
});

/**
 * ✅ DELETE /api/scan/history/:scanId - Delete a scan from history
 */
router.delete('/history/:scanId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { scanId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    console.log(`🗑️  Deleting scan ${scanId} for user ${userId}`);

    await safeQuery(`
      DELETE FROM user_scanned_ingredients 
      WHERE user_id = ? AND scan_id = ?
    `, [userId, scanId]);

    res.json({
      success: true,
      message: 'Scan deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting scan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete scan',
      details: error.message
    });
  }
});

export default router;