@echo off
title F1 Live Sync
cd "%~dp0"
if not exist "node_modules" (
    npm install
)
if not exist "backend\venv" (
    echo Creando entorno virtual y backend...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd ..
)
npm run dev
