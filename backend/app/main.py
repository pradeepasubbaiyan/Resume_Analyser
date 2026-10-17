from __future__ import annotations

from datetime import datetime
import re

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import String, inspect, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base, SessionLocal, engine, get_db
from app.evidence_analysis import analyze_candidate_evidence
from app.models import (
    Application,
    AssessmentResponse,
    AssessmentSession,
    AssessmentTask,
    CandidateProfile,
    ConsentRecord,
    FinalReport,
    IntegrityEvent,
    InterviewQuestion,
    InterviewResponse,
    InterviewSession,
    Job,
    RecruitmentPolicy,
    RoleFitReport,
    SkillEvidence,
)
from app.services import get_demo_payload
from app.workflow import adaptive_follow_up, skills_for_role

settings = get_settings()

app = FastAPI(title='VerityHire AI API', version='0.2.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.allowed_origins.split(',') if origin.strip()],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def migrate_legacy_candidate_identity() -> None:
    if engine.dialect.name != 'sqlite':
        return
    columns = inspect(engine).get_columns('candidate_profiles')
    user_id = next((column for column in columns if column['name'] == 'user_id'), None)
    if user_id is None or user_id['nullable']:
        return
    with engine.connect() as connection:
        connection.exec_driver_sql('PRAGMA foreign_keys=OFF')
        connection.commit()
        try:
            with connection.begin():
                operations = Operations(MigrationContext.configure(connection))
                with operations.batch_alter_table('candidate_profiles') as batch:
                    batch.alter_column(
                        'user_id',
                        existing_type=String(),
                        existing_nullable=False,
                        nullable=True,
                    )
        finally:
            connection.exec_driver_sql('PRAGMA foreign_keys=ON')
            connection.commit()


def migrate_legacy_integrity_events() -> None:
    if engine.dialect.name != 'sqlite':
        return
    columns = {column['name'] for column in inspect(engine).get_columns('integrity_events')}
    with engine.begin() as connection:
        if 'confidence' not in columns:
            connection.exec_driver_sql(
                'ALTER TABLE integrity_events ADD COLUMN confidence FLOAT NOT NULL DEFAULT 0.5'
            )
        if 'review_status' not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE integrity_events ADD COLUMN review_status VARCHAR NOT NULL DEFAULT 'unreviewed'"
            )


def migrate_legacy_workflow_statuses() -> None:
    with engine.begin() as connection:
        connection.execute(
            update(Application)
            .where(Application.status == 'assessment_completed')
            .values(status='assessment_review')
        )


@app.on_event('startup')
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_legacy_candidate_identity()
    migrate_legacy_integrity_events()
    migrate_legacy_workflow_statuses()
    with SessionLocal() as db:
        if db.get(RecruitmentPolicy, 'default') is None:
            db.add(RecruitmentPolicy(id='default'))
            db.commit()


def get_policy(db: Session) -> RecruitmentPolicy:
    policy = db.get(RecruitmentPolicy, 'default')
    if policy is None:
        policy = RecruitmentPolicy(id='default')
        db.add(policy)
        db.flush()
    return policy


def get_candidate_or_404(db: Session, candidate_id: str) -> CandidateProfile:
    candidate = db.get(CandidateProfile, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail='Candidate profile was not found')
    return candidate


def get_latest_fit(db: Session, candidate_id: str) -> RoleFitReport | None:
    return (
        db.query(RoleFitReport)
        .filter(RoleFitReport.candidate_profile_id == candidate_id)
        .order_by(RoleFitReport.created_at.desc())
        .first()
    )


def get_latest_application(db: Session, candidate_id: str) -> Application | None:
    return (
        db.query(Application)
        .filter(Application.candidate_profile_id == candidate_id)
        .order_by(Application.created_at.desc())
        .first()
    )


def require_eligible_candidate(db: Session, candidate_id: str) -> CandidateProfile:
    candidate = get_candidate_or_404(db, candidate_id)
    fit = get_latest_fit(db, candidate_id)
    threshold = get_policy(db).screening_threshold
    if fit is None:
        raise HTTPException(status_code=409, detail='Complete evidence analysis before starting the assessment')
    sources = fit.evidence_json.get('sources', {})
    if sources.get('resume', {}).get('status') != 'analyzed':
        raise HTTPException(status_code=409, detail='A readable resume must be analyzed before continuing')
    if not candidate.github_url:
        raise HTTPException(status_code=409, detail='Submit a public GitHub profile URL before continuing')
    if sources.get('github', {}).get('status') == 'not found':
        raise HTTPException(status_code=409, detail='The submitted GitHub profile was not found; correct the URL before continuing')
    if fit.score <= threshold:
        raise HTTPException(
            status_code=403,
            detail=f'The evidence score must be greater than {threshold} to start the assessment',
        )
    application = get_latest_application(db, candidate_id)
    if application is None or application.status not in {
        'evidence_review',
        'evidence_approved',
        'assessment_review',
        'assessment_approved',
        'human_review',
    }:
        raise HTTPException(
            status_code=409,
            detail='Complete evidence analysis and meet the configured score threshold before starting the assessment',
        )
    return candidate


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
def get_config(db: Session = Depends(get_db)) -> dict:
    policy = get_policy(db)
    return {
        'app_name': settings.app_name,
        'app_env': settings.app_env,
        'ai_provider': settings.ai_provider,
        'ai_model': settings.ai_model,
        'allowed_origins': [origin.strip() for origin in settings.allowed_origins.split(',') if origin.strip()],
        'demo_mode': True,
        'screening_threshold': policy.screening_threshold,
    }


