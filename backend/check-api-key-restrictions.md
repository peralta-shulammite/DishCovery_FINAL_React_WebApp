# Check API Key Restrictions

Since the API is enabled but you're getting 404 errors, the issue is likely **API key restrictions**.

## Steps to Check and Fix:

### 1. Go to API Credentials
Visit: https://console.cloud.google.com/apis/credentials

### 2. Find Your API Key
- Look for the API key that starts with `AIzaSyBB74CZJ7Wsax6q8UpJVaocSEC9N0MXORw`
- Click on the key name to edit it

### 3. Check API Restrictions
Look for **"API restrictions"** section:
- If it says **"Don't restrict key"** → This should work
- If it says **"Restrict key"** → Check if "Generative Language API" is in the allowed list

### 4. Check Application Restrictions
Look for **"Application restrictions"** section:
- If it's set to **"None"** → This should work
- If it's set to **"HTTP referrers"** → Make sure your server URL is allowed
- If it's set to **"IP addresses"** → Make sure your server IP is in the list

### 5. Recommended Settings for Testing
For now, to test if restrictions are the issue:
1. Set **API restrictions** to **"Don't restrict key"** (temporarily)
2. Set **Application restrictions** to **"None"** (temporarily)
3. Save the changes
4. Wait 1-2 minutes for changes to propagate
5. Test again with: `node test-gemini-api.js`

### 6. After It Works
Once it's working, you can add back restrictions:
- **API restrictions**: Select "Restrict key" and add "Generative Language API"
- **Application restrictions**: Add your server IP or domain

## Alternative: Check if API Key is from Correct Project

Make sure the API key is from the same project where you enabled the "Generative Language API".

1. Go to: https://console.cloud.google.com/apis/credentials
2. Check the "Project" column - it should match the project where the API is enabled
3. If different, either:
   - Use the API key from the correct project, OR
   - Enable the API in the project where the key is from

