from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AIProviderConfiguration,
    Application,
    AssessmentSession,
    CandidateProfile,
    ConsentRecord,
    FinalReport,
    InterviewSession,
    Job,
    JobRequirement,
    RecruiterProfile,
    User,
)


def seed_demo_data() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin = User(
                email='admin@verityhire.ai',
                password_hash='demo-hash-admin',
                full_name='Alicia Morgan',
                role='admin',
            )
            recruiter = User(
                email='recruiter@verityhire.ai',
                password_hash='demo-hash-recruiter',
                full_name='Jordan Lee',
                role='recruiter',
            )
            candidate = User(
                email='candidate@verityhire.ai',
                password_hash='demo-hash-candidate',
                full_name='Maya Patel',
                role='candidate',
            )
            db.add_all([admin, recruiter, candidate])
            db.flush()

            candidate_profile = CandidateProfile(
                user_id=candidate.id,
                target_role='Full-Stack Developer',
                summary='Full-stack engineer with product-minded experience in cloud delivery, APIs, and analytics tooling.',
                experience_years=5,
                github_url='https://github.com/mayapatel',
                linkedin_url='https://linkedin.com/in/mayapatel',
                portfolio_url='https://mayapatel.dev',
            )
            db.add(candidate_profile)
            db.flush()

            recruiter_profile = RecruiterProfile(
                user_id=recruiter.id,
                company='Northstar Labs',
                team='Platform Hiring',
            )
            db.add(recruiter_profile)
            db.flush()

            job = Job(
                recruiter_id=recruiter_profile.id,
                title='Full-Stack Developer',
                department='Engineering',
                location='Remote',
                employment_type='Full-time',
                description='Design and ship secure customer-facing web applications with a strong backend and product mindset.',
            )
            db.add(job)
            db.flush()

            db.add_all(
                [
                    JobRequirement(job_id=job.id, skill_name='React', required_level='Advanced', weight=0.2, is_must_have=True),
                    JobRequirement(job_id=job.id, skill_name='Python', required_level='Advanced', weight=0.2, is_must_have=True),
                    JobRequirement(job_id=job.id, skill_name='System design', required_level='Advanced', weight=0.15, is_must_have=False),
                    JobRequirement(job_id=job.id, skill_name='SQL', required_level='Strong', weight=0.1, is_must_have=True),
                    JobRequirement(job_id=job.id, skill_name='Communication', required_level='Strong', weight=0.1, is_must_have=False),
                ]
            )

            application = Application(
                candidate_profile_id=candidate_profile.id,
                job_id=job.id,
                status='in_review',
                score=86.4,
            )
            db.add(application)

            assessment = AssessmentSession(
                candidate_profile_id=candidate_profile.id,
                status='completed',
                started_at=datetime.utcnow(),
                ended_at=datetime.utcnow(),
                duration_seconds=600,
                score=82.4,
            )
            db.add(assessment)
            db.flush()

            interview = InterviewSession(
                candidate_profile_id=candidate_profile.id,
                status='completed',
                question_count=25,
                max_minutes_per_question=5,
            )
            db.add(interview)
            db.flush()

            db.add_all(
                [
                    AIProviderConfiguration(
                        provider='openai',
                        model_name='gpt-4o-mini',
                        api_key_env_var='OPENAI_API_KEY',
                        enabled=False,
                        mode='local',
                    ),
                    AIProviderConfiguration(
                        provider='azure-openai',
                        model_name='gpt-4.1-mini',
                        api_key_env_var='AZURE_OPENAI_KEY',
                        enabled=False,
                        mode='configurable',
                    ),
                    ConsentRecord(
                        candidate_profile_id=candidate_profile.id,
                        has_camera_consent=True,
                        has_microphone_consent=True,
                        consent_text='Candidate consent provided for interview recording and transcription in review mode.',
                    ),
                    FinalReport(
                        candidate_profile_id=candidate_profile.id,
                        job_id=job.id,
                        overall_score=86.4,
                        recommendation='strong_evidence_of_competency',
                        summary='Strong evidence across product engineering, API design, and frontend delivery. Minor follow-up needed on performance tuning and long-term architecture trade-offs.',
                    ),
                ]
            )
            db.commit()

    finally:
        db.close()


