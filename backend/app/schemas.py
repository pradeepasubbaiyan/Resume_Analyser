from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RoleFitBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    metric: str
    score: float
    evidence: list[str] = Field(default_factory=list)


class CandidateProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    target_role: str | None = None
    summary: str | None = None
    experience_years: int | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None


class JobSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    department: str | None = None
    location: str | None = None
    status: str = 'open'
    description: str | None = None


class AssessmentTaskSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_type: str
    prompt: str
    weight: float
    position: int


class InterviewQuestionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    question_text: str
    evidence_target: str | None = None
    position: int


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    config_mode: str
    timestamp: str


class ConfigResponse(BaseModel):
    app_name: str
    app_env: str
    ai_provider: str
    ai_model: str
    allowed_origins: list[str]
    demo_mode: bool = True


class DashboardSummary(BaseModel):
    candidate_count: int
    active_jobs: int
    jobs_to_review: int
    avg_role_fit: float
    risk_flags: list[str]


class ApiEnvelope(BaseModel):
    data: dict[str, Any]
    message: str | None = None
