import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Call Gemini (Generative Language API) to map noisy labels to canonical ingredient names.
 * Input: array of label strings (e.g. ["apple_slice","pumpkin_seed"]) or array of objects.
 * Returns: array of objects [{ original, suggested, confidence, alternatives }, ...] or null on error.
 */
export async function enrichWithGemini(labels) {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not set; skipping enrichment.');
    return null;
  }

  // Normalize labels to simple array of strings
  const originals = labels.map(l => (typeof l === 'string' ? l : l.original || l.label || ''))
    .filter(Boolean);

  if (originals.length === 0) return [];

  const prompt = `You are an assistant that maps noisy ingredient labels to canonical ingredient names.
Return a JSON array where each element is an object with keys: original, suggested, confidence (0-1), alternatives (array).
Example: [{"original":"apple_slice","suggested":"Apple","confidence":0.95,"alternatives":["Apple slice","Apple"]}, ...]

Input labels: ${JSON.stringify(originals, null, 2)}\n
Respond with JSON only.`;

  // Use the correct endpoint: v1beta with generateContent
  // Correct format: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Use the correct request body format
  const body = {
    contents: [
      { parts: [{ text: prompt }] }
    ]
  };

  console.log(`🔎 [Gemini] Starting enrichment for ${originals.length} label(s)`);
  console.log(`   📋 Model: ${GEMINI_MODEL}`);
  console.log(`   🏷️ Labels to enrich: ${originals.join(', ')}`);
  console.log(`   🌐 Endpoint: ${url.replace(GEMINI_API_KEY, '***KEY***')}`);

  try {
    const startTime = Date.now();
    const resp = await axios.post(url, body, { timeout: 20000 });
    const duration = Date.now() - startTime;
    
    console.log(`   ⏱️ API response time: ${duration}ms`);
    
    // Log usage metadata (tokens used)
    const usageMetadata = resp.data?.usageMetadata;
    if (usageMetadata) {
      console.log(`   📊 Token usage:`);
      console.log(`      • Prompt tokens: ${usageMetadata.promptTokenCount || 0}`);
      console.log(`      • Candidates tokens: ${usageMetadata.candidatesTokenCount || 0}`);
      console.log(`      • Total tokens: ${usageMetadata.totalTokenCount || 0}`);
    }
    
    // Check for rate limit headers (if available)
    const rateLimitHeaders = {
      'x-ratelimit-remaining': resp.headers['x-ratelimit-remaining'],
      'x-ratelimit-limit': resp.headers['x-ratelimit-limit'],
      'x-ratelimit-reset': resp.headers['x-ratelimit-reset'],
      'retry-after': resp.headers['retry-after'],
    };
    
    if (Object.values(rateLimitHeaders).some(v => v !== undefined)) {
      console.log(`   ⚡ Rate limit info:`);
      if (rateLimitHeaders['x-ratelimit-remaining']) {
        console.log(`      • Remaining requests: ${rateLimitHeaders['x-ratelimit-remaining']}`);
      }
      if (rateLimitHeaders['x-ratelimit-limit']) {
        console.log(`      • Rate limit: ${rateLimitHeaders['x-ratelimit-limit']} requests`);
      }
      if (rateLimitHeaders['x-ratelimit-reset']) {
        const resetDate = new Date(parseInt(rateLimitHeaders['x-ratelimit-reset']) * 1000);
        console.log(`      • Reset time: ${resetDate.toLocaleString()}`);
      }
    } else {
      console.log(`   💡 Rate limit headers not available in response`);
      console.log(`      → Check quota in Google Cloud Console: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas`);
    }
    
    // Parse response: candidates[].content.parts[].text
    const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`   📝 Raw response length: ${text.length} characters`);
    
    const start = text.indexOf('[');
    const jsonText = start >= 0 ? text.slice(start) : text;
    
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error(`   ❌ JSON parse error: ${parseErr.message}`);
      console.error(`   📄 Response preview: ${text.substring(0, 200)}...`);
      return null;
    }

    if (!Array.isArray(parsed)) {
      console.warn(`   ⚠️ Gemini returned non-array response (type: ${typeof parsed})`);
      console.warn(`   📄 Response: ${JSON.stringify(parsed).substring(0, 200)}...`);
      return null;
    }

    console.log(`   ✅ Gemini returned ${parsed.length} mapping(s)`);
    parsed.forEach((item, index) => {
      console.log(`      ${index + 1}. "${item.original}" → "${item.suggested}" (confidence: ${item.confidence})`);
    });
    
    return parsed.map(item => ({
      original: item.original,
      suggested: item.suggested,
      confidence: Number(item.confidence) || 0,
      alternatives: Array.isArray(item.alternatives) ? item.alternatives : [],
    }));
  } catch (err) {
    const status = err.response?.status;
    const errorDetail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
    
    // More helpful error messages for common issues
    if (status === 404) {
      console.error(`❌ Gemini 404 error: API endpoint not found.`);
      console.error(`   → Make sure you're using a Google Cloud Console API key (NOT AI Studio key)`);
      console.error(`   → Get your key from: https://console.cloud.google.com/apis/credentials`);
      console.error(`   → Current endpoint: ${url.replace(GEMINI_API_KEY, 'YOUR_API_KEY')}`);
    } else if (status === 403) {
      console.error(`❌ Gemini 403 error: Permission denied.`);
      console.error(`   → Check if "Generative Language API" is enabled in Cloud Console`);
      console.error(`   → If key is restricted, ensure it allows "Generative Language API"`);
    } else if (status === 429) {
      console.error(`❌ Gemini 429 error: Rate limit exceeded (Too Many Requests)`);
      console.error(`   → Current rate limits for gemini-2.5-flash:`);
      console.error(`      • Free tier: 10 RPM, 250K TPM, 250 RPD`);
      console.error(`      • Paid tier: 1,000 RPM, 1M TPM, 10K RPD`);
      console.error(`   → Check your quota: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas`);
      console.error(`   → Check usage dashboard: https://console.cloud.google.com/apis/dashboard`);
      const retryAfter = err.response?.headers?.['retry-after'];
      if (retryAfter) {
        console.error(`   → Retry after: ${retryAfter} seconds`);
      }
    } else {
      console.error(`❌ Gemini error (${status || 'network'}): ${errorDetail}`);
    }
    
    return null;
  }
}

