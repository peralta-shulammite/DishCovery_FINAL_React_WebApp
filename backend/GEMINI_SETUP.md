# Gemini API Setup Guide

## Important: Google Cloud Console vs Google AI Studio

**These are TWO DIFFERENT systems:**

- **Google AI Studio** = Simple REST API key (free tier, limited)
  - ❌ NOT compatible with production REST API calls
  - ❌ Keys from AI Studio won't work with `generativelanguage.googleapis.com`

- **Google Cloud Console** = Full-fledged project with billing & APIs enabled
  - ✅ Required for production use
  - ✅ Works with `generativelanguage.googleapis.com` endpoint
  - ✅ Proper API management and quotas

## Setup Steps

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Create or Select a Project
- If you don't have a project, click "Select a project" → "New Project"
- Give it a name (e.g., "DishCovery")
- Click "Create"

### 3. Enable Generative Language API
1. Navigate to **APIs & Services** → **Library**
2. Search for "Generative Language API"
3. Click on it and press **"Enable"**
4. Wait for it to enable (takes a few seconds)

### 4. Create API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"API Key"**
3. A dialog will show your new API key
4. **Copy this key immediately** - you won't be able to see it again!
5. (Optional) Click "Restrict Key" to limit usage to Generative Language API only

### 5. Add to Environment Variables

Create or edit `.env.local` in the `backend` folder:

```env
GEMINI_API_KEY=your_cloud_console_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Or if using `.env`:

```env
GEMINI_API_KEY=your_cloud_console_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

**Recommended models:**
- `gemini-1.5-flash` - Fast, cost-effective (recommended)
- `gemini-1.5-pro` - More capable, slower
- `gemini-2.0-flash-exp` - Latest experimental (if available)

### 6. Restart Backend Server
After adding the API key, restart your backend:

```bash
cd backend
npm start
```

You should see:
```
✅ Gemini API: Connected (model: gemini-1.5-flash)
```

## Verification

The backend will automatically check Gemini connectivity on startup. If successful, you'll see:
- ✅ Gemini enrichment enabled in scan results
- AI-generated ingredient name suggestions
- Better label mapping from YOLO detections

## Troubleshooting

### Error: "API key not valid"
- ❌ You're using an AI Studio key → Get a Cloud Console key instead
- ❌ API not enabled → Enable "Generative Language API" in Cloud Console
- ❌ Wrong project → Make sure you're using the key from the correct project

### Error: "Billing required"
- Enable billing for your Google Cloud project
- You can set a budget limit to avoid charges
- Free tier includes generous quotas

### Error: "Quota exceeded"
- Check usage in Cloud Console → APIs & Services → Dashboard
- Request quota increase if needed
- Or wait for quota reset (usually daily)

## Security Notes

⚠️ **Never commit `.env` or `.env.local` to git!**

These files are already in `.gitignore`. Keep your API keys secret.

## Cost Considerations

The Generative Language API has:
- **Free tier**: 15 requests per minute (RPM) for most models
- **Paid tier**: Higher limits, pay-as-you-go pricing

For DishCovery's use case (ingredient enrichment), free tier should be sufficient for development and moderate usage.

