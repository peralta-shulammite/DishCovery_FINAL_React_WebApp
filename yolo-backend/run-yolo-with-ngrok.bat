@echo off
REM FastAPI YOLO Backend + Ngrok Tunnel Runner for Windows
REM This script starts both the YOLO backend and ngrok tunnel

echo ========================================
echo Starting YOLO Backend with Ngrok Tunnel
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

REM Check if ngrok is installed
REM First check D: drive location (preferred)
if exist "D:\ngrok\ngrok.exe" (
    set NGROK_PATH=D:\ngrok\ngrok.exe
) else if exist "%~dp0..\ngrok\ngrok.exe" (
    REM Check if ngrok is in project root
    set NGROK_PATH=%~dp0..\ngrok\ngrok.exe
) else (
    REM Check if ngrok is in PATH
    where ngrok >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set NGROK_PATH=ngrok
    ) else (
        REM Try WinGet location (fallback)
        if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\ngrok.exe" (
            set NGROK_PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links\ngrok.exe
        ) else (
            echo ERROR: ngrok is not installed!
            echo.
            echo Please download ngrok to D:\ngrok\
            echo Run: powershell -ExecutionPolicy Bypass -File "%~dp0download-ngrok-to-d.ps1"
            echo.
            echo Or download manually from: https://ngrok.com/download
            echo Extract ngrok.exe to: D:\ngrok\
            pause
            exit /b 1
        )
    )
)

echo Starting YOLO Backend in background...
start "YOLO Backend" cmd /k "venv\Scripts\activate.bat && python detect_api.py"

REM Wait a bit for the server to start
echo Waiting for YOLO backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting ngrok tunnel...
echo.
echo ========================================
echo IMPORTANT: Copy the ngrok URL below!
echo Update YOLO_API_URL in your .env file
echo ========================================
echo.

REM Start ngrok
%NGROK_PATH% http 8000

REM Cleanup: Kill the YOLO backend when ngrok closes
echo.
echo Stopping YOLO backend...
taskkill /FI "WINDOWTITLE eq YOLO Backend*" /T /F >nul 2>&1

pause