export default enrichWithGemini;

/**
 * Lightweight connectivity check to Gemini API.
 * Returns an object { ok: boolean, detail?: string }
 */
export async function checkGeminiConnectivity() {
  if (!GEMINI_API_KEY) {
    console.warn('   ⚠️ GEMINI_API_KEY not set in environment variables');
    return { ok: false, detail: 'GEMINI_API_KEY not set' };
  }
  
  // Use the correct endpoint: v1beta with generateContent
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  // Use the correct request body format
  const body = {
    contents: [
      { parts: [{ text: 'Ping' }] }
    ]
  };

  console.log(`   🔄 Testing Gemini API connection...`);
  console.log(`   📍 URL: ${url.replace(GEMINI_API_KEY, '***KEY***')}`);
  
  try {
    const startTime = Date.now();
    const resp = await axios.post(url, body, { timeout: 5000 });
    const duration = Date.now() - startTime;
    
    if (resp.status === 200) {
      const responseText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usageMetadata = resp.data?.usageMetadata;
      
      console.log(`   ✅ Gemini API responded successfully (${duration}ms)`);
      console.log(`   📝 Response preview: ${responseText.substring(0, 50)}...`);
      
      if (usageMetadata) {
        console.log(`   📊 Token usage: ${usageMetadata.promptTokenCount || 0} prompt + ${usageMetadata.candidatesTokenCount || 0} candidates = ${usageMetadata.totalTokenCount || 0} total`);
      }
      
      // Check rate limit headers
      const remaining = resp.headers['x-ratelimit-remaining'];
      if (remaining !== undefined) {
        console.log(`   ⚡ Rate limit remaining: ${remaining} requests`);
      }
      
      return { ok: true };
    }
    
    console.warn(`   ⚠️ Unexpected status code: ${resp.status}`);
    return { ok: false, detail: `status ${resp.status}` };
  } catch (err) {
    const status = err.response?.status;
    const apiError = err.response?.data?.error?.message || err.response?.data?.message || err.message;
    
    console.error(`   ❌ Gemini API connection failed`);
    console.error(`   📊 Status: ${status || 'N/A'}`);
    console.error(`   💬 Error: ${apiError || err.message}`);
    
    // Provide helpful error messages
    if (status === 404) {
      return { ok: false, detail: `404: API endpoint not found. Make sure you're using a Google Cloud Console API key (NOT AI Studio key). Get key from: https://console.cloud.google.com/apis/credentials` };
    } else if (status === 403) {
      return { ok: false, detail: `403: Permission denied. Check if Generative Language API is enabled or if key restrictions allow it.` };
    } else {
      return { ok: false, detail: `${status || 'network'} error: ${apiError}` };
    }
  }
}