@app.get('/api/jobs')
def read_jobs() -> dict:
    # These are editable starting examples, not a restriction on candidate-entered roles.
    jobs = get_demo_payload()['jobs']
    return {'jobs': jobs, 'message': 'Role examples loaded; candidates may enter any job title'}


@app.post('/api/candidate/onboarding')
async def candidate_onboarding(
    target_role: str = Form(...),
    role_description: str = Form(default=''),
    resume_file: UploadFile | None = File(default=None),
    github_url: str | None = Form(default=None),
    portfolio_url: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> dict:
    policy = get_policy(db)
    role_weights = (policy.role_weights_json or {}).get(' '.join(target_role.split()))
    result = await analyze_candidate_evidence(
        target_role=target_role,
        role_description=role_description,
        resume_file=resume_file,
        github_url=github_url or None,
        portfolio_url=portfolio_url or None,
        role_weights=role_weights,
    )
    profile_data = result['data']['profile']
    report_data = result['data']['report']
    role = profile_data['target_role']
    job = (
        db.query(Job)
        .filter(Job.title == role, Job.status == 'provisional')
        .first()
    )
    if job is None:
        job = Job(
            title=role,
            department='Candidate-selected role',
            status='provisional',
            description='Provisional competency framework inferred from the candidate-entered role title.',
        )
        db.add(job)
        db.flush()
    candidate = CandidateProfile(
        target_role=role,
        github_url=github_url,
        portfolio_url=portfolio_url,
        summary='Resume text analyzed; raw uploaded files are not retained by this local demo.',
    )
    db.add(candidate)
    db.flush()
    evidence_for_report = dict(report_data)
    fit_record = RoleFitReport(
        candidate_profile_id=candidate.id,
        job_id=job.id,
        score=report_data['score'],
        threshold=policy.screening_threshold,
        evidence_json=evidence_for_report,
    )
    db.add(fit_record)
    db.add(Application(candidate_profile_id=candidate.id, job_id=job.id, status='evidence_review'))
    for item in report_data['skill_evidence']:
        db.add(SkillEvidence(
            candidate_profile_id=candidate.id,
            skill_name=item['name'],
            evidence_source=', '.join(item['sources']) or None,
            confidence=0.65 if item['sources'] else 0,
            verification_status='needs_human_review' if item['sources'] else 'insufficient_evidence',
            notes='Text matching indicates a possible evidence location; a reviewer must verify the claim.',
        ))
    db.commit()
    profile_data['candidate_id'] = candidate.id
    resume_analyzed = report_data['sources']['resume']['status'] == 'analyzed'
    github_status = report_data['sources']['github']['status']
    github_profile_found = github_status != 'not found'
    score_eligible = (
        resume_analyzed
        and bool(github_url)
        and github_profile_found
        and report_data['score'] > policy.screening_threshold
    )
    if not resume_analyzed or not github_url or not github_profile_found:
        eligibility_status = 'verification_pending'
    elif score_eligible:
        eligibility_status = 'eligible'
    elif github_status != 'analyzed':
        eligibility_status = 'verification_pending'
    else:
        eligibility_status = 'review_required'

    if not resume_analyzed:
        eligibility_message = 'The resume could not be analyzed. Submit a readable resume before continuing.'
    elif not github_url:
        eligibility_message = 'Submit a public GitHub profile URL before continuing.'
    elif not github_profile_found:
        eligibility_message = 'The submitted GitHub profile was not found. Check the profile URL and submit the evidence again.'
    elif score_eligible and github_status == 'unavailable':
        eligibility_message = (
            'Your current evidence score is greater than the configured threshold, so you can start the assessment now. '
            'GitHub data was unavailable and was excluded from this score.'
        )
    elif score_eligible and github_status == 'partial':
        eligibility_message = (
            'Your current evidence score is greater than the configured threshold, so you can start the assessment now. '
            'GitHub analysis is partial; only the accessible repository evidence is included.'
        )
    elif score_eligible:
        eligibility_message = (
            'Your evidence score is greater than the configured threshold. You can start the assessment now; '
            'a recruiter will review it before the interview stage.'
        )
    elif github_status != 'analyzed':
        eligibility_message = (
            f'GitHub analysis is {github_status}: {report_data["sources"]["github"]["detail"]}. '
            f'The current score ({report_data["score"]}) does not exceed the {policy.screening_threshold}-point threshold. '
            'Retry the analysis after GitHub access is restored.'
        )
    else:
        eligibility_message = (
            f'The evidence score must be greater than {policy.screening_threshold} to start the assessment. '
            'Request review or update the submitted evidence.'
        )
    report_data['eligibility'] = {
        'threshold': policy.screening_threshold,
        'status': eligibility_status,
        'next_stage_unlocked': score_eligible,
        'message': eligibility_message,
    }
    result['message'] = 'Evidence analysis completed and saved for this local demo session'
    return result


@app.get('/api/candidate/{candidate_id}/report')
def candidate_report(candidate_id: str, db: Session = Depends(get_db)) -> dict:
    candidate = get_candidate_or_404(db, candidate_id)
    fit = get_latest_fit(db, candidate_id)
    if fit is None:
        raise HTTPException(status_code=404, detail='Evidence report was not found')
    evidence_report = dict(fit.evidence_json)
    assessment = (
        db.query(AssessmentSession)
        .filter(AssessmentSession.candidate_profile_id == candidate_id)
        .order_by(AssessmentSession.started_at.desc())
        .first()
    )
    interview = (
        db.query(InterviewSession)
        .filter(InterviewSession.candidate_profile_id == candidate_id)
        .order_by(InterviewSession.started_at.desc())
        .first()
    )
    final = (
        db.query(FinalReport)
        .filter(FinalReport.candidate_profile_id == candidate_id)
        .order_by(FinalReport.generated_at.desc())
        .first()
    )
    policy = get_policy(db)
    application = get_latest_application(db, candidate_id)
    application_status = application.status if application else 'not_submitted'
    assessment_details: list[dict] = []
    if assessment:
        task_rows = (
            db.query(AssessmentTask)
            .filter(AssessmentTask.session_id == assessment.id)
            .order_by(AssessmentTask.position)
            .all()
        )
        for task in task_rows:
            response = (
                db.query(AssessmentResponse)
                .filter(AssessmentResponse.task_id == task.id)
                .order_by(AssessmentResponse.submitted_at.desc())
                .first()
            )
            assessment_details.append({
                'task_id': task.id,
                'category': task.task_type,
                'prompt': task.prompt,
                'rubric': task.rubric,
                'answer': response.answer_text if response else None,
                'result_category': 'human review required' if response else 'insufficient evidence',
            })
    interview_details: list[dict] = []
    integrity_events: list[dict] = []
    if interview:
        interview_rows = (
            db.query(InterviewQuestion)
            .filter(InterviewQuestion.interview_session_id == interview.id)
            .order_by(InterviewQuestion.position)
            .all()
        )
        for question in interview_rows:
            response = (
                db.query(InterviewResponse)
                .filter(InterviewResponse.question_id == question.id)
                .order_by(InterviewResponse.created_at.desc())
                .first()
            )
            interview_details.append({
                'question_id': question.id,
                'category': question.category,
                'question': question.question_text,
                'evidence_target': question.evidence_target,
                'answer': response.answer_text if response else None,
                'result_category': 'human review required' if response else 'insufficient evidence',
            })
        integrity_events = [
            {
                'event_type': event.event_type,
                'timestamp': event.created_at.isoformat(),
                'confidence': event.confidence,
                'context': event.notes,
                'review_status': event.review_status,
            }
            for event in db.query(IntegrityEvent)
            .filter(IntegrityEvent.session_id == interview.id)
            .order_by(IntegrityEvent.created_at)
            .all()
        ]
    github_status = evidence_report['sources']['github']['status']
    resume_analyzed = evidence_report['sources']['resume']['status'] == 'analyzed'
    score_eligible = (
        fit.score > policy.screening_threshold
        and resume_analyzed
        and bool(candidate.github_url)
        and github_status != 'not found'
    )
    next_stage_unlocked = (
        score_eligible
        and application_status in {'evidence_review', 'evidence_approved', 'assessment_approved'}
    )
    assessment_submitted = bool(assessment and assessment.status == 'completed')
    if application_status == 'assessment_review' and assessment_submitted:
        next_stage_unlocked = True
        eligibility_status = 'interview_available_review_pending'
        eligibility_message = (
            'Your assessment is submitted and the interview is open now. Recruiter review continues in parallel.'
        )
    elif application_status == 'assessment_review':
        next_stage_unlocked = False
        eligibility_status = 'awaiting_recruiter_review'
        eligibility_message = 'Your assessment is waiting to finish processing before the interview can open.'
    elif not resume_analyzed or not candidate.github_url or github_status == 'not found':
        eligibility_status = 'verification_pending'
        next_stage_unlocked = False
    elif application_status in {'evidence_review', 'evidence_approved', 'assessment_approved', 'human_review'} and score_eligible:
        eligibility_status = 'eligible'
        next_stage_unlocked = score_eligible and application_status in {'evidence_review', 'evidence_approved', 'assessment_approved'}
    elif application_status == 'evidence_review' and github_status != 'analyzed':
        eligibility_status = 'verification_pending'
        next_stage_unlocked = False
    else:
        eligibility_status = 'review_required'
        next_stage_unlocked = False

    if application_status == 'assessment_review' and assessment_submitted:
        eligibility_message = (
            'Your assessment is submitted and the interview is open now. Recruiter review continues in parallel.'
        )
    elif application_status == 'assessment_review':
        eligibility_message = 'Your assessment is waiting to finish processing before the interview can open.'
    elif not resume_analyzed:
        eligibility_message = 'The resume could not be analyzed. Submit a readable resume before continuing.'
    elif application_status != 'assessment_review' and not candidate.github_url:
        eligibility_message = 'Submit a public GitHub profile URL before continuing.'
    elif application_status != 'assessment_review' and github_status == 'not found':
        eligibility_message = 'The submitted GitHub profile was not found. Check the profile URL and submit the evidence again.'
    elif application_status != 'assessment_review' and application_status == 'evidence_review' and score_eligible and github_status == 'unavailable':
        eligibility_message = (
            'Your current evidence score is greater than the configured threshold, so you can start the assessment now. '
            'GitHub data was unavailable and was excluded from this score.'
        )
    elif application_status != 'assessment_review' and application_status == 'evidence_review' and score_eligible and github_status == 'partial':
        eligibility_message = (
            'Your current evidence score is greater than the configured threshold, so you can start the assessment now. '
            'GitHub analysis is partial; only accessible repository evidence is included.'
        )
    elif application_status != 'assessment_review' and application_status == 'evidence_review' and score_eligible:
        eligibility_message = (
            'Your evidence score is greater than the configured threshold. You can start the assessment now; '
            'a recruiter will review it before the interview stage.'
        )
    elif application_status != 'assessment_review' and application_status == 'evidence_review' and github_status != 'analyzed':
        eligibility_message = (
            f'GitHub analysis is {github_status}: {evidence_report["sources"]["github"]["detail"]}. '
            f'The current score ({fit.score:g}) does not exceed the {policy.screening_threshold:g}-point threshold. '
            'Retry the analysis after GitHub access is restored.'
        )
    elif application_status != 'assessment_review' and application_status == 'evidence_review':
        eligibility_message = (
            f'The evidence score must be greater than {policy.screening_threshold:g} to start the assessment. '
            'Request review or update the submitted evidence.'
        )
    elif application_status in {'evidence_approved', 'assessment_approved', 'human_review'}:
        eligibility_message = None
    else:
        eligibility_message = 'Your evidence is not yet approved for the next stage. Contact the recruiting team if you need an update.'
    return {
        'data': {
            'profile': {'candidate_id': candidate.id, 'target_role': candidate.target_role},
            'report': {
                **evidence_report,
                'eligibility': {
                    'threshold': policy.screening_threshold,
                    'status': eligibility_status,
                    'next_stage_unlocked': next_stage_unlocked,
                    'message': eligibility_message,
                },
                'application_status': application_status,
                'assessment_status': assessment.status if assessment else 'not_started',
                'assessment_responses': assessment_details,
                'interview_status': interview.status if interview else 'not_started',
                'interview_responses': interview_details,
                'integrity_events': integrity_events,
                'final_report': {
                    'summary': final.summary,
                    'overall_score': final.overall_score,
                    'review_status': final.recommendation,
                } if final else None,
            },
        },
        'message': 'Persisted evidence report loaded',
    }


def build_assessment_tasks(role: str, evidence_json: dict) -> list[dict]:
    skills = evidence_json.get('skills_needing_verification') or skills_for_role(role)
    skill = skills[0] if skills else 'a core responsibility of the role'
    return [
        {
            'task_type': 'role-specific technical reasoning',
            'prompt': f'Describe how you would use {skill} to solve a realistic problem in a {role} role. Explain your steps and how you would verify the result.',
            'rubric': 'Role relevance, reasoning, verification approach, and clarity',
        },
        {
            'task_type': 'troubleshooting',
            'prompt': f'A solution involving {skill} behaves correctly in one case but fails in another. How would you isolate the cause and reduce the risk of your fix?',
            'rubric': 'Structured diagnosis, alternatives, and safe validation',
        },
        {
            'task_type': 'communication',
            'prompt': 'Explain a complex work decision to a non-specialist stakeholder. What would you simplify, and how would you check they understood the trade-off?',
            'rubric': 'Audience awareness, clear explanation, and confirmation',
        },
        {
            'task_type': 'teamwork and prioritization',
            'prompt': f'A teammate disagrees with your proposed approach to a {role} deliverable while the deadline is close. How would you resolve the disagreement and decide what to do?',
            'rubric': 'Listening, evidence-based decision, and prioritization',
        },
    ]


@app.get('/api/assessment')
def get_assessment(candidate_id: str = Query(...), db: Session = Depends(get_db)) -> dict:
    candidate = require_eligible_candidate(db, candidate_id)
    fit = get_latest_fit(db, candidate_id)
    assert fit is not None
    session = (
        db.query(AssessmentSession)
        .filter(
            AssessmentSession.candidate_profile_id == candidate_id,
            AssessmentSession.status.in_(['in_progress', 'completed']),
        )
        .order_by(AssessmentSession.started_at.desc())
        .first()
    )
    if session is None:
        session = AssessmentSession(
            candidate_profile_id=candidate_id,
            status='in_progress',
            started_at=datetime.utcnow(),
            duration_seconds=600,
        )
        db.add(session)
        db.flush()
        for position, task in enumerate(build_assessment_tasks(candidate.target_role or 'the selected role', fit.evidence_json), 1):
            db.add(AssessmentTask(
                session_id=session.id,
                task_type=task['task_type'],
                prompt=task['prompt'],
                rubric=task['rubric'],
                weight=1 / 4,
                position=position,
            ))
        db.commit()
    tasks = (
        db.query(AssessmentTask)
        .filter(AssessmentTask.session_id == session.id)
        .order_by(AssessmentTask.position)
        .all()
    )
    saved_responses = (
        db.query(AssessmentResponse)
        .join(AssessmentTask)
        .filter(AssessmentTask.session_id == session.id)
        .all()
    )
    return {
        'data': {
            'session_id': session.id,
            'candidate_id': candidate_id,
            'status': session.status,
            'time_limit_seconds': 600,
            'title': f'Role assessment: {candidate.target_role}',
            'tasks': [
                {
                    'id': task.id,
                    'task_type': task.task_type,
                    'prompt': task.prompt,
                    'rubric': task.rubric,
                    'weight': task.weight,
                    'position': task.position,
                    'answer': next(
                        (response.answer_text for response in saved_responses if response.task_id == task.id),
                        '',
                    ),
                }
                for task in tasks
            ],
        },
        'message': 'Assessment session loaded from persistent storage',
    }


@app.post('/api/assessment/submit')
def submit_assessment(payload: dict, db: Session = Depends(get_db)) -> dict:
    session_id = payload.get('session_id')
    answers = payload.get('answers')
    if not isinstance(session_id, str) or not isinstance(answers, dict):
        raise HTTPException(status_code=400, detail='session_id and answers object are required')
    session = db.get(AssessmentSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail='Assessment session was not found')
    if session.status != 'in_progress':
        raise HTTPException(status_code=409, detail='Assessment has already been submitted')
    tasks = db.query(AssessmentTask).filter(AssessmentTask.session_id == session.id).all()
    valid_ids = {task.id for task in tasks}
    if set(answers) - valid_ids:
        raise HTTPException(status_code=400, detail='Answers include an unknown task')
    saved_count = 0
    for task in tasks:
        answer = answers.get(task.id, '')
        if not isinstance(answer, str):
            raise HTTPException(status_code=400, detail='Every answer must be text')
        if answer.strip():
            db.add(AssessmentResponse(
                task_id=task.id,
                answer_text=answer.strip()[:20_000],
                submitted_at=datetime.utcnow(),
            ))
            saved_count += 1
    if saved_count == 0 and not payload.get('time_expired'):
        raise HTTPException(status_code=400, detail='Answer at least one task before submitting')
    session.status = 'completed'
    session.ended_at = datetime.utcnow()
    session.duration_seconds = int((session.ended_at - (session.started_at or session.ended_at)).total_seconds())
    application = (
        db.query(Application)
        .filter(Application.candidate_profile_id == session.candidate_profile_id)
        .order_by(Application.created_at.desc())
        .first()
    )
    if application:
        application.status = 'assessment_review'
    db.commit()
    return {
        'message': 'Assessment answers saved successfully',
        'data': {
            'status': 'submitted',
            'session_id': session.id,
            'answered_count': saved_count,
            'time_expired': bool(payload.get('time_expired')),
            'score': None,
            'score_note': 'Responses are saved for human review; the local demo does not automatically score or reject candidates.',
        },
    }


def add_interview_question(
    db: Session,
    session: InterviewSession,
    *,
    text: str,
    category: str,
    target: str,
) -> InterviewQuestion:
    question = InterviewQuestion(
        interview_session_id=session.id,
        question_text=text,
        category=category,
        evidence_target=target,
        position=db.query(InterviewQuestion).filter(InterviewQuestion.interview_session_id == session.id).count(),
    )
    db.add(question)
    db.flush()
    return question


def initial_question(role: str, skill: str) -> tuple[str, str, str]:
    return (
        f'Choose a real example relevant to your {role} work. How did you use {skill}, what alternatives did you consider, and how did you verify the outcome?',
        'hard skill',
        f'{skill} reasoning and project ownership',
    )


@app.get('/api/interview')
def get_interview(candidate_id: str = Query(...), db: Session = Depends(get_db)) -> dict:
    candidate = get_candidate_or_404(db, candidate_id)
    assessment = (
        db.query(AssessmentSession)
        .filter(
            AssessmentSession.candidate_profile_id == candidate_id,
            AssessmentSession.status == 'completed',
        )
        .order_by(AssessmentSession.ended_at.desc())
        .first()
    )
    application = get_latest_application(db, candidate_id)
    if assessment is None:
        raise HTTPException(status_code=409, detail='Submit the assessment before starting the voice interview')
    if application is None or application.status not in {'assessment_review', 'assessment_approved'}:
        raise HTTPException(
            status_code=409,
            detail='Submit the assessment before starting the voice interview',
        )
    policy = get_policy(db)
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_profile_id == candidate_id,
            InterviewSession.status.in_(['in_progress', 'ready_to_submit', 'submitted']),
        )
        .order_by(InterviewSession.started_at.desc())
        .first()
    )
    if session is None:
        session = InterviewSession(
            candidate_profile_id=candidate_id,
            status='in_progress',
            question_count=policy.question_count,
            max_minutes_per_question=policy.max_minutes_per_question,
            started_at=datetime.utcnow(),
        )
        db.add(session)
        db.flush()
        fit = get_latest_fit(db, candidate_id)
        skills = fit.evidence_json.get('skills_needing_verification', []) if fit else []
        skill = skills[0] if skills else 'a core role competency'
        text, category, target = initial_question(candidate.target_role or 'the selected role', skill)
        add_interview_question(db, session, text=text, category=category, target=target)
        db.commit()
    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_session_id == session.id)
        .order_by(InterviewQuestion.position)
        .all()
    )
    last_answer = (
        db.query(InterviewResponse)
        .filter(InterviewResponse.interview_session_id == session.id)
        .order_by(InterviewResponse.created_at.desc())
        .first()
    )
    answered_question_ids = {
        response.question_id
        for response in db.query(InterviewResponse.question_id)
        .filter(InterviewResponse.interview_session_id == session.id)
        .all()
    }
    next_question = next(
        (question for question in reversed(questions) if question.id not in answered_question_ids),
        None,
    )
    last_question = db.get(InterviewQuestion, last_answer.question_id) if last_answer else None
    return {
        'data': {
            'session_id': session.id,
            'candidate_id': candidate_id,
            'status': session.status,
            'question_count': session.question_count,
            'response_count': len(answered_question_ids),
            'max_response_minutes': session.max_minutes_per_question,
            'expected_duration_minutes': session.question_count * session.max_minutes_per_question,
            'current_question_id': next_question.id if next_question else None,
            'current_question_index': next_question.position // 2 if next_question else session.question_count,
            'current_is_follow_up': next_question.category == 'adaptive follow-up' if next_question else False,
            'current_question': {
                'id': next_question.id,
                'category': next_question.category,
                'question_text': next_question.question_text,
                'evidence_target': next_question.evidence_target,
                'position': next_question.position,
            } if next_question else None,
            'questions': [
                {
                    'id': question.id,
                    'category': question.category,
                    'question_text': question.question_text,
                    'evidence_target': question.evidence_target,
                    'position': question.position,
                }
                for question in questions
            ],
            'last_saved_response': {
                'question_id': last_question.id,
                'answer': last_answer.answer_text,
            } if last_answer and last_question else None,
        },
        'message': 'Persistent adaptive interview session loaded',
    }


@app.post('/api/interview/consent')
def set_interview_consent(payload: dict, db: Session = Depends(get_db)) -> dict:
    session = db.get(InterviewSession, payload.get('session_id', ''))
    if session is None or session.status != 'in_progress':
        raise HTTPException(status_code=404, detail='Active interview session was not found')
    camera = payload.get('camera') is True
    microphone = payload.get('microphone') is True
    if not camera or not microphone:
        raise HTTPException(status_code=400, detail='Camera and microphone consent are both required')
    record = ConsentRecord(
        candidate_profile_id=session.candidate_profile_id,
        has_camera_consent=camera,
        has_microphone_consent=microphone,
        consent_text=f'Local demo consent for interview session {session.id}; no raw audio/video is uploaded or stored.',
    )
    db.add(record)
    db.commit()
    return {'message': 'Consent recorded', 'data': {'camera': camera, 'microphone': microphone, 'status': 'ready'}}


@app.post('/api/interview/answer')
def submit_interview_answer(payload: dict, db: Session = Depends(get_db)) -> dict:
    session = db.get(InterviewSession, payload.get('session_id', ''))
    if session is None or session.status != 'in_progress':
        raise HTTPException(status_code=404, detail='Active interview session was not found')
    if not isinstance(payload.get('answer'), str) or not payload['answer'].strip():
        raise HTTPException(status_code=400, detail='A spoken answer transcript is required')
    question = db.get(InterviewQuestion, payload.get('question_id', ''))
    if question is None or question.interview_session_id != session.id:
        raise HTTPException(status_code=400, detail='question_id is not part of this interview')
    if db.query(InterviewResponse).filter(
        InterviewResponse.interview_session_id == session.id,
        InterviewResponse.question_id == question.id,
    ).first():
        raise HTTPException(status_code=409, detail='A response for this question has already been saved')

    answer = ' '.join(payload['answer'].split())[:20_000]
    db.add(InterviewResponse(
        interview_session_id=session.id,
        question_id=question.id,
        answer_text=answer,
        created_at=datetime.utcnow(),
    ))
    is_follow_up = question.category == 'adaptive follow-up'
    role = get_candidate_or_404(db, session.candidate_profile_id).target_role or 'the selected role'
    if not is_follow_up:
        follow_up = adaptive_follow_up(answer, question.category, question.evidence_target or 'the example')
        next_question = add_interview_question(
            db,
            session,
            text=follow_up,
            category='adaptive follow-up',
            target=question.evidence_target or 'candidate-specific explanation',
        )
        db.commit()
        return {
            'message': 'Answer saved; personalized follow-up generated',
            'data': {
                'status': 'follow_up',
                'next_question': {
                    'id': next_question.id,
                    'category': next_question.category,
                    'question_text': next_question.question_text,
                    'evidence_target': next_question.evidence_target,
                    'position': next_question.position,
                },
            },
        }

    base_index = question.position // 2
    if base_index + 1 >= session.question_count:
        session.status = 'ready_to_submit'
        db.commit()
        return {
            'message': 'Interview responses saved; final review and submission are required',
            'data': {'status': 'ready_to_submit', 'next_question': None},
        }

    previous_answer = answer
    anchor_terms = [
        word for word in re.findall(r'[A-Za-z][A-Za-z0-9+#.-]{2,}', previous_answer)
        if word.lower() not in {'the', 'and', 'with', 'that', 'this', 'from', 'have', 'were'}
    ]
    anchor = ' '.join(dict.fromkeys(anchor_terms[:5])) or 'the example you gave'
    category = 'soft skill' if (base_index + 1) % 2 else 'hard skill'
    if category == 'soft skill':
        text = (
            f'You described {anchor}. How did you explain that decision to other people, '
            'what feedback or disagreement did you encounter, and what would you change next time?'
        )
        target = 'communication, collaboration, and reflection'
    else:
        fit = get_latest_fit(db, session.candidate_profile_id)
        skills = fit.evidence_json.get('skills_needing_verification', []) if fit else []
        skill = skills[(base_index + 1) % len(skills)] if skills else 'a core responsibility'
        text = (
            f'Building on your example about {anchor}, how would your approach change if the workload or '
            f'constraints changed substantially in a {role} context? Explain what you would measure.'
        )
        target = f'{skill} application and reasoning under changed constraints'
    next_question = add_interview_question(
        db,
        session,
        text=text,
        category=category,
        target=target,
    )
    db.commit()
    return {
        'message': 'Answer saved; next role-relevant question generated from the previous answer',
        'data': {
            'status': 'next_question',
            'next_question': {
                'id': next_question.id,
                'category': next_question.category,
                'question_text': next_question.question_text,
                'evidence_target': next_question.evidence_target,
                'position': next_question.position,
            },
        },
    }


@app.post('/api/interview/integrity-event')
def record_integrity_event(payload: dict, db: Session = Depends(get_db)) -> dict:
    session = db.get(InterviewSession, payload.get('session_id', ''))
    if session is None or session.status not in {'in_progress', 'ready_to_submit'}:
        raise HTTPException(status_code=404, detail='Active interview session was not found')
    event_type = payload.get('event_type')
    if not isinstance(event_type, str) or event_type not in {
        'multiple_faces', 'no_face', 'camera_disconnected', 'microphone_disconnected',
        'tab_hidden', 'transcription_error', 'face_check_unavailable',
    }:
        raise HTTPException(status_code=400, detail='Unsupported integrity event type')
    confidence = payload.get('confidence', 0.5)
    if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        raise HTTPException(status_code=400, detail='confidence must be between 0 and 1')
    event = IntegrityEvent(
        session_id=session.id,
        event_type=event_type,
        severity='review' if confidence >= 0.8 else 'info',
        confidence=float(confidence),
        notes=str(payload.get('context', ''))[:1000],
        review_status='unreviewed',
    )
    db.add(event)
    db.commit()
    return {
        'message': 'Integrity signal stored for human review; it is not a misconduct finding',
        'data': {
            'id': event.id,
            'created_at': event.created_at.isoformat(),
            'confidence': event.confidence,
            'review_status': event.review_status,
        },
    }


@app.post('/api/interview/submit')
def submit_interview(payload: dict, db: Session = Depends(get_db)) -> dict:
    session = db.get(InterviewSession, payload.get('session_id', ''))
    if session is None:
        raise HTTPException(status_code=404, detail='Interview session was not found')
    if session.status == 'submitted':
        raise HTTPException(status_code=409, detail='Interview has already been submitted')
    if session.status != 'ready_to_submit':
        raise HTTPException(status_code=409, detail='Complete all interview questions before submission')
    responses = (
        db.query(InterviewResponse)
        .filter(InterviewResponse.interview_session_id == session.id)
        .order_by(InterviewResponse.created_at)
        .all()
    )
    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_session_id == session.id)
        .order_by(InterviewQuestion.position)
        .all()
    )
    saved = {response.question_id for response in responses}
    unanswered = [question.id for question in questions if question.id not in saved]
    if unanswered:
        raise HTTPException(status_code=409, detail='Every displayed question must have a saved response')
    candidate = get_candidate_or_404(db, session.candidate_profile_id)
    fit = get_latest_fit(db, candidate.id)
    final_report = FinalReport(
        candidate_profile_id=candidate.id,
        job_id=fit.job_id if fit else '',
        overall_score=fit.score if fit else 0,
        recommendation='human_review_required',
        summary=(
            f'{len(responses)} spoken responses saved for {candidate.target_role}. '
            'Answers and technical integrity signals require recruiter review; no automated hiring decision was made.'
        ),
    )
    db.add(final_report)
    session.status = 'submitted'
    session.ended_at = datetime.utcnow()
    application = (
        db.query(Application)
        .filter(Application.candidate_profile_id == candidate.id)
        .order_by(Application.created_at.desc())
        .first()
    )
    if application:
        application.status = 'human_review'
    db.commit()
    return {
        'message': 'Submitted Successfully. Your assessment has been received. Your results will be reviewed according to the recruitment process.',
        'data': {
            'status': 'submitted',
            'submitted_at': session.ended_at.isoformat(),
            'response_count': len(responses),
            'report_id': final_report.id,
        },
    }


@app.get('/api/recruiter/dashboard')
def get_recruiter_dashboard(db: Session = Depends(get_db)) -> dict:
    applications = (
        db.query(Application)
        .join(CandidateProfile)
        .filter(CandidateProfile.user_id.is_(None))
        .all()
    )
    scores = (
        db.query(RoleFitReport.score)
        .join(CandidateProfile, RoleFitReport.candidate_profile_id == CandidateProfile.id)
        .filter(CandidateProfile.user_id.is_(None))
        .all()
    )
    role_fit_values = [row[0] for row in scores]
    active_jobs = db.query(Job).filter(Job.status == 'open', Job.recruiter_id.is_(None)).count()
    return {
        'data': {
            'candidate_count': len({application.candidate_profile_id for application in applications}),
            'active_jobs': active_jobs,
            'jobs_to_review': sum(application.status in {'evidence_review', 'assessment_review', 'human_review', 'in_review'} for application in applications),
            'avg_role_fit': round(sum(role_fit_values) / len(role_fit_values), 1) if role_fit_values else 0,
            'risk_flags': ['Signals are advisory; recruiter review is required.'] if applications else [],
            'applications': [
                {
                    'candidate_id': application.candidate_profile_id,
                    'candidate_role': application.candidate_profile.target_role,
                    'job_title': application.job.title,
                    'status': application.status,
                    'next_stage': (
                        'assessment' if application.status == 'evidence_review'
                        else 'interview' if application.status == 'assessment_review'
                        else None
                    ),
                    'role_fit': (
                        get_latest_fit(db, application.candidate_profile_id).score
                        if get_latest_fit(db, application.candidate_profile_id) else None
                    ),
                }
                for application in applications
            ],
        },
        'message': 'Recruiter dashboard loaded from saved application data',
    }


@app.post('/api/recruiter/applications/{candidate_id}/approve-next-stage')
def approve_application_next_stage(candidate_id: str, db: Session = Depends(get_db)) -> dict:
    application = get_latest_application(db, candidate_id)
    if application is None:
        raise HTTPException(status_code=404, detail='Candidate application was not found')

    if application.status == 'evidence_review':
        fit = get_latest_fit(db, candidate_id)
        if fit is None:
            raise HTTPException(status_code=409, detail='Complete resume and GitHub evidence analysis before review')
        sources = fit.evidence_json.get('sources', {})
        if sources.get('resume', {}).get('status') != 'analyzed' or sources.get('github', {}).get('status') != 'analyzed':
            raise HTTPException(status_code=409, detail='Both resume and GitHub must be analyzed before the assessment can be approved')
        threshold = get_policy(db).screening_threshold
        if fit.score <= threshold:
            raise HTTPException(
                status_code=409,
                detail=f'Role evidence score {fit.score} must be greater than the configured progression threshold of {threshold}',
            )
        application.status = 'evidence_approved'
        next_stage = 'assessment'
    elif application.status == 'assessment_review':
        application.status = 'assessment_approved'
        next_stage = 'interview'
    else:
        raise HTTPException(status_code=409, detail='This application is not waiting for approval to advance')

    db.commit()
    return {
        'message': f'Application approved to continue to the {next_stage} stage',
        'data': {
            'candidate_id': candidate_id,
            'application_status': application.status,
            'next_stage': next_stage,
        },
    }


@app.get('/api/recruiter/reports/{candidate_id}')
def get_recruiter_report(candidate_id: str, db: Session = Depends(get_db)) -> dict:
    return candidate_report(candidate_id, db)


@app.get('/api/admin/settings')
def get_admin_settings(db: Session = Depends(get_db)) -> dict:
    policy = get_policy(db)
    return {
        'data': {
            'provider_status': [{
                'provider': settings.ai_provider,
                'model': settings.ai_model,
                'status': 'local demo; external provider not configured',
            }],
            'retention_policies': {
                'resume_retention_days': policy.retention_days,
                'recording_retention_days': 0,
                'audit_log_days': policy.retention_days,
            },
            'policy': {
                'screening_threshold': policy.screening_threshold,
                'question_count': policy.question_count,
                'max_minutes_per_question': policy.max_minutes_per_question,
                'retention_days': policy.retention_days,
            },
            'role_weights': policy.role_weights_json or {},
        },
        'message': 'Persisted local recruitment policy loaded; production authentication and retention enforcement are not configured',
    }


@app.put('/api/admin/settings/policy')
def update_policy(payload: dict, db: Session = Depends(get_db)) -> dict:
    policy = get_policy(db)
    threshold = payload.get('screening_threshold', policy.screening_threshold)
    question_count = payload.get('question_count', policy.question_count)
    minutes = payload.get('max_minutes_per_question', policy.max_minutes_per_question)
    retention_days = payload.get('retention_days', policy.retention_days)
    if not isinstance(threshold, (int, float)) or not 0 <= threshold <= 100:
        raise HTTPException(status_code=422, detail='screening_threshold must be between 0 and 100')
    if not isinstance(question_count, int) or not 1 <= question_count <= 25:
        raise HTTPException(status_code=422, detail='question_count must be between 1 and 25')
    if not isinstance(minutes, int) or not 1 <= minutes <= 5:
        raise HTTPException(status_code=422, detail='max_minutes_per_question must be between 1 and 5')
    if not isinstance(retention_days, int) or not 1 <= retention_days <= 3650:
        raise HTTPException(status_code=422, detail='retention_days must be between 1 and 3650')
    policy.screening_threshold = float(threshold)
    policy.question_count = question_count
    policy.max_minutes_per_question = minutes
    policy.retention_days = retention_days
    db.commit()
    return {'message': 'Recruitment policy saved', 'data': payload}


@app.put('/api/admin/settings/role-weights')
def update_role_weights(payload: dict, db: Session = Depends(get_db)) -> dict:
    role = payload.get('role')
    weights = payload.get('weights')
    if not isinstance(role, str) or not role.strip() or len(role.strip()) > 120:
        raise HTTPException(status_code=422, detail='Enter a valid role title')
    required = {
        'required_skill_alignment',
        'experience_evidence',
        'github_evidence',
        'education_qualifications',
        'achievements',
    }
    if not isinstance(weights, dict) or set(weights) != required:
        raise HTTPException(status_code=422, detail='Weights must include all five documented scoring categories')
    if any(not isinstance(value, (int, float)) or value < 0 for value in weights.values()):
        raise HTTPException(status_code=422, detail='Each role weight must be a non-negative number')
    if sum(weights.values()) <= 0:
        raise HTTPException(status_code=422, detail='At least one role weight must be greater than zero')
    policy = get_policy(db)
    all_weights = dict(policy.role_weights_json or {})
    all_weights[' '.join(role.split())] = {key: float(value) for key, value in weights.items()}
    policy.role_weights_json = all_weights
    db.commit()
    return {'message': 'Role-specific weights saved', 'data': {'role': role.strip(), 'weights': weights}}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app.main:app', host='127.0.0.1', port=8000)
