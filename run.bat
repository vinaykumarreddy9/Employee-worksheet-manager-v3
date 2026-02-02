@echo off
setlocal

:: Check for .env file
if not exist .env (
    echo .env file not found! Using template.
    copy .env.template .env
)

:: Colors for output
set GREEN=[32m
set BLUE=[34m
set RESET=[0m

echo %BLUE%Starting Employee Timesheet Manager...%RESET%

:: Backend venv setup
if not exist backend\venv (
    echo %BLUE%Creating backend virtual environment...%RESET%
    python -m venv backend\venv
    call backend\venv\Scripts\activate
    pip install -r backend\requirements.txt
)

:: Frontend setup
if not exist frontend\node_modules (
    echo %BLUE%Installing frontend dependencies...%RESET%
    cd frontend && npm install && cd ..
)

:: Start Backend in a new window
echo %GREEN%Starting FastAPI Backend on http://localhost:8000 %RESET%
start "Backend" cmd /k "call backend\venv\Scripts\activate && cd backend && uvicorn main:app --reload"

:: Start Frontend in a new window
echo %GREEN%Starting React Frontend on http://localhost:5173 %RESET%
start "Frontend" cmd /k "cd frontend && npm run dev"

echo %BLUE%All services started.%RESET%
pause
