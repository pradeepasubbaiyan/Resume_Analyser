@echo off
cd /d "%~dp0frontend"
if not exist "node_modules\vite\bin\vite.js" (
  npm install
)
npm run dev -- --host 127.0.0.1 --port 5175
