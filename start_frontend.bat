@echo off
cd /d "%~dp0frontend"
npm install
npm run dev -- --host 0.0.0.0 --port 5175
