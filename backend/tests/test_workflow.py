from __future__ import annotations

from io import BytesIO
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
from zipfile import ZipFile

import fitz
from docx import Document
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import evidence_analysis, main
from app.database import Base
from app.models import Application, RecruitmentPolicy, RoleFitReport
from app.workflow import adaptive_follow_up, skill_match, skills_for_role, weighted_role_fit


def make_resume() -> bytes:
    document = Document()
    document.add_paragraph(
        'Software developer with 4 years experience. Python, JavaScript, SQL, REST API, '
        'Testing, Git. Bachelor degree. Improved service response time and delivered projects.'
    )
    output = BytesIO()
    document.save(output)
    return output.getvalue()


class WorkflowUnitTests(unittest.TestCase):
    def test_github_rate_limit_is_reported_and_server_token_is_used(self) -> None:
        response = Mock()
        response.status_code = 403
        response.is_success = False
        response.headers = {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1792198993',
        }
        client = Mock()
        client.get.return_value = response
        context = Mock()
        context.__enter__ = Mock(return_value=client)
        context.__exit__ = Mock(return_value=False)

        with (
            patch.object(evidence_analysis, 'get_settings', return_value=SimpleNamespace(github_token='operator-token')),
            patch.object(evidence_analysis.httpx, 'Client', return_value=context),
        ):
            text, source = evidence_analysis._fetch_github('example')

        self.assertEqual(text, '')
        self.assertEqual(source['status'], 'unavailable')
        self.assertIn('rate limit is exhausted', source['detail'])
        self.assertIn('GITHUB_TOKEN', source['detail'])
        self.assertEqual(client.get.call_args.kwargs['headers']['Authorization'], 'Bearer operator-token')

    def test_resume_extractor_accepts_multiple_readable_formats(self) -> None:
        cases = [
            ('resume.txt', b'Python developer with testing experience', 'Python developer'),
            ('resume.custom', b'Java engineer with API experience', 'Java engineer'),
            ('resume.html', b'<html><script>hidden</script><body>Portfolio developer</body></html>', 'Portfolio developer'),
            ('resume.rtf', br'{\rtf1\ansi Python developer\par Builds APIs}', 'Python developer'),
        ]
        odt = BytesIO()
        with ZipFile(odt, 'w') as archive:
            archive.writestr(
                'content.xml',
                '<document><body><p>OpenDocument analyst</p></body></document>',
            )
        cases.append(('resume.odt', odt.getvalue(), 'OpenDocument analyst'))

        for filename, contents, expected in cases:
            with self.subTest(filename=filename):
                self.assertIn(expected, evidence_analysis._extract_resume(filename, contents))

    def test_resume_extractor_uses_file_content_when_extension_is_missing(self) -> None:
        self.assertIn('Software developer', evidence_analysis._extract_resume('resume', make_resume()))

    def test_image_resume_uses_ocr(self) -> None:
        page = fitz.open()
        page.new_page().insert_text((72, 72), 'Image resume')
        image = page[0].get_pixmap().tobytes('png')
        page.close()
        with patch.object(evidence_analysis, '_get_ocr_engine', return_value=lambda _: ([([0, 0, 1, 1], 'OCR resume text', 0.99)], None)):
            self.assertIn('OCR resume text', evidence_analysis._extract_resume('resume.png', image))

    def test_arbitrary_role_gets_provisional_framework(self) -> None:
        role_skills = skills_for_role('Quantum Policy Analyst')
        self.assertIn('Domain-specific knowledge', role_skills)
        self.assertIn('Communication', role_skills)

    def test_weights_normalize_when_a_category_is_unavailable(self) -> None:
        result = weighted_role_fit(
            ['SQL'],
            {'resume': 'SQL experience, bachelor degree and improved outcomes.'},
            {
                'required_skill_alignment': 35,
                'experience_evidence': 25,
                'github_evidence': 20,
                'education_qualifications': 10,
                'achievements': 10,
            },
        )
        self.assertFalse(result['categories']['github_evidence']['assessed'])
        self.assertEqual(result['assessed_weight_percent'], 70)
        assessed_weights = {
            category: result['weights'][category]
            for category, details in result['categories'].items()
            if details['assessed']
        }
        expected_score = sum(
            result['categories'][category]['score'] * weight
            for category, weight in assessed_weights.items()
        ) / sum(assessed_weights.values())
        self.assertEqual(result['score'], round(expected_score))

    def test_skill_matching_understands_common_resume_and_repository_terms(self) -> None:
        evidence = (
            'Used JS, React.js, PostgreSQL, RESTful services, unit tests, and GitHub '
            'to develop a TypeScript application.'
        )
        for skill in ['JavaScript', 'React', 'SQL', 'REST API', 'Testing', 'Git', 'TypeScript']:
            with self.subTest(skill=skill):
                self.assertTrue(skill_match(evidence, skill))
        self.assertFalse(skill_match('JavaScript developer', 'Java'))

    def test_role_fit_is_evidence_driven_and_github_depth_is_not_profile_existence(self) -> None:
        skills = ['React', 'TypeScript', 'REST API', 'Node.js']
        weights = {
            'required_skill_alignment': 35,
            'experience_evidence': 25,
            'github_evidence': 20,
            'education_qualifications': 10,
            'achievements': 10,
        }
        weak = weighted_role_fit(
            skills,
            {'resume': 'Student.', 'github': 'Public profile only.'},
            weights,
        )
        strong = weighted_role_fit(
            skills,
            {
                'resume': (
                    'Software engineer, 2020-2024. Developed TypeScript and React systems with '
                    'Node.js and RESTful services; reduced API latency by 30%.'
                ),
                'github': (
                    'Public profile.\n'
                    'Repository storefront README: React TypeScript RESTful APIs.\n'
                    'Repository storefront file src/app.ts: React TypeScript Node.js RESTful API.'
                ),
            },
            weights,
            'React, TypeScript, Node.js, REST API; no degree required.',
        )
        self.assertGreater(strong['score'], weak['score'])
        self.assertLess(weak['categories']['github_evidence']['score'], 100)
        self.assertEqual(strong['github_metrics']['repository_records_reviewed'], 1)
        self.assertEqual(strong['github_metrics']['readme_files_reviewed'], 1)
        self.assertFalse(strong['categories']['education_qualifications']['assessed'])
        self.assertIn('excluded', strong['categories']['education_qualifications']['basis'])
        self.assertEqual(strong['matches_by_source']['resume'], ['React', 'TypeScript', 'REST API', 'Node.js'])

    def test_education_is_scored_only_when_job_description_requires_it(self) -> None:
        without_requirement = weighted_role_fit(
            ['Python'],
            {'resume': 'Python developer with experience.'},
            role_description='Python engineer. No degree required.',
        )
        with_requirement = weighted_role_fit(
            ['Python'],
            {'resume': 'Python developer with experience.'},
            role_description="Bachelor's degree required.",
        )
        self.assertFalse(without_requirement['categories']['education_qualifications']['assessed'])
        self.assertTrue(with_requirement['categories']['education_qualifications']['assessed'])

    def test_follow_up_uses_the_candidate_answer(self) -> None:
        question = adaptive_follow_up(
            'I used PostgreSQL joins to aggregate customer orders and validate duplicate rows.',
            'hard skill',
            'SQL edge cases',
        )
        self.assertIn('PostgreSQL', question)
        self.assertIn('SQL edge cases', question)

    def test_legacy_sqlite_candidate_identity_migration_preserves_rows(self) -> None:
        engine = create_engine('sqlite://')
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE users (id VARCHAR PRIMARY KEY)'))
            connection.execute(text(
                'CREATE TABLE candidate_profiles '
                '(id VARCHAR PRIMARY KEY, user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id))'
            ))
            connection.execute(text('INSERT INTO users (id) VALUES (:id)'), {'id': 'user-1'})
            connection.execute(text(
                'INSERT INTO candidate_profiles (id, user_id) VALUES (:id, :user_id)'
            ), {'id': 'candidate-1', 'user_id': 'user-1'})
        original_engine = main.engine
        try:
            main.engine = engine
            main.migrate_legacy_candidate_identity()
            user_id = next(column for column in inspect(engine).get_columns('candidate_profiles') if column['name'] == 'user_id')
            self.assertTrue(user_id['nullable'])
            with engine.connect() as connection:
                saved = connection.execute(text('SELECT id, user_id FROM candidate_profiles')).one()
            self.assertEqual(tuple(saved), ('candidate-1', 'user-1'))
        finally:
            main.engine = original_engine
            engine.dispose()

