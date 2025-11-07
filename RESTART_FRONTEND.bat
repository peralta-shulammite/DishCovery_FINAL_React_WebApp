@echo off
echo ========================================
echo    CLEARING CACHE AND RESTARTING
echo ========================================
echo.

cd frontend\library

echo [1/4] Stopping any running Next.js process...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*" 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Deleting .next cache folder...
if exist ".next" (
    rmdir /s /q ".next"
    echo     ✓ Cache deleted
) else (
    echo     ✓ Cache already clean
)

echo [3/4] Starting fresh development server...
echo.
echo ========================================
echo    SERVER STARTING...
echo ========================================
echo.
start cmd /k "npm run dev"

echo.
echo ========================================
echo    DONE!
echo ========================================
echo.
echo ✅ Frontend server is starting in a new window
echo.
echo NEXT STEPS:
echo 1. Wait for "Ready" message in new window
echo 2. Go to browser: http://localhost:3000/user/user-profile
echo 3. Press Ctrl+Shift+R to hard refresh
echo 4. Check DevTools Console for: "🔧 User Profile API Base URL: http://localhost:5000/api"
echo 5. Check Network tab - URLs should have "/api" in them!
echo.
pause

