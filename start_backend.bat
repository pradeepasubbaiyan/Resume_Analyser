@echo off
cd /d "%~dp0backend"
if not exist "%~dp0.venv310\Scripts\python.exe" (
  echo Python environment not found: %~dp0.venv310
  exit /b 1
)
call "%~dp0.venv310\Scripts\activate.bat"
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
