@echo off
REM FastAPI YOLO Backend Run Script for Windows (Batch File)
REM This script activates the virtual environment and starts the server

echo ========================================
echo Starting FastAPI YOLO Backend
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

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Virtual environment activated
echo.

REM Start the server
echo Starting FastAPI server...
echo Server will be available at:
echo   - Root: http://localhost:8000
echo   - Docs: http://localhost:8000/docs
echo   - Health: http://localhost:8000/health
echo.
echo Press CTRL+C to stop the server
echo.

REM Run the server
python detect_api.py

