@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================
echo   TIDAL Playlist Merger - Startup
echo ========================================
echo.

:: Check Python
echo [1/4] Checking Python...
set PYTHON_CMD=

:: Try py launcher first (any Python 3.x)
py -3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py -3
    goto :python_found
)

:: Try python command
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :python_found
)

:: Try python3 command
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    goto :python_found
)

echo [ERROR] Python not found. Please install Python 3.9+ from https://www.python.org/downloads/
echo         Make sure to check "Add Python to PATH" during installation.
pause
exit /b 1

:python_found
for /f "tokens=2" %%i in ('%PYTHON_CMD% --version 2^>^&1') do set PY_VER=%%i
echo        Python %PY_VER% found.

:: Check Node.js
echo [2/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo        Node.js !NODE_VER! found.

:: Install Python dependencies
echo [3/4] Installing Python dependencies...
cd server-python
if not exist "venv" (
    echo        Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
echo        Python dependencies installed.

:: Build frontend if needed
echo [4/4] Checking frontend...
cd ..\client
if not exist "dist" (
    echo        Installing frontend dependencies...
    call npm install --silent
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b 1
    )
    echo        Building frontend...
    call npm run build
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to build frontend.
        pause
        exit /b 1
    )
) else (
    echo        Frontend already built.
)

:: Start server
echo.
echo ========================================
echo   Starting server...
echo   Open http://localhost:8000 in browser
echo   Press Ctrl+C to stop
echo ========================================
echo.

cd ..\server-python
call venv\Scripts\activate
start http://localhost:8000
%PYTHON_CMD% -m uvicorn main:app --host 0.0.0.0 --port 8000