def get_demo_payload() -> dict:
    return {
        'system': {
            'name': 'VerityHire AI',
            'mode': 'local-development',
            'status': 'ready',
            'security_note': 'AI outputs are evaluated with structured rubrics and never used to auto-reject a candidate.',
        },
        'jobs': [
            {
                'id': 'job-full-stack',
                'title': 'Full-Stack Developer',
                'department': 'Engineering',
                'location': 'Remote',
                'status': 'open',
                'description': 'Build and iterate on secure product experiences with backend and frontend ownership.',
                'skills': ['React', 'Python', 'SQL', 'System design', 'Communication'],
                'weights': {'required_skill_alignment': 35, 'experience_evidence': 25, 'practical_evidence': 25, 'role_specific_competencies': 15},
            },
            {
                'id': 'job-data-analyst',
                'title': 'Data Analyst',
                'department': 'Insights',
                'location': 'Hybrid',
                'status': 'open',
                'description': 'Convert business questions into measurable insights, dashboards, and operational recommendations.',
                'skills': ['SQL', 'Python', 'Visualization', 'Stakeholder communication'],
                'weights': {'required_skill_alignment': 35, 'experience_evidence': 25, 'practical_evidence': 25, 'role_specific_competencies': 15},
            },
        ],
        'candidate_profile': {
            'id': 'candidate-demo',
            'title': 'Maya Patel',
            'target_role': 'Full-Stack Developer',
            'summary': 'Product-minded full-stack developer with API, analytics, and cloud deployment experience.',
            'experience_years': 5,
            'github_url': 'https://github.com/mayapatel',
            'linkedin_url': 'https://linkedin.com/in/mayapatel',
            'portfolio_url': 'https://mayapatel.dev',
            'skills': [
                {'name': 'React', 'confidence': 0.91, 'status': 'strong evidence of competency', 'source': 'portfolio, resume'},
                {'name': 'Python', 'confidence': 0.89, 'status': 'strong evidence of competency', 'source': 'github, resume'},
                {'name': 'SQL', 'confidence': 0.83, 'status': 'strong evidence of competency', 'source': 'project evidence'},
                {'name': 'API design', 'confidence': 0.79, 'status': 'competency partially demonstrated', 'source': 'assessment'},
                {'name': 'System design', 'confidence': 0.73, 'status': 'more evidence required', 'source': 'interview'},
            ],
        },
        'role_fit': {
            'label': 'Pre-assessment role-fit estimate',
            'score': 86,
            'summary': 'Strong evidence across frontend implementation, API work, analytics tooling, and cloud-ready deployment patterns.',
            'matched_skills': ['React', 'Python', 'SQL', 'Product thinking'],
            'skills_needing_verification': ['System design', 'Performance tuning', 'Stakeholder communication'],
            'supporting_evidence': [
                'Portfolio projects demonstrate customer-facing dashboards and CI/CD workflows.',
                'GitHub contains multiple API and integration projects with test coverage and documentation.',
                'Resume outlines experience in user-focused feature delivery and analytics instrumentation.',
            ],
        },
        'assessment': {
            'time_limit_seconds': 600,
            'time_remaining_seconds': 334,
            'current_question_index': 3,
            'title': 'Adaptive 10-minute assessment',
            'tasks': [
                {'id': 'task-1', 'task_type': 'data interpretation', 'prompt': 'Review the customer churn dashboard and identify the most likely cause of the recent spike.', 'weight': 0.25, 'position': 1},
                {'id': 'task-2', 'task_type': 'debugging', 'prompt': 'A React component re-renders excessively. Explain the likely root cause and fix.', 'weight': 0.25, 'position': 2},
                {'id': 'task-3', 'task_type': 'technical writing', 'prompt': 'Summarize the trade-offs between REST and event-driven APIs for a multi-tenant SaaS product.', 'weight': 0.25, 'position': 3},
                {'id': 'task-4', 'task_type': 'prioritization', 'prompt': 'A product team needs to triage three customer-reported issues under a tight release window; explain your prioritization logic.', 'weight': 0.25, 'position': 4},
            ],
        },
        'interview': {
            'session_id': 'interview-demo-01',
            'status': 'ready',
            'question_count': 6,
            'max_response_minutes': 4,
            'expected_duration_minutes': 36,
            'questions': [
                {'id': 'q-1', 'category': 'hard skill', 'question_text': 'Choose a real project relevant to this role. Walk through one technical decision you personally made, the alternatives you considered, and how you verified the result.', 'evidence_target': 'technical depth and ownership', 'position': 1},
                {'id': 'q-2', 'category': 'soft skill', 'question_text': 'In that project or another specific example, describe a moment when a teammate or stakeholder disagreed with your approach. What did you do, and what changed as a result?', 'evidence_target': 'communication and collaboration', 'position': 2},
                {'id': 'q-3', 'category': 'hard skill', 'question_text': 'Suppose the service you described suddenly became ten times busier and response times tripled. How would you investigate the bottleneck, and what would you change first?', 'evidence_target': 'debugging and system design', 'position': 3},
                {'id': 'q-4', 'category': 'soft skill', 'question_text': 'Tell me about a time requirements were unclear or changed late. How did you clarify priorities, communicate trade-offs, and decide what to deliver?', 'evidence_target': 'judgment and adaptability', 'position': 4},
                {'id': 'q-5', 'category': 'hard skill', 'question_text': 'A production change causes a data inconsistency for some users. Describe how you would contain the impact, find the cause, and safely verify a fix.', 'evidence_target': 'reliability and practical problem solving', 'position': 5},
                {'id': 'q-6', 'category': 'soft skill', 'question_text': 'Describe a piece of difficult feedback that changed how you work. What specific behavior did you change, and how do you know the change helped?', 'evidence_target': 'self-awareness and learning', 'position': 6},
            ],
        },
        'dashboard': {
            'candidate_count': 124,
            'active_jobs': 8,
            'jobs_to_review': 21,
            'avg_role_fit': 76.8,
            'risk_flags': ['2 recordings flagged for manual review', '3 candidates missing LinkedIn verification', '1 AI provider configured in local-dev mode'],
        },
        'admin': {
            'provider_status': [
                {'provider': 'OpenAI', 'status': 'configured', 'model': 'gpt-4o-mini', 'mode': 'local-dev'},
                {'provider': 'Azure OpenAI', 'status': 'pending', 'model': 'gpt-4.1-mini', 'mode': 'configurable'},
            ],
            'retention_policies': {'resume_retention_days': 180, 'recording_retention_days': 90, 'audit_log_days': 365},
        },
    }
