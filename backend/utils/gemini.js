import axios from 'axios';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// File Manager for Vision API (upload image)
let fileManager = null;
if (GEMINI_API_KEY) {
  try {
    fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
  } catch (e) {
    console.warn('Failed to initialize GoogleAIFileManager:', e.message);
  }
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * enrichWithGemini — Text-based label correction (YOLO label → clean name)
 */
export async function enrichWithGemini(labels) {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not set; skipping enrichment.');
    return null;
  }

  const originals = labels
    .map(l => (typeof l === 'string' ? l : l.original || l.label || ''))
    .filter(Boolean);

  if (originals.length === 0) return [];

  const prompt = `You are an assistant that maps noisy ingredient labels to canonical ingredient names.
Return a JSON array where each element is an object with keys: original, suggested, confidence (0-1), alternatives (array).
Example: [{"original":"apple_slice","suggested":"Apple","confidence":0.95,"alternatives":["Apple slice","Apple"]}, ...]

Input labels: ${JSON.stringify(originals, null, 2)}\n
Respond with JSON only.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  console.log(`[Gemini] Enriching ${originals.length} label(s): ${originals.join(', ')}`);

  try {
    const resp = await axios.post(url, body, { timeout: 20000 });
    const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON parse failed:', e.message, 'Raw:', text.substring(0, 200));
      return null;
    }

    if (!Array.isArray(parsed)) return null;

    console.log(`Gemini returned ${parsed.length} mapping(s)`);
    return parsed.map(item => ({
      original: item.original,
      suggested: item.suggested,
      confidence: Number(item.confidence) || 0,
      alternatives: Array.isArray(item.alternatives) ? item.alternatives : [],
    }));
  } catch (err) {
    const status = err.response?.status;
    console.error(`Gemini error (${status}):`, err.response?.data?.error?.message || err.message);
    return null;
  }
}

/**
 * enrichWithGeminiVision — Full image analysis when YOLO finds nothing
 */
export async function enrichWithGeminiVision(imagePath) {
  if (!GEMINI_API_KEY || !fileManager) {
    console.warn('Gemini Vision: API key or file manager not available');
    return [];
  }

  try {
    console.log('Uploading image to Gemini Vision...');
    const uploadResult = await fileManager.uploadFile(imagePath, {
      mimeType: 'image/jpeg',
      displayName: 'ingredient-scan',
    });

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `Analyze this food image and extract all visible ingredients.
Return a JSON array of objects with:
- ingredient_name: string (canonical name)
- confidence: number (0.0 to 1.0)

Only include real food ingredients. No duplicates. Respond with JSON only.`;

    console.log('Sending prompt to Gemini Vision...');
    const result = await model.generateContent([
      prompt,
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Gemini Vision JSON parse failed:', e.message);
      console.log('Raw response:', text.substring(0, 300));
      return [];
    }

    const ingredients = Array.isArray(parsed) ? parsed : parsed.ingredients || [];
    console.log(`Gemini Vision found ${ingredients.length} ingredient(s)`);
    return ingredients.map(item => ({
      ingredient_name: String(item.ingredient_name || '').trim(),
      confidence: Number(item.confidence) || 0.7,
    })).filter(i => i.ingredient_name);
  } catch (error) {
    console.error('Gemini Vision error:', error.message);
    return [];
  }
}

/**
 * checkGeminiConnectivity — Health check
 */
export async function checkGeminiConnectivity() {
  if (!GEMINI_API_KEY) {
    return { ok: false, detail: 'GEMINI_API_KEY not set' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = { contents: [{ parts: [{ text: 'Ping' }] }] };

  try {
    const resp = await axios.post(url, body, { timeout: 5000 });
    return resp.status === 200 ? { ok: true } : { ok: false, detail: `status ${resp.status}` };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message;
    return { ok: false, detail: `${status || 'network'} error: ${msg}` };
  }
}

export default enrichWithGemini;