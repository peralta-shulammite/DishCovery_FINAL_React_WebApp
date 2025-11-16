# Fix Gemini API 404 Error

## Problem
You're getting a 404 error when trying to use the Gemini API, even though you have a valid API key.

## Root Cause
The **Generative Language API is not enabled** in your Google Cloud Console project. Creating an API key doesn't automatically enable the API - you need to enable it separately.

## Solution: Enable the Generative Language API

### Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### Step 2: Select Your Project
- Make sure you're in the same project where you created the API key
- If you're not sure, check the project name in the top navigation bar

### Step 3: Enable the API
1. Go to **APIs & Services** → **Library** (or click this direct link):
   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com

2. Search for **"Generative Language API"** if the link doesn't work

3. Click on **"Generative Language API"**

4. Click the **"ENABLE"** button (big blue button at the top)

5. Wait for it to enable (usually takes 10-30 seconds)

### Step 4: Verify
After enabling, run the test script again:
```bash
cd backend
node test-gemini-api.js
```

You should see a ✅ SUCCESS message.

### Step 5: Restart Your Backend
After the API is enabled, restart your backend server:
```bash
cd backend
npm start
```

You should now see:
```
✅ Gemini available (model: gemini-2.0-flash) — enrichment enabled
```

## Alternative: Use a More Stable Model

If `gemini-2.0-flash` still doesn't work after enabling the API, try changing to `gemini-1.5-flash` in your `.env` file:

```env
GEMINI_MODEL=gemini-1.5-flash
```

This model is more stable and widely available.

## Still Having Issues?

If you still get 404 after enabling the API:
1. **Wait 1-2 minutes** - API enablement can take a moment to propagate
2. **Check billing** - Some models require billing to be enabled (even if you stay within free tier)
3. **Verify project** - Make sure your API key is from the same project where you enabled the API
4. **Check API key restrictions** - If your key has restrictions, make sure "Generative Language API" is allowed

