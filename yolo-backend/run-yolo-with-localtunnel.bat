@echo off
REM FastAPI YOLO Backend + Localtunnel Runner for Windows
REM Mas madali kaysa ngrok - npm install lang!

echo ========================================
echo Starting YOLO Backend with Localtunnel
echo ========================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv" (
    echo ERROR: Virtual environment not found!
    echo Please run setup-yolo-backend.bat first
    pause
    exit /b 1
)

REM Check if best.pt exists
if not exist "best.pt" (
    echo WARNING: best.pt not found!
    echo The API may not work without the model file
    echo.
)

REM Check if localtunnel is installed
where lt >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ========================================
    echo localtunnel is not installed!
    echo ========================================
    echo.
    echo Installing localtunnel...
    echo Run this command: npm install -g localtunnel
    echo.
    echo Or run this now? (Y/N)
    set /p INSTALL_NOW=
    if /i "%INSTALL_NOW%"=="Y" (
        echo Installing localtunnel...
        call npm install -g localtunnel
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Failed to install localtunnel
            echo Please install manually: npm install -g localtunnel
            pause
            exit /b 1
        )
        echo ✅ localtunnel installed successfully!
    ) else (
        echo Please install localtunnel first:
        echo   npm install -g localtunnel
        pause
        exit /b 1
    )
)

echo Starting YOLO Backend in background...
start "YOLO Backend" cmd /k "venv\Scripts\activate.bat && python detect_api.py"

REM Wait a bit for the server to start
echo Waiting for YOLO backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting localtunnel...
echo.
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

REM Cleanup: Kill the YOLO backend when localtunnel closes
echo.
echo Stopping YOLO backend...
taskkill /FI "WINDOWTITLE eq YOLO Backend*" /T /F >nul 2>&1

pause


