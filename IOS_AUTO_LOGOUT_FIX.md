# iOS Auto-Logout Fix

## Problem
Users on iOS devices (and potentially other devices) were experiencing automatic logouts in some instances, even when they had valid authentication tokens.

## Root Causes Identified

1. **Aggressive Token Verification**: The home page was calling `api.verifyToken()` on network errors, and if verification failed (due to network issues), it would log the user out.

2. **Network Error Handling**: The code didn't distinguish between network errors and actual authentication failures, causing logouts on temporary network issues.

3. **iOS Safari localStorage Issues**: iOS Safari has known issues with localStorage:
   - Private browsing mode throws errors when accessing localStorage
   - Storage quota limits can cause errors
   - localStorage can be cleared when device storage is low

4. **No Retry Logic**: Failed token verifications due to network issues would immediately trigger logout.

## Fixes Applied

### 1. Improved Token Verification (`frontend/library/src/app/user/home/api.js`)

- **Added localStorage availability check**: Tests localStorage before accessing it to handle iOS private browsing
- **Added network error detection**: Distinguishes between network errors and actual auth failures
- **Added timeout handling**: Uses AbortController for 10-second timeout (compatible with all browsers)
- **Network errors don't clear tokens**: Only actual auth failures (401, 403) clear tokens
- **Better error messages**: Network errors are flagged with `isNetworkError` property

### 2. Fixed Home Page Auto-Logout (`frontend/library/src/app/user/home/page.jsx`)

- **Network errors keep session**: When profile fetch fails due to network error, user stays logged in if token format is valid
- **Background token verification**: Token verification happens in background (non-blocking) after network recovery
- **Only logout on actual auth failures**: Only logs out if token is actually invalid, not on network errors
- **Backend issues don't logout**: 404 errors (endpoint not found) don't trigger logout

### 3. Enhanced Layout Session Management (`frontend/library/src/app/layout.js`)

- **iOS localStorage test**: Tests localStorage availability before using it
- **Graceful error handling**: All localStorage operations wrapped in try-catch
- **Never clear on errors**: Errors in session management don't trigger logout
- **Only clear expired tokens**: Only clears tokens that are actually expired

## Key Changes

### Before:
```javascript
// ❌ OLD: Logs out on any verification failure
api.verifyToken()
  .then(() => setDishCoveryIsLoggedIn(true))
  .catch(() => {
    localStorage.clear(); // Logs out even on network errors!
    setDishCoveryIsLoggedIn(false);
  });
```

### After:
```javascript
// ✅ NEW: Only logs out on actual auth failures
const token = localStorage.getItem('token');
if (token && token.length > 20 && token.split('.').length === 3) {
  // Keep user logged in despite network error
  setDishCoveryIsLoggedIn(true);
  
  // Verify in background (non-blocking)
  api.verifyToken()
    .then(() => setDishCoveryIsLoggedIn(true))
    .catch((verifyError) => {
      // Only logout if it's an actual auth failure, not network error
      if (verifyError.isNetworkError) {
        // Keep session - network errors are temporary
      } else if (verifyError.message === 'Token verification failed') {
        // Actual auth failure - logout
        localStorage.clear();
        setDishCoveryIsLoggedIn(false);
      }
    });
}
```

## iOS-Specific Improvements

1. **localStorage Availability Check**:
   ```javascript
   // Test localStorage before using it
   try {
     localStorage.setItem('__test__', 'test');
     localStorage.removeItem('__test__');
   } catch (e) {
     // iOS private browsing or quota exceeded
     return; // Don't proceed with session management
   }
   ```

2. **Graceful Error Handling**:
   ```javascript
   try {
     localStorage.setItem('userId', userId);
   } catch (e) {
     console.warn('⚠️ Could not save (storage issue):', e.message);
     // Don't logout - storage errors are temporary
   }
   ```

3. **Network Error Detection**:
   ```javascript
   const isNetworkError = error.name === 'AbortError' || 
                         error.name === 'TypeError' || 
                         error.message.includes('fetch') ||
                         error.message.includes('Failed to fetch');
   
   if (isNetworkError) {
     // Don't logout - network errors are temporary
   }
   ```

## Testing Recommendations

1. **Test on iOS Safari**:
   - Normal browsing mode
   - Private browsing mode
   - Low storage scenarios
   - Network interruptions

2. **Test Network Scenarios**:
   - Slow network connections
   - Intermittent connectivity
   - Server downtime
   - API timeouts

3. **Test Token Scenarios**:
   - Valid tokens
   - Expired tokens
   - Invalid token formats
   - Missing tokens

## Expected Behavior After Fix

✅ **Users stay logged in** when:
- Network errors occur
- Backend is temporarily unavailable
- API timeouts happen
- iOS Safari private browsing is enabled
- Storage quota is exceeded (graceful degradation)

❌ **Users are logged out** only when:
- Token is actually expired
- Token is invalid (401, 403 errors)
- Token format is invalid

## Files Modified

1. `frontend/library/src/app/user/home/api.js` - Token verification improvements
2. `frontend/library/src/app/user/home/page.jsx` - Auto-logout prevention
3. `frontend/library/src/app/layout.js` - iOS localStorage handling

## Notes

- All changes are backward compatible
- No breaking changes to API
- Improved error messages for debugging
- Better user experience on all devices, especially iOS

