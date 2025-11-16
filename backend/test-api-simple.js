/**
 * Simple test to see actual Google API error response
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY;

console.log('Testing with API key:', API_KEY?.substring(0, 20) + '...\n');

// Test the exact endpoint format
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const body = {
  contents: [{
    role: 'user',
    parts: [{ text: 'Hello' }],
  }],
};

console.log('URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'));
console.log('Body:', JSON.stringify(body, null, 2));
console.log('\nMaking request...\n');

axios.post(url, body, { timeout: 10000 })
  .then(response => {
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.log('❌ ERROR');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Headers:', JSON.stringify(error.response?.headers, null, 2));
    console.log('Full Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Error Message:', error.message);
  });

