import express from 'express';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import pool from '../db.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const DETECTION_API_URL = process.env.YOLO_API_URL || 'http://localhost:8000/detect';

/**
 * ✅ Universal safeQuery that works on both phpMyAdmin (localhost)
 * and Aiven (mysql2/promise cloud)
 */
async function safeQuery(query, params = []) {
  try {
    console.log('🔍 Executing query:', query.length > 120 ? query.substring(0, 120) + '...' : query);
    if (params.length) console.log('📝 Parameters:', params);

    const result = await pool.query(query, params);

    // 🔧 Normalize Aiven/mysql2 RowDataPacket format
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;

    console.log(`✅ Query executed successfully. Rows: ${rows.length}`);
    return rows;
  } catch (error) {
    console.error('❌ safeQuery error:', error.message);
    return [];
  }
}

/**
 * ✅ Match detected ingredient to database
 * Works on both local and Aiven MySQL connections
 */
async function matchIngredientToDatabase(ingredientName) {
  try {
    console.log(`🔎 Matching ingredient: "${ingredientName}"`);

    // Step 1: Exact match
    const exactRows = await safeQuery(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) = LOWER(?)',
      [ingredientName]
    );

    console.log('🧩 Exact query result:', exactRows);

    if (exactRows.length > 0) {
      console.log(`✅ Exact match found for "${ingredientName}" → ID: ${exactRows[0].ingredient_id}`);
      return {
        id: exactRows[0].ingredient_id,
        name: exactRows[0].ingredient_name,
        matched: true
      };
    }

    // Step 2: Fuzzy match
    const fuzzyRows = await safeQuery(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) LIKE LOWER(?)',
      [`%${ingredientName}%`]
    );

    console.log('🧩 Fuzzy query result:', fuzzyRows);

    if (fuzzyRows.length > 0) {
      console.log(`✅ Fuzzy match found for "${ingredientName}" → ID: ${fuzzyRows[0].ingredient_id}`);
      return {
        id: fuzzyRows[0].ingredient_id,
        name: fuzzyRows[0].ingredient_name,
        matched: true
      };
    }

    console.log(`⚠️ No database match found for "${ingredientName}"`);
    return {
      id: null,
      name: ingredientName,
      matched: false
    };

  } catch (error) {
    console.error('❌ Database matching error:', error.message);
    return {
      id: null,
      name: ingredientName,
      matched: false
    };
  }
}

/**
 * ✅ Main route: /api/scan
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
      contentType: req.file.mimetype
    });

    console.log(`🔄 Sending to YOLO API: ${DETECTION_API_URL}`);

    const response = await axios.post(DETECTION_API_URL, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 120000
    });

    console.log(`✅ Detection complete: ${response.data.num_detections} ingredients found`);

    // Step 3: Match detections to DB
    const detectionsWithIds = await Promise.all(
      response.data.detections.map(async (det) => {
        const dbMatch = await matchIngredientToDatabase(det.class_name);
        return {
          ...det,
          ingredient_id: dbMatch.id,
          ingredient_name: dbMatch.name,
          db_matched: dbMatch.matched,
          original_detection: det.class_name
        };
      })
    );

    const matched = detectionsWithIds.filter(d => d.db_matched);
    const unmatched = detectionsWithIds.filter(d => !d.db_matched);

    console.log(`✅ Matched ${matched.length} ingredients to database`);
    if (unmatched.length > 0) {
      console.log(`⚠️ ${unmatched.length} not found:`, unmatched.map(u => u.original_detection));
    }

    res.json({
      success: true,
      device: response.data.device,
      total_detections: response.data.num_detections,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      detections: detectionsWithIds,
      matched_ingredients: matched,
      unmatched_ingredients: unmatched
    });

  } catch (error) {
    console.error('❌ Detection error:', error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data?.detail || 'Detection service error',
        details: error.response.data
      });
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Detection service unavailable',
        details: 'Could not connect to YOLO detection API'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️ Cleaned up temp file');
    }
  }
});

/**
 * Health check route for detection service
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
      details: error.message
    });
  }
});

export default router;