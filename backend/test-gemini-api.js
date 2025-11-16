/**
 * Test script to verify Gemini API key and connectivity
 * Run with: node test-gemini-api.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '.env.local') });

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

console.log('🔍 Testing Gemini API Configuration...\n');
console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 20) + '...' : '❌ NOT SET'}`);
console.log(`Model: ${MODEL}\n`);

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in .env file');
  process.exit(1);
}

// Test different model names and endpoints
const testConfigs = [
  { model: 'gemini-1.5-flash', endpoint: 'generateContent', version: 'v1' },
  { model: 'gemini-1.5-pro', endpoint: 'generateContent', version: 'v1' },
  { model: 'gemini-2.0-flash-exp', endpoint: 'generateContent', version: 'v1' },
  { model: 'gemini-2.0-flash', endpoint: 'generateContent', version: 'v1' },
];

async function testEndpoint(config) {
  const { model, endpoint, version } = config;
  const url = `https://generativelanguage.googleapis.com/${version}/${model}:${endpoint}?key=${API_KEY}`;
  
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: 'Say "Hello" in one word.' }],
    }],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 10,
    },
  };

  try {
    console.log(`Testing: ${model} (${version}/${endpoint})...`);
    const response = await axios.post(url, body, { timeout: 10000 });
    
    if (response.status === 200) {
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`✅ SUCCESS! Response: "${text.trim()}"\n`);
      return { success: true, model, url };
    }
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorMsg = errorData?.error?.message || errorData?.message || error.message;
    
    if (status === 404) {
      console.log(`❌ 404: Endpoint not found`);
      console.log(`   URL tried: ${url.substring(0, 100)}...`);
      if (errorData) {
        console.log(`   Error response:`, JSON.stringify(errorData, null, 2));
      }
      console.log(`   Error details: ${errorMsg}\n`);
    } else if (status === 403) {
      console.log(`❌ 403: Permission denied`);
      if (errorData) {
        console.log(`   Error response:`, JSON.stringify(errorData, null, 2));
      }
      console.log(`   Error details: ${errorMsg}\n`);
      console.log('   → Check API key restrictions in Google Cloud Console');
      console.log('   → Go to: https://console.cloud.google.com/apis/credentials\n');
    } else if (status === 400) {
      console.log(`❌ 400: Bad Request`);
      if (errorData) {
        console.log(`   Error response:`, JSON.stringify(errorData, null, 2));
      }
      console.log(`   Error details: ${errorMsg}\n`);
    } else {
      console.log(`❌ Error (${status || 'network'}): ${errorMsg}`);
      if (errorData) {
        console.log(`   Error response:`, JSON.stringify(errorData, null, 2));
      }
      console.log();
    }
  }
  
  return { success: false, model };
}

async function main() {
  console.log('Testing multiple model configurations...\n');
  
  for (const config of testConfigs) {
    const result = await testEndpoint(config);
    if (result.success) {
      console.log(`\n🎉 Working configuration found!`);
      console.log(`   Model: ${result.model}`);
      console.log(`   Update your .env file: GEMINI_MODEL=${result.model}\n`);
      process.exit(0);
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n❌ All tests failed. Common issues:');
  console.log('   1. Generative Language API not enabled in Google Cloud Console');
  console.log('      → Enable it at: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
  console.log('   2. API key restrictions may be blocking the request');
  console.log('   3. Billing may not be enabled (required for some models)');
  console.log('   4. API key might be from AI Studio instead of Cloud Console\n');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

