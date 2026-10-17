# VerityHire AI local prototype

VerityHire is a local recruitment workflow prototype with a React/Vite frontend and FastAPI backend. It accepts candidate-entered job titles, requires both a resume and a public GitHub profile, analyzes accessible evidence, and stores assessment/interview responses in the local database.

## Run on Windows

Requirements: Python 3.10, Node.js/npm, and PowerShell or VS Code terminals.

1. Open the project folder in VS Code.
2. In a terminal from the project root, install backend dependencies:

   ```powershell
   .\.venv310\Scripts\python.exe -m pip install -r .\backend\requirements.txt
   ```

3. In terminal 1, start the API:

   ```powershell
   Set-Location .\backend
   ..\.venv310\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

4. In terminal 2, install and start the frontend:

   ```powershell
   Set-Location .\frontend
   npm ci
   npm run dev -- --host 127.0.0.1 --port 5175
   ```

5. Open <http://127.0.0.1:5175>. The API health endpoint is <http://127.0.0.1:8000/health>.

The root `start_backend.bat` and `start_frontend.bat` launch these local services. Stop a service with Ctrl+C in its terminal. Do not start a second copy on an already occupied port.

## Candidate flow

1. Enter any job title. A job description can optionally improve the provisional competency framework.
2. Select a resume (PDF, DOCX, ODT, RTF, PPTX, XLSX, a common image format, HTML, or a text format) and enter a public GitHub profile URL. Scanned PDFs and image resumes are read with OCR. The Analyze button stays disabled until all required fields are present; the API validates them again. Legacy `.doc` files need to be saved as `.docx` first.
3. Review the role-alignment estimate, source statuses, competency assumptions, category weights, and evidence snippets.
4. Candidates with an analyzed resume, a valid public GitHub profile URL, and an evidence score greater than the configured 60-point threshold can start the assessment directly. If GitHub's API is temporarily unavailable, the report identifies that source as pending and excludes it from the score; candidates still above the threshold on available evidence may start the assessment. Recruiters can adjust this threshold in Admin settings.
5. Submitting the timed assessment opens the interview immediately. Recruiter review of the assessment continues in parallel; candidates do not need to wait for it before starting the interview.
6. The interview requires explicit camera/microphone consent. The local face monitor pauses the interview timer and answering unless exactly one face is visible; tab-hidden and device events are recorded as advisory signals for human review.
7. Review and submit the interview. Responses and technical signals are persisted for human review. No webcam, face, sound, or tab signal automatically rejects a candidate.

## Configuration

For local SQLite, no environment file is needed. `backend/verityhire.db` is created on startup.

For Docker Compose, copy `.env.example` to `.env`, replace the PostgreSQL password, then run:

```powershell
docker compose up --build
```

The frontend can still be run separately using the steps above. The backend supports the local demo configuration; no generative AI key is configured by default. Public GitHub API access is subject to GitHub rate limits and analyzes only a bounded selection of public repository metadata, README files, and source/configuration files. To increase the server's GitHub API quota, set an operator-owned `GITHUB_TOKEN` in the backend environment (for a local run, set it in `backend/.env` or in the terminal before starting the API); never ask candidates for credentials or commit a token.

Recruitment policy and role-specific evidence weights can be changed under **Admin**. Weights are normalized; categories unavailable for a candidate are excluded from the denominator. The estimate is evidence alignment, not a probability of job success.

## Validation

From the project root:

```powershell
Set-Location .\backend
..\.venv310\Scripts\python.exe -m unittest discover -s tests -v
Set-Location ..\frontend
npm run build
```

## Important limitations

- This is a local prototype, not a production hiring system. It has no authentication or enforced recruiter/candidate authorization. Do not expose it to the internet or store real candidate data.
- Resume/GitHub analysis uses bounded extraction and deterministic competency matching. It is not a configured LLM, does not verify skill proficiency or code ownership, and cannot accurately interpret every occupation from a title alone. Treat unfamiliar roles as provisional and provide a job description.
- GitHub rate limits and network errors may result in verification pending. The app does not infer candidate fraud from unavailable evidence.
- Browser speech recognition is browser/provider-dependent and may process audio under that provider’s policy. Raw camera and microphone streams are not uploaded or stored. Face-count and device events are approximate, disclosed signals and never automatic rejection grounds.
- Response rubrics are stored for human review. Automated answer scoring, AI-authorship detection, password authentication, RBAC, secure document retention/deletion, audit review workflow, PDF report generation beyond browser print-to-PDF, and a production AI provider are not implemented.
- Retention days are policy metadata only; automatic deletion is not implemented.
- `docker-compose.yml` provides local PostgreSQL/Redis/API infrastructure only. The application does not currently enqueue background jobs or use Redis.
