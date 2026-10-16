from __future__ import annotations

from datetime import datetime

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.evidence_analysis import analyze_candidate_evidence
from app.services import get_demo_payload, seed_demo_data

settings = get_settings()

app = FastAPI(title='VerityHire AI API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.allowed_origins.split(',') if origin.strip()],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    seed_demo_data()


@app.get('/health')
def health() -> dict:
    return {
        'status': 'ok',
        'service': 'VerityHire AI API',
        'environment': settings.app_env,
        'config_mode': settings.ai_provider,
        'timestamp': datetime.utcnow().isoformat(),
    }


@app.get('/api/config')
def get_config() -> dict:
    return {
        'app_name': settings.app_name,
        'app_env': settings.app_env,
        'ai_provider': settings.ai_provider,
        'ai_model': settings.ai_model,
        'allowed_origins': [origin.strip() for origin in settings.allowed_origins.split(',') if origin.strip()],
        'demo_mode': True,
    }


@app.get('/api/jobs')
def read_jobs() -> dict:
    payload = get_demo_payload()
    return {'jobs': payload['jobs'], 'message': 'Role templates loaded'}


@app.get('/api/assessment')
def get_assessment() -> dict:
    payload = get_demo_payload()
    return {'data': payload['assessment'], 'message': 'Assessment generated'}


@app.get('/api/interview')
def get_interview() -> dict:
    payload = get_demo_payload()
    return {'data': payload['interview'], 'message': 'Adaptive interview ready'}


@app.get('/api/recruiter/dashboard')
def get_recruiter_dashboard() -> dict:
    payload = get_demo_payload()
    return {'data': payload['dashboard'], 'message': 'Recruiter dashboard data loaded'}


@app.get('/api/admin/settings')
def get_admin_settings() -> dict:
    payload = get_demo_payload()
    return {'data': payload['admin'], 'message': 'Admin settings loaded'}


@app.post('/api/candidate/onboarding')
async def candidate_onboarding(
    target_role: str = Form(...),
    resume_file: UploadFile | None = File(default=None),
    github_url: str | None = Form(default=None),
    portfolio_url: str | None = Form(default=None),
) -> dict:
    return await analyze_candidate_evidence(
        target_role=target_role,
        resume_file=resume_file,
        github_url=github_url or None,
        portfolio_url=portfolio_url or None,
    )


@app.post('/api/interview/consent')
def set_interview_consent(payload: dict) -> dict:
    return {
        'message': 'Consent captured',
        'data': {
            'camera': bool(payload.get('camera')), 
            'microphone': bool(payload.get('microphone')),
            'status': 'ready',
        },
    }


@app.post('/api/interview/answer')
def submit_interview_answer(payload: dict) -> dict:
    if not payload.get('question_id'):
        raise HTTPException(status_code=400, detail='question_id is required')
    if not isinstance(payload.get('answer'), str) or not payload['answer'].strip():
        raise HTTPException(status_code=400, detail='A spoken answer transcript is required')
    return {
        'message': 'Answer received in local demo mode and not persisted; no AI-authorship detection or automatic rejection is performed',
        'data': {
            'question_id': payload['question_id'],
            'status': 'received_demo_only',
        },
    }


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app.main:app', host='0.0.0.0', port=8000, reload=True)
