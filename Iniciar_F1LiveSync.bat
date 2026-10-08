@echo off
title F1 Live Sync (Windows Native)
echo ===================================================
echo Iniciando Servidor Backend y Frontend...
echo ===================================================
echo.

cd "%~dp0"

echo [1] Instalando dependencias del Frontend (si faltan)...
cd frontend
call npm install
cd ..

echo [2] Arrancando el Frontend en segundo plano...
cd frontend
start "F1 Frontend" cmd /c "npm run dev"
cd ..

echo [3] Arrancando el Backend (FastAPI)...
cd backend
if not exist "venv" (
    echo Creando entorno virtual de Python...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo.
echo Todo listo! Abriendo tu navegador en http://localhost:5173
timeout /t 3 /nobreak > NUL
start "" http://localhost:5173

uvicorn main:app --host 0.0.0.0 --port 8000
pause
