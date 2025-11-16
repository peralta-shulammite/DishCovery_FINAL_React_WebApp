@echo off
REM Localtunnel Runner (YOLO Backend must be running separately)
REM Use this if you already have YOLO backend running

echo ========================================
echo Starting Localtunnel for YOLO Backend
echo ========================================
echo.
echo Make sure YOLO backend is running on localhost:8000
echo.

REM Check if localtunnel is installed
where lt >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ========================================
    echo localtunnel is not installed!
    echo ========================================
    echo.
    echo Installing localtunnel...
    call npm install -g localtunnel
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install localtunnel
        echo Please install manually: npm install -g localtunnel
        pause
        exit /b 1
    )
    echo ✅ localtunnel installed successfully!
    echo.
)

echo ========================================
echo IMPORTANT: Copy the localtunnel URL below!
echo Update YOLO_API_URL in your .env file
echo Format: https://xxxxx.loca.lt/detect
echo ========================================
echo.
echo Note: First visit may show a warning page
echo       Just click "Continue" to proceed
echo.

REM Start localtunnel
lt --port 8000

pause


