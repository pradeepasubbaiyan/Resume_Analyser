@echo off
cd /d "%~dp0backend"
call "%~dp0.venv310\Scripts\activate.bat"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