class WorkflowAPITests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            'sqlite://',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.original_engine = main.engine
        self.original_session_local = main.SessionLocal
        main.engine = self.engine
        main.SessionLocal = self.session_factory

        def override_get_db():
            session = self.session_factory()
            try:
                yield session
            finally:
                session.close()

        main.app.dependency_overrides[main.get_db] = override_get_db
        self.client_context = TestClient(main.app)
        self.client = self.client_context.__enter__()
        self.github_patch = patch.object(
            evidence_analysis,
            '_fetch_github',
            return_value=(
                'Public profile. Python JavaScript SQL REST API Testing Git. '
                'Repository tests and documented implementation.',
                {'status': 'analyzed', 'detail': 'test fixture profile and repositories reviewed'},
            ),
        )
        self.github_patch.start()

    def tearDown(self) -> None:
        self.github_patch.stop()
        self.client_context.__exit__(None, None, None)
        main.app.dependency_overrides.clear()
        main.engine = self.original_engine
        main.SessionLocal = self.original_session_local
        self.engine.dispose()

    def create_candidate(self) -> str:
        policy_response = self.client.put(
            '/api/admin/settings/policy',
            json={
                'screening_threshold': 0,
                'question_count': 2,
                'max_minutes_per_question': 5,
                'retention_days': 90,
            },
        )
        self.assertEqual(policy_response.status_code, 200, policy_response.text)
        response = self.client.post(
            '/api/candidate/onboarding',
            data={
                'target_role': 'Quantum Policy Analyst',
                'role_description': 'Analyze policy data and explain evidence to stakeholders.',
                'github_url': 'https://github.com/example-candidate',
            },
            files={'resume_file': ('resume.docx', make_resume(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()['data']
        self.assertEqual(data['profile']['target_role'], 'Quantum Policy Analyst')
        self.assertEqual(data['report']['sources']['github']['status'], 'analyzed')
        self.assertIn('role_framework', data['report'])
        return data['profile']['candidate_id']

    def set_candidate_score(self, candidate_id: str, score: float, threshold: float = 60) -> None:
        session = self.session_factory()
        try:
            policy = session.get(RecruitmentPolicy, 'default')
            report = (
                session.query(RoleFitReport)
                .filter_by(candidate_profile_id=candidate_id)
                .one()
            )
            self.assertIsNotNone(policy)
            policy.screening_threshold = threshold
            report.score = score
            session.commit()
        finally:
            session.close()

    def test_new_recruitment_policy_uses_sixty_point_threshold(self) -> None:
        settings = self.client.get('/api/admin/settings')
        self.assertEqual(settings.status_code, 200, settings.text)
        self.assertEqual(settings.json()['data']['policy']['screening_threshold'], 60)

    def test_candidate_above_sixty_percent_can_start_assessment(self) -> None:
        candidate_id = self.create_candidate()
        self.set_candidate_score(candidate_id, 61)

        report = self.client.get(f'/api/candidate/{candidate_id}/report').json()['data']['report']
        self.assertEqual(report['eligibility']['threshold'], 60)
        self.assertTrue(report['eligibility']['next_stage_unlocked'])
        self.assertIn('start the assessment now', report['eligibility']['message'])

        assessment = self.client.get('/api/assessment', params={'candidate_id': candidate_id})
        self.assertEqual(assessment.status_code, 200, assessment.text)

    def test_candidate_above_sixty_percent_can_start_when_github_api_is_unavailable(self) -> None:
        candidate_id = self.create_candidate()
        self.set_candidate_score(candidate_id, 72)
        session = self.session_factory()
        try:
            report = (
                session.query(RoleFitReport)
                .filter_by(candidate_profile_id=candidate_id)
                .one()
            )
            evidence = dict(report.evidence_json)
            evidence['sources'] = dict(evidence['sources'])
            evidence['sources']['github'] = {
                'status': 'unavailable',
                'detail': 'GitHub API rate limit is exhausted',
            }
            report.evidence_json = evidence
            session.commit()
        finally:
            session.close()

        report = self.client.get(f'/api/candidate/{candidate_id}/report').json()['data']['report']
        self.assertTrue(report['eligibility']['next_stage_unlocked'])
        self.assertIn('GitHub data was unavailable', report['eligibility']['message'])
        self.assertEqual(
            self.client.get('/api/assessment', params={'candidate_id': candidate_id}).status_code,
            200,
        )

    def test_candidate_with_unresolved_github_profile_cannot_start_assessment(self) -> None:
        candidate_id = self.create_candidate()
        self.set_candidate_score(candidate_id, 72)
        session = self.session_factory()
        try:
            report = session.query(RoleFitReport).filter_by(candidate_profile_id=candidate_id).one()
            evidence = dict(report.evidence_json)
            evidence['sources'] = dict(evidence['sources'])
            evidence['sources']['github'] = {'status': 'not found', 'detail': 'Profile was not found'}
            report.evidence_json = evidence
            session.commit()
        finally:
            session.close()

        report = self.client.get(f'/api/candidate/{candidate_id}/report').json()['data']['report']
        self.assertFalse(report['eligibility']['next_stage_unlocked'])
        self.assertIn('was not found', report['eligibility']['message'])
        assessment = self.client.get('/api/assessment', params={'candidate_id': candidate_id})
        self.assertEqual(assessment.status_code, 409, assessment.text)

    def test_candidate_below_sixty_percent_cannot_start_assessment(self) -> None:
        candidate_id = self.create_candidate()
        self.set_candidate_score(candidate_id, 59)

        report = self.client.get(f'/api/candidate/{candidate_id}/report').json()['data']['report']
        self.assertFalse(report['eligibility']['next_stage_unlocked'])
        assessment = self.client.get('/api/assessment', params={'candidate_id': candidate_id})
        self.assertEqual(assessment.status_code, 403, assessment.text)

    def test_candidate_at_sixty_percent_does_not_meet_strict_threshold(self) -> None:
        candidate_id = self.create_candidate()
        self.set_candidate_score(candidate_id, 60)

        assessment = self.client.get('/api/assessment', params={'candidate_id': candidate_id})
        self.assertEqual(assessment.status_code, 403, assessment.text)

    def test_legacy_completed_assessment_enters_recruiter_review_queue(self) -> None:
        candidate_id = self.create_candidate()
        session = self.session_factory()
        try:
            application = session.query(Application).filter_by(candidate_profile_id=candidate_id).one()
            application.status = 'assessment_completed'
            session.commit()
        finally:
            session.close()

        main.migrate_legacy_workflow_statuses()
        migrated = self.client.get('/api/recruiter/dashboard').json()['data']['applications'][0]
        self.assertEqual(migrated['status'], 'assessment_review')
        self.assertEqual(migrated['next_stage'], 'interview')

    def test_onboarding_accepts_text_resume_with_arbitrary_extension(self) -> None:
        response = self.client.post(
            '/api/candidate/onboarding',
            data={
                'target_role': 'Data Analyst',
                'github_url': 'https://github.com/example-candidate',
            },
            files={'resume_file': ('resume.profile', b'Data analyst with SQL, Python, dashboards, and reporting experience.', 'application/octet-stream')},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn('resume.profile text extracted', response.json()['data']['report']['sources']['resume']['detail'])

    def test_resume_and_github_are_required(self) -> None:
        response = self.client.post(
            '/api/candidate/onboarding',
            data={'target_role': 'Data Analyst'},
            files={'resume_file': ('resume.docx', make_resume(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')},
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn('GitHub profile URL is required', response.text)

    def test_recruiter_and_admin_modules_load_and_save_settings(self) -> None:
        candidate_id = self.create_candidate()

        dashboard = self.client.get('/api/recruiter/dashboard')
        self.assertEqual(dashboard.status_code, 200, dashboard.text)
        self.assertEqual(dashboard.json()['data']['candidate_count'], 1)
        self.assertEqual(
            dashboard.json()['data']['applications'][0]['candidate_id'],
            candidate_id,
        )
        self.assertEqual(dashboard.json()['data']['applications'][0]['status'], 'evidence_review')
        recruiter_report = self.client.get(f'/api/recruiter/reports/{candidate_id}')
        self.assertEqual(recruiter_report.status_code, 200, recruiter_report.text)
        self.assertEqual(
            recruiter_report.json()['data']['profile']['candidate_id'],
            candidate_id,
        )
        self.assertTrue(recruiter_report.json()['data']['report']['eligibility']['next_stage_unlocked'])
        self.assertEqual(
            self.client.get('/api/assessment', params={'candidate_id': candidate_id}).status_code,
            200,
        )

        approval = self.client.post(f'/api/recruiter/applications/{candidate_id}/approve-next-stage')
        self.assertEqual(approval.status_code, 200, approval.text)
        self.assertEqual(approval.json()['data']['application_status'], 'evidence_approved')
        approved_evidence = self.client.get(f'/api/candidate/{candidate_id}/report').json()['data']['report']
        self.assertTrue(approved_evidence['eligibility']['next_stage_unlocked'])
        self.assertEqual(
            self.client.post(f'/api/recruiter/applications/{candidate_id}/approve-next-stage').status_code,
            409,
            'A recruiter must not approve the interview stage before assessment completion.',
        )

        settings = self.client.get('/api/admin/settings')
        self.assertEqual(settings.status_code, 200, settings.text)
        self.assertEqual(settings.json()['data']['policy']['screening_threshold'], 0)
        updated_policy = self.client.put(
            '/api/admin/settings/policy',
            json={
                'screening_threshold': 65,
                'question_count': 4,
                'max_minutes_per_question': 3,
                'retention_days': 120,
            },
        )
        self.assertEqual(updated_policy.status_code, 200, updated_policy.text)
        role_weights = {
            'required_skill_alignment': 40,
            'experience_evidence': 20,
            'github_evidence': 20,
            'education_qualifications': 10,
            'achievements': 10,
        }
        updated_weights = self.client.put(
            '/api/admin/settings/role-weights',
            json={'role': 'Quantum Policy Analyst', 'weights': role_weights},
        )
        self.assertEqual(updated_weights.status_code, 200, updated_weights.text)
        saved_settings = self.client.get('/api/admin/settings').json()['data']
        self.assertEqual(saved_settings['policy']['screening_threshold'], 65)
        self.assertEqual(saved_settings['role_weights']['Quantum Policy Analyst'], role_weights)

    def test_candidate_can_complete_persisted_adaptive_flow(self) -> None:
        candidate_id = self.create_candidate()
        eligible_report = self.client.get(f'/api/candidate/{candidate_id}/report').json()['data']['report']
        self.assertEqual(eligible_report['application_status'], 'evidence_review')
        self.assertTrue(eligible_report['eligibility']['next_stage_unlocked'])
        assessment_response = self.client.get('/api/assessment', params={'candidate_id': candidate_id})
        self.assertEqual(assessment_response.status_code, 200, assessment_response.text)
        assessment = assessment_response.json()['data']
        self.assertIn('Quantum Policy Analyst', assessment['title'])
        submit_assessment = self.client.post(
            '/api/assessment/submit',
            json={
                'session_id': assessment['session_id'],
                'answers': {assessment['tasks'][0]['id']: 'I analyzed the evidence and validated the result with tests.'},
            },
        )
        self.assertEqual(submit_assessment.status_code, 200, submit_assessment.text)
        self.assertEqual(submit_assessment.json()['data']['status'], 'submitted')
        status_after_assessment = self.client.get(f'/api/recruiter/reports/{candidate_id}')
        self.assertEqual(status_after_assessment.json()['data']['report']['application_status'], 'assessment_review')
        self.assertTrue(status_after_assessment.json()['data']['report']['eligibility']['next_stage_unlocked'])
        self.assertIn(
            'interview is open now',
            status_after_assessment.json()['data']['report']['eligibility']['message'],
        )
        interview_response = self.client.get('/api/interview', params={'candidate_id': candidate_id})
        self.assertEqual(interview_response.status_code, 200, interview_response.text)
        interview_approval = self.client.post(f'/api/recruiter/applications/{candidate_id}/approve-next-stage')
        self.assertEqual(interview_approval.status_code, 200, interview_approval.text)
        self.assertEqual(interview_approval.json()['data']['next_stage'], 'interview')
        approved_assessment = self.client.get(f'/api/candidate/{candidate_id}/report').json()['data']['report']
        self.assertTrue(approved_assessment['eligibility']['next_stage_unlocked'])
        self.assertEqual(self.client.post(
            '/api/assessment/submit',
            json={'session_id': assessment['session_id'], 'answers': {}},
        ).status_code, 409)

        interview_response = self.client.get('/api/interview', params={'candidate_id': candidate_id})
        self.assertEqual(interview_response.status_code, 200, interview_response.text)
        interview = interview_response.json()['data']
        session_id = interview['session_id']
        consent = self.client.post(
            '/api/interview/consent',
            json={'session_id': session_id, 'camera': True, 'microphone': True},
        )
        self.assertEqual(consent.status_code, 200, consent.text)
        face_signal = self.client.post(
            '/api/interview/integrity-event',
            json={
                'session_id': session_id,
                'event_type': 'no_face',
                'context': 'Local camera monitor temporarily lost the face.',
                'confidence': 0.45,
            },
        )
        self.assertEqual(face_signal.status_code, 200, face_signal.text)
        self.assertIn('not a misconduct finding', face_signal.json()['message'])

        current = interview['current_question']
        follow_up_text = ''
        while True:
            answer_result = self.client.post(
                '/api/interview/answer',
                json={
                    'session_id': session_id,
                    'question_id': current['id'],
                    'answer': 'I used PostgreSQL and Python to investigate the issue, test alternatives, and measure the result with the team.',
                },
            )
            self.assertEqual(answer_result.status_code, 200, answer_result.text)
            result_data = answer_result.json()['data']
            if result_data['status'] == 'ready_to_submit':
                break
            current = result_data['next_question']
            if result_data['status'] == 'follow_up':
                follow_up_text = current['question_text']
                self.assertIn('PostgreSQL', follow_up_text)

        submitted = self.client.post('/api/interview/submit', json={'session_id': session_id})
        self.assertEqual(submitted.status_code, 200, submitted.text)
        self.assertIn('Submitted Successfully', submitted.json()['message'])
        duplicate = self.client.post('/api/interview/submit', json={'session_id': session_id})
        self.assertEqual(duplicate.status_code, 409)
        report = self.client.get(f'/api/candidate/{candidate_id}/report')
        self.assertEqual(report.status_code, 200, report.text)
        self.assertEqual(report.json()['data']['report']['interview_status'], 'submitted')
        self.assertIsNotNone(report.json()['data']['report']['final_report'])


if __name__ == '__main__':
    unittest.main()
