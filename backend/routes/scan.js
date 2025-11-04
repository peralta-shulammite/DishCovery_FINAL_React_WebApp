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
<<<<<<< HEAD
 * Match ingredient name to database ID
 */
async function matchIngredientToDatabase(ingredientName) {
  try {
    // Try exact match first
    const [exactMatch] = await pool.query(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) = LOWER(?)',
      [ingredientName]
    );
    
    if (exactMatch.length > 0) {
      return {
        id: exactMatch[0].ingredient_id,
        name: exactMatch[0].ingredient_name,
        matched: true
      };
    }
    
    // Try fuzzy match (contains)
    const [fuzzyMatch] = await pool.query(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE LOWER(ingredient_name) LIKE LOWER(?)',
      [`%${ingredientName}%`]
    );
    
    if (fuzzyMatch.length > 0) {
      return {
        id: fuzzyMatch[0].ingredient_id,
        name: fuzzyMatch[0].ingredient_name,
        matched: true
      };
    }
    
    // No match found
    return {
      id: null,
      name: ingredientName,
      matched: false
    };
    
  } catch (error) {
    console.error('Database matching error:', error);
    return {
      id: null,
      name: ingredientName,
      matched: false
    };
=======
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
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
  }
}

/**
<<<<<<< HEAD
 * POST /api/scan
=======
 * ✅ POST /api/scan
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
 */
router.post('/', upload.single('image'), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
<<<<<<< HEAD
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided' 
      });
=======
      return res.status(400).json({ success: false, error: 'No image file provided' });
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
    }

    tempFilePath = req.file.path;
    console.log(`📸 Received image: ${req.file.originalname} (${req.file.size} bytes)`);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath), {
      filename: req.file.originalname,
<<<<<<< HEAD
      contentType: req.file.mimetype
=======
      contentType: req.file.mimetype,
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
    });

    console.log(`🔄 Sending to YOLO API: ${DETECTION_API_URL}`);

    const response = await axios.post(DETECTION_API_URL, formData, {
<<<<<<< HEAD
      headers: {
        ...formData.getHeaders()
      },
      timeout: 120000
=======
      headers: { ...formData.getHeaders() },
      timeout: 120000,
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
    });

    console.log(`✅ Detection complete: ${response.data.num_detections} ingredients found`);

<<<<<<< HEAD
    // Match each detected ingredient to database
=======
    // Match detected ingredients
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
    const detectionsWithIds = await Promise.all(
      response.data.detections.map(async (det) => {
        const dbMatch = await matchIngredientToDatabase(det.class_name);
        return {
          ...det,
          ingredient_id: dbMatch.id,
          ingredient_name: dbMatch.name,
          db_matched: dbMatch.matched,
<<<<<<< HEAD
          original_detection: det.class_name
=======
          original_detection: det.class_name,
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
        };
      })
    );

<<<<<<< HEAD
    const matched = detectionsWithIds.filter(d => d.db_matched);
    const unmatched = detectionsWithIds.filter(d => !d.db_matched);

    console.log(`✅ Matched ${matched.length} ingredients to database`);
    if (unmatched.length > 0) {
      console.log(`⚠️  ${unmatched.length} ingredients not found in database:`, 
        unmatched.map(u => u.original_detection));
    }
=======
    const matched = detectionsWithIds.filter((d) => d.db_matched);
    const unmatched = detectionsWithIds.filter((d) => !d.db_matched);

    console.log(`✅ Matched ${matched.length} ingredient(s)`);
    if (unmatched.length > 0)
      console.warn(`⚠️ Unmatched:`, unmatched.map((u) => u.original_detection));
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3

    res.json({
      success: true,
      device: response.data.device,
      total_detections: response.data.num_detections,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      detections: detectionsWithIds,
      matched_ingredients: matched,
<<<<<<< HEAD
      unmatched_ingredients: unmatched
    });

  } catch (error) {
    console.error('❌ Detection error:', error.message);
    
=======
      unmatched_ingredients: unmatched,
    });
  } catch (error) {
    console.error('❌ Detection error:', error.message);
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data?.detail || 'Detection service error',
<<<<<<< HEAD
        details: error.response.data
=======
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
      });
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Detection service unavailable',
<<<<<<< HEAD
        details: 'Could not connect to YOLO detection API'
=======
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
<<<<<<< HEAD
        details: error.message
=======
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
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
<<<<<<< HEAD
 * GET /api/scan/health
=======
 * ✅ GET /api/scan/health
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
 */
router.get('/health', async (req, res) => {
  try {
    const healthUrl = DETECTION_API_URL.replace('/detect', '/health');
    const response = await axios.get(healthUrl, { timeout: 5000 });
<<<<<<< HEAD
    res.json({
      success: true,
      detection_service: response.data
    });
=======
    res.json({ success: true, detection_service: response.data });
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Detection service unavailable',
<<<<<<< HEAD
      details: error.message
=======
      details: error.message,
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
    });
  }
});

export default router;