from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default='candidate')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate_profile: Mapped['CandidateProfile | None'] = relationship(back_populates='user')
    recruiter_profile: Mapped['RecruiterProfile | None'] = relationship(back_populates='user')
    audit_logs: Mapped[list['AuditLog']] = relationship(back_populates='user')


class CandidateProfile(Base):
    __tablename__ = 'candidate_profiles'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(ForeignKey('users.id'), unique=True, nullable=True)
    target_role: Mapped[str | None] = mapped_column(String, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    github_url: Mapped[str | None] = mapped_column(String, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String, nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User | None] = relationship(back_populates='candidate_profile')
    applications: Mapped[list['Application']] = relationship(back_populates='candidate_profile')
    extracted_claims: Mapped[list['ExtractedClaim']] = relationship(back_populates='candidate_profile')
    skill_evidence: Mapped[list['SkillEvidence']] = relationship(back_populates='candidate_profile')
    assessment_sessions: Mapped[list['AssessmentSession']] = relationship(back_populates='candidate_profile')
    interview_sessions: Mapped[list['InterviewSession']] = relationship(back_populates='candidate_profile')


class RecruiterProfile(Base):
    __tablename__ = 'recruiter_profiles'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), unique=True)
    company: Mapped[str | None] = mapped_column(String, nullable=True)
    team: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates='recruiter_profile')
    jobs: Mapped[list['Job']] = relationship(back_populates='recruiter_profile')


class Job(Base):
    __tablename__ = 'jobs'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recruiter_id: Mapped[str | None] = mapped_column(ForeignKey('recruiter_profiles.id'), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default='open')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recruiter_profile: Mapped['RecruiterProfile | None'] = relationship(back_populates='jobs')
    requirements: Mapped[list['JobRequirement']] = relationship(back_populates='job')
    applications: Mapped[list['Application']] = relationship(back_populates='job')


class JobRequirement(Base):
    __tablename__ = 'job_requirements'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'))
    skill_name: Mapped[str] = mapped_column(String, nullable=False)
    required_level: Mapped[str | None] = mapped_column(String, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    is_must_have: Mapped[bool] = mapped_column(Boolean, default=False)

    job: Mapped[Job] = relationship(back_populates='requirements')


class Application(Base):
    __tablename__ = 'applications'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str] = mapped_column(ForeignKey('candidate_profiles.id'))
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'))
    status: Mapped[str] = mapped_column(String, default='submitted')
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate_profile: Mapped[CandidateProfile] = relationship(back_populates='applications')
    job: Mapped[Job] = relationship(back_populates='applications')


class UploadedDocument(Base):
    __tablename__ = 'uploaded_documents'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str | None] = mapped_column(String, nullable=True)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String, nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProfileConnection(Base):
    __tablename__ = 'profile_connections'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str | None] = mapped_column(ForeignKey('candidate_profiles.id'), nullable=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default='connected')
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ExtractedClaim(Base):
    __tablename__ = 'extracted_claims'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str] = mapped_column(ForeignKey('candidate_profiles.id'))
    source: Mapped[str] = mapped_column(String, nullable=False)
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    verification_status: Mapped[str] = mapped_column(String, default='needs_review')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate_profile: Mapped[CandidateProfile] = relationship(back_populates='extracted_claims')


class SkillEvidence(Base):
    __tablename__ = 'skill_evidence'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str] = mapped_column(ForeignKey('candidate_profiles.id'))
    skill_name: Mapped[str] = mapped_column(String, nullable=False)
    claimed_level: Mapped[str | None] = mapped_column(String, nullable=True)
    evidence_source: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    verification_status: Mapped[str] = mapped_column(String, default='not_assessed')
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate_profile: Mapped[CandidateProfile] = relationship(back_populates='skill_evidence')


class AssessmentSession(Base):
    __tablename__ = 'assessment_sessions'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str] = mapped_column(ForeignKey('candidate_profiles.id'))
    status: Mapped[str] = mapped_column(String, default='in_progress')
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)

    candidate_profile: Mapped[CandidateProfile] = relationship(back_populates='assessment_sessions')
    tasks: Mapped[list['AssessmentTask']] = relationship(back_populates='session')


class AssessmentTask(Base):
    __tablename__ = 'assessment_tasks'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey('assessment_sessions.id'))
    task_type: Mapped[str] = mapped_column(String, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    rubric: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    position: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped[AssessmentSession] = relationship(back_populates='tasks')
    responses: Mapped[list['AssessmentResponse']] = relationship(back_populates='task')


class AssessmentResponse(Base):
    __tablename__ = 'assessment_responses'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey('assessment_tasks.id'))
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    task: Mapped[AssessmentTask] = relationship(back_populates='responses')


class InterviewSession(Base):
    __tablename__ = 'interview_sessions'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str] = mapped_column(ForeignKey('candidate_profiles.id'))
    status: Mapped[str] = mapped_column(String, default='scheduled')
    question_count: Mapped[int] = mapped_column(Integer, default=25)
    max_minutes_per_question: Mapped[int] = mapped_column(Integer, default=5)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    candidate_profile: Mapped[CandidateProfile] = relationship(back_populates='interview_sessions')
    questions: Mapped[list['InterviewQuestion']] = relationship(back_populates='interview_session')
    responses: Mapped[list['InterviewResponse']] = relationship(back_populates='interview_session')


class InterviewQuestion(Base):
    __tablename__ = 'interview_questions'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interview_session_id: Mapped[str] = mapped_column(ForeignKey('interview_sessions.id'))
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    evidence_target: Mapped[str | None] = mapped_column(String, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    interview_session: Mapped[InterviewSession] = relationship(back_populates='questions')
    responses: Mapped[list['InterviewResponse']] = relationship(back_populates='question')


class InterviewResponse(Base):
    __tablename__ = 'interview_responses'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    interview_session_id: Mapped[str] = mapped_column(ForeignKey('interview_sessions.id'))
    question_id: Mapped[str] = mapped_column(ForeignKey('interview_questions.id'))
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript_path: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    interview_session: Mapped[InterviewSession] = relationship(back_populates='responses')
    question: Mapped[InterviewQuestion] = relationship(back_populates='responses')


class EvaluationResult(Base):
    __tablename__ = 'evaluation_results'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    item_type: Mapped[str] = mapped_column(String, default='interview')
    score: Mapped[float] = mapped_column(Float, default=0.0)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IntegrityEvent(Base):
    __tablename__ = 'integrity_events'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, default='info')
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String, default='unreviewed')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ConsentRecord(Base):
    __tablename__ = 'consent_records'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str | None] = mapped_column(ForeignKey('candidate_profiles.id'), nullable=True)
    has_camera_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    has_microphone_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReviewerNote(Base):
    __tablename__ = 'reviewer_notes'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewer_name: Mapped[str] = mapped_column(String, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FinalReport(Base):
    __tablename__ = 'final_reports'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str] = mapped_column(ForeignKey('candidate_profiles.id'))
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'))
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    recommendation: Mapped[str] = mapped_column(String, default='more_evidence_required')
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RoleFitReport(Base):
    __tablename__ = 'role_fit_reports'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_profile_id: Mapped[str] = mapped_column(ForeignKey('candidate_profiles.id'), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'))
    score: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, default=60)
    evidence_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecruitmentPolicy(Base):
    __tablename__ = 'recruitment_policies'

    id: Mapped[str] = mapped_column(String, primary_key=True, default='default')
    screening_threshold: Mapped[float] = mapped_column(Float, default=60)
    question_count: Mapped[int] = mapped_column(Integer, default=6)
    max_minutes_per_question: Mapped[int] = mapped_column(Integer, default=5)
    retention_days: Mapped[int] = mapped_column(Integer, default=90)
    role_weights_json: Mapped[dict] = mapped_column(JSON, default=dict)


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User | None] = relationship(back_populates='audit_logs')


class AIProviderConfiguration(Base):
    __tablename__ = 'ai_provider_configurations'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider: Mapped[str] = mapped_column(String, nullable=False)
    model_name: Mapped[str] = mapped_column(String, nullable=False)
    api_key_env_var: Mapped[str | None] = mapped_column(String, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mode: Mapped[str] = mapped_column(String, default='local')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
