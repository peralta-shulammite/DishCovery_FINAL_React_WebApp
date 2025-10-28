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
 * ✅ Universal safeQuery
 * Works on both localhost (phpMyAdmin) and Aiven cloud (mysql2/promise).
 */
async function safeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    // Convert RowDataPackets → plain objects
    const rows = JSON.parse(JSON.stringify(result));

    if (rows.length) {
      console.log(`✅ DB: ${rows.length} row(s) returned.`);
    } else {
      console.log(`⚠️ DB: No rows found for query.`);
    }

    return rows;
  } catch (error) {
    console.error('❌ safeQuery error:', error.message);
    return [];
  }
}

/**
 * ✅ Match detected ingredient to database
 * Uses exact match first, then fuzzy match (LIKE).
 */
async function matchIngredientToDatabase(ingredientName) {
  try {
    const lowerName = ingredientName.toLowerCase().trim();
    console.log(`🔎 Searching for ingredient → "${ingredientName}"`);

    // 1️⃣ Exact match
    const exactRows = await safeQuery(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) = ?',
      [lowerName]
    );

    if (exactRows.length > 0) {
      const ing = exactRows[0];
      console.log(`✅ Match → "${ingredientName}" = "${ing.ingredient_name}" (ID: ${ing.ingredient_id})`);
      return {
        id: ing.ingredient_id,
        name: ing.ingredient_name,
        matched: true
      };
    }

    // 2️⃣ Fuzzy match (LIKE)
    const fuzzyRows = await safeQuery(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) LIKE ?',
      [`%${lowerName}%`]
    );

    if (fuzzyRows.length > 0) {
      const ing = fuzzyRows[0];
      console.log(`🟡 Fuzzy match → "${ingredientName}" ≈ "${ing.ingredient_name}" (ID: ${ing.ingredient_id})`);
      return {
        id: ing.ingredient_id,
        name: ing.ingredient_name,
        matched: true
      };
    }

    console.log(`❌ No match found for "${ingredientName}"`);
    return {
      id: null,
      name: ingredientName,
      matched: false
    };
  } catch (error) {
    console.error(`❌ Error matching "${ingredientName}":`, error.message);
    return {
      id: null,
      name: ingredientName,
      matched: false
    };
  }
}

/**
 * ✅ POST /api/scan
 * Main route: detects ingredients with YOLO, then matches to database.
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

    // Step 3️⃣ Match detections to DB
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

    console.log(`✅ Matched ${matched.length} ingredient(s) to database`);
    if (unmatched.length > 0) {
      console.log(`⚠️ ${unmatched.length} not found: ${unmatched.map(u => `"${u.original_detection}"`).join(', ')}`);
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
 * ✅ Health check route for YOLO detection service
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
