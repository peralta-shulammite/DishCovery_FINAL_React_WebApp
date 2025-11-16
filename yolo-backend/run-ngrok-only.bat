@echo off
REM Ngrok Tunnel Runner (YOLO Backend must be running separately)
REM Use this if you already have YOLO backend running

echo ========================================
echo Starting Ngrok Tunnel for YOLO Backend
echo ========================================
echo.
echo Make sure YOLO backend is running on localhost:8000
echo.
echo ========================================
echo IMPORTANT: Copy the ngrok URL below!
echo Update YOLO_API_URL in your .env file
echo ========================================
echo.

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

REM Start ngrok
%NGROK_PATH% http 8000

pause


