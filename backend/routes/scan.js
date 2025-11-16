import express from 'express';
import multer from 'multer';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';
import enrichWithGemini from '../utils/gemini.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const DETECTION_API_URL = process.env.YOLO_API_URL || 'http://localhost:8000/detect';
// Simple in-memory cache for Gemini mappings (key: original label -> suggested result)
const geminiCache = new Map();
const GEMINI_CONF_THRESHOLD = parseFloat(process.env.GEMINI_CONF_THRESHOLD || '0.7');

function getConfidenceFromDetection(det) {
  return Number(det.confidence ?? det.score ?? det.conf ?? 0);
}

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

    // If no detections, skip Gemini entirely
    const detections = Array.isArray(response.data.detections) ? response.data.detections : [];
    if (detections.length === 0) {
      console.log('ℹ️ No detections — skipping Gemini enrichment');
      return res.json({
        success: true,
        device: response.data.device,
        total_detections: response.data.num_detections || 0,
        matched_count: 0,
        unmatched_count: 0,
        detections: [],
        matched_ingredients: [],
        unmatched_ingredients: [],
        ai_summary: response.data.ai_summary || null,
        gemini_enabled: false,
      });
    }

    // Decide which labels need Gemini enrichment: low-confidence or likely-unmatched
    const toEnrichLabels = new Set();
    const preMatches = [];

    // First pass: for high-confidence detections, try DB match to avoid Gemini calls
    for (const det of detections) {
      const conf = getConfidenceFromDetection(det);
      if (conf >= GEMINI_CONF_THRESHOLD) {
        const dbMatch = await matchIngredientToDatabase(det.class_name);
        if (dbMatch.matched) {
          preMatches.push({ det, dbMatch });
          continue;
        }
      }
      // mark for enrichment (either low confidence or no DB match)
      toEnrichLabels.add(det.class_name);
    }

    // Remove labels already cached
    const labelsToCall = Array.from(toEnrichLabels).filter(l => !geminiCache.has(l));

    // Call Gemini if there are labels to enrich
    let geminiResults = null;
    if (labelsToCall.length > 0 && process.env.GEMINI_API_KEY) {
      console.log(`🔁 Enriching ${labelsToCall.length} label(s) with Gemini`);
      geminiResults = await enrichWithGemini(labelsToCall);
      if (Array.isArray(geminiResults)) {
        for (const r of geminiResults) {
          if (r && r.original) geminiCache.set(r.original, r);
        }
        console.log(`✅ Gemini enrichment successful`);
      } else {
        console.log(`ℹ️ Gemini enrichment skipped (will match raw detection names)`);
      }
    } else if (labelsToCall.length > 0) {
      console.log('ℹ️ GEMINI_API_KEY not set — skipping enrichment (will match raw detection names)');
    }

    // Now produce final detectionsWithIds using recommended name (Gemini suggestion if available)
    const detectionsWithIds = await Promise.all(
      detections.map(async (det) => {
        const cached = geminiCache.get(det.class_name);
        const nameToMatch = cached?.suggested || det.class_name;
        const dbMatch = await matchIngredientToDatabase(nameToMatch);
        return {
          ...det,
          suggested_name: cached?.suggested || null,
          gemini_conf: cached?.confidence ?? null,
          gemini_alternatives: cached?.alternatives || [],
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
      // Include AI summary if available
      ai_summary: response.data.ai_summary || null,
      gemini_enabled: response.data.gemini_enabled || false,
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
        // ✅ Use timestamp in seconds format: "scan_1234567890" (matches DELETE endpoint)
        const groupId = `scan_${Math.floor(scanDate.getTime() / 1000)}`;
        currentGroup = {
          id: groupId,
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
 * ✅ POST /api/scan/history - Save a scan to history
 */
router.post('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { ingredientIds, scanMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ingredient IDs are required' 
      });
    }

    // ✅ Determine scan method: 'camera_scan', 'pantry_selection', 'manual_add', or default
    const method = scanMethod || 'camera_scan';
    console.log(`💾 Saving scan history for user ${userId} with ${ingredientIds.length} ingredients (method: ${method})`);

    // ✅ scan_id is AUTO_INCREMENT, so we don't need to provide it - let the database generate it
    // Each ingredient in the same scan session will have the same timestamp, which we can use to group them
    const scannedAt = new Date();

    // Insert each ingredient as a separate scan entry
    // ✅ Save with scan_method and confidence_score for better tracking
    // Note: scan_id is AUTO_INCREMENT, so we omit it and let the database generate unique IDs
    for (const ingredientId of ingredientIds) {
      await safeQuery(`
        INSERT INTO user_scanned_ingredients (user_id, ingredient_id, scan_method, confidence_score, scanned_at)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, ingredientId, method, 100.00, scannedAt]);
    }

    console.log(`✅ Scan history saved successfully (${ingredientIds.length} ingredients at ${scannedAt.toISOString()})`);

    res.json({
      success: true,
      message: 'Scan history saved successfully',
      timestamp: scannedAt.toISOString()
    });

  } catch (error) {
    console.error('❌ Error saving scan history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save scan history',
      details: error.message
    });
  }
});

/**
 * ✅ DELETE /api/scan/history/:scanId - Delete a scan session from history
 * Note: scanId is actually a timestamp-based group ID (e.g., "scan_1234567890")
 * We delete all ingredients scanned at that timestamp
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

    console.log(`🗑️  Deleting scan session ${scanId} for user ${userId}`);

    // ✅ Extract timestamp from scanId (format: "scan_1234567890")
    // The scanId is generated from timestamp, so we can extract it
    const timestampMatch = scanId.match(/scan_(\d+)/);
    if (!timestampMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scan ID format'
      });
    }

    const timestampSeconds = parseInt(timestampMatch[1]);
    const startTime = new Date(timestampSeconds * 1000);
    const endTime = new Date(timestampSeconds * 1000 + 60000); // 1 minute window

    // Delete all ingredients scanned within this time window
    await safeQuery(`
      DELETE FROM user_scanned_ingredients 
      WHERE user_id = ? 
      AND scanned_at >= ? 
      AND scanned_at < ?
    `, [userId, startTime, endTime]);

    res.json({
      success: true,
      message: 'Scan session deleted successfully'
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