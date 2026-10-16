from __future__ import annotations

import ipaddress
import http.client
import re
import socket
import ssl
from html.parser import HTMLParser
from io import BytesIO
from urllib.parse import urlsplit

import fitz
import httpx
from docx import Document
from fastapi import HTTPException, UploadFile

ROLE_SKILLS = {
    'Full-Stack Developer': [
        'React', 'JavaScript', 'TypeScript', 'Python', 'SQL',
        'REST API', 'Testing', 'Cloud', 'System design',
    ],
    'Data Analyst': [
        'SQL', 'Python', 'Data visualization', 'Statistics',
        'Excel', 'Power BI', 'Tableau', 'Communication',
    ],
}
MAX_RESUME_BYTES = 5 * 1024 * 1024
MAX_PORTFOLIO_BYTES = 1024 * 1024
MAX_GITHUB_REPOSITORIES = 20
MAX_GITHUB_READMES = 5


class _VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {'script', 'style', 'noscript', 'svg'}:
            self.hidden_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {'script', 'style', 'noscript', 'svg'} and self.hidden_depth:
            self.hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.hidden_depth:
            text = data.strip()
            if text:
                self.parts.append(text)


def _extract_resume(filename: str, contents: bytes) -> str:
    if len(contents) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail='Resume file must be no larger than 5 MB')

    suffix = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
    try:
        if suffix == 'pdf':
            with fitz.open(stream=contents, filetype='pdf') as document:
                text = '\n'.join(page.get_text() for page in document)
        elif suffix == 'docx':
            document = Document(BytesIO(contents))
            text = '\n'.join(paragraph.text for paragraph in document.paragraphs)
            text += '\n' + '\n'.join(
                cell.text
                for table in document.tables
                for row in table.rows
                for cell in row.cells
            )
        else:
            raise HTTPException(status_code=400, detail='Upload a PDF or DOCX resume')
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=400, detail='Could not read the uploaded resume file') from error

    if not text.strip():
        raise HTTPException(status_code=422, detail='No readable text was found in the resume')
    return text[:200_000]


def _github_username(profile_url: str) -> str:
    parsed = urlsplit(profile_url)
    if parsed.scheme != 'https' or parsed.hostname != 'github.com' or parsed.username or parsed.password:
        raise HTTPException(status_code=422, detail='Use a public https://github.com/username profile URL')
    segments = [segment for segment in parsed.path.split('/') if segment]
    if len(segments) != 1 or not re.fullmatch(r'[A-Za-z0-9-]{1,39}', segments[0]):
        raise HTTPException(status_code=422, detail='GitHub URL must point to a profile, not a repository')
    return segments[0]


def _validated_portfolio_url(portfolio_url: str) -> tuple[str, str, str]:
    parsed = urlsplit(portfolio_url)
    hostname = parsed.hostname
    if parsed.scheme != 'https' or not hostname or parsed.username or parsed.password:
        raise HTTPException(status_code=422, detail='Portfolio URL must be a public HTTPS URL')
    try:
        port = parsed.port
    except ValueError as error:
        raise HTTPException(status_code=422, detail='Portfolio URL contains an invalid port') from error
    if port not in (None, 443):
        raise HTTPException(status_code=422, detail='Portfolio URLs on non-standard ports cannot be analyzed')
    if hostname.lower() in {'localhost', 'localhost.localdomain'}:
        raise HTTPException(status_code=422, detail='Local and private portfolio URLs cannot be analyzed')
    try:
        addresses = socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except OSError as error:
        raise HTTPException(status_code=422, detail='Portfolio host could not be resolved') from error
    if not addresses or any(
        not ipaddress.ip_address(address[4][0]).is_global for address in addresses
    ):
        raise HTTPException(status_code=422, detail='Portfolio URL must resolve only to public IP addresses')
    return parsed.geturl(), hostname, addresses[0][4][0]


def _fetch_github(username: str) -> tuple[str, dict[str, str]]:
    headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'VerityHire-local-evidence-review',
    }
    try:
        with httpx.Client(timeout=8, follow_redirects=False, trust_env=False) as client:
            profile_response = client.get(f'https://api.github.com/users/{username}', headers=headers)
            if profile_response.status_code == 404:
                return '', {'status': 'not found', 'detail': 'Public GitHub profile was not found'}
            profile_response.raise_for_status()
            profile = profile_response.json()
            repositories_response = client.get(
                f'https://api.github.com/users/{username}/repos',
                params={'type': 'owner', 'sort': 'updated', 'per_page': MAX_GITHUB_REPOSITORIES},
                headers=headers,
            )
            repositories_response.raise_for_status()
            repositories = repositories_response.json()
            pieces = [profile.get('bio') or '', profile.get('name') or '']
            for repository in repositories:
                pieces.extend([
                    repository.get('name') or '',
                    repository.get('description') or '',
                    repository.get('language') or '',
                    ' '.join(repository.get('topics') or []),
                ])
            readme_count = 0
            for repository in repositories[:MAX_GITHUB_READMES]:
                repository_name = repository.get('name')
                if not repository_name:
                    continue
                try:
                    readme_response = client.get(
                        f'https://api.github.com/repos/{username}/{repository_name}/readme',
                        headers={**headers, 'Accept': 'application/vnd.github.raw'},
                    )
                    if readme_response.is_success:
                        pieces.append(readme_response.text[:100_000])
                        readme_count += 1
                except httpx.HTTPError:
                    continue
    except (httpx.HTTPError, ValueError):
        return '', {'status': 'unavailable', 'detail': 'GitHub could not be read; check connectivity or API rate limits'}

    return '\n'.join(pieces), {
        'status': 'analyzed',
        'detail': (
            f"Public profile, {len(repositories)} recently updated repositories, "
            f"and {readme_count} repository README files reviewed"
        ),
    }


def _fetch_portfolio(portfolio_url: str) -> tuple[str, dict[str, str]]:
    safe_url, hostname, resolved_ip = _validated_portfolio_url(portfolio_url)
    parsed = urlsplit(safe_url)
    path = parsed.path or '/'
    if parsed.query:
        path += f'?{parsed.query}'
    connection = None
    try:
        connection = _PinnedHTTPSConnection(hostname, resolved_ip)
        connection.request(
            'GET',
            path,
            headers={
                'Host': hostname,
                'User-Agent': 'VerityHire-local-evidence-review',
                'Accept-Encoding': 'identity',
            },
        )
        response = connection.getresponse()
        if 300 <= response.status < 400:
            return '', {'status': 'not analyzed', 'detail': 'Portfolio redirects are not followed'}
        if not 200 <= response.status < 300:
            return '', {'status': 'unavailable', 'detail': f'Portfolio request returned HTTP {response.status}'}
        content_type = response.getheader('content-type', '').lower()
        if 'text/html' not in content_type and 'text/plain' not in content_type:
            return '', {'status': 'not analyzed', 'detail': 'Portfolio must serve an HTML or plain-text page'}
        body = bytearray()
        while chunk := response.read(64 * 1024):
            body.extend(chunk)
            if len(body) > MAX_PORTFOLIO_BYTES:
                return '', {'status': 'not analyzed', 'detail': 'Portfolio page exceeds the 1 MB analysis limit'}
    except (OSError, ssl.SSLError, http.client.HTTPException):
        return '', {'status': 'unavailable', 'detail': 'Portfolio page could not be fetched'}
    finally:
        if connection:
            connection.close()

    parser = _VisibleTextParser()
    parser.feed(bytes(body).decode('utf-8', errors='replace'))
    return '\n'.join(parser.parts)[:100_000], {'status': 'analyzed', 'detail': 'Public portfolio page text reviewed'}


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, hostname: str, resolved_ip: str) -> None:
        super().__init__(hostname, port=443, timeout=8, context=ssl.create_default_context())
        self.resolved_ip = resolved_ip

    def connect(self) -> None:
        raw_socket = socket.create_connection((self.resolved_ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(raw_socket, server_hostname=self.host)


def _contains_skill(text: str, skill: str) -> bool:
    normalized_skill = skill.lower()
    if normalized_skill == 'rest api':
        return bool(re.search(r'\b(rest(?:ful)?\s+api|api development|api design)\b', text, re.I))
    if normalized_skill == 'system design':
        return bool(re.search(r'\b(system design|distributed systems|architecture)\b', text, re.I))
    if normalized_skill == 'data visualization':
        return bool(re.search(r'\b(data visualization|data visualisation|dashboard|visualization)\b', text, re.I))
    return bool(re.search(rf'(?<!\w){re.escape(skill)}(?!\w)', text, re.I))


async def analyze_candidate_evidence(
    *,
    target_role: str,
    resume_file: UploadFile | None,
    github_url: str | None,
    portfolio_url: str | None,
) -> dict:
    if target_role not in ROLE_SKILLS:
        raise HTTPException(status_code=422, detail='Choose a supported target role')
    if resume_file is None and not github_url and not portfolio_url:
        raise HTTPException(status_code=422, detail='Upload a resume or provide a GitHub or portfolio URL')

    evidence: dict[str, str] = {}
    sources: dict[str, dict[str, str]] = {
        'resume': {'status': 'not provided', 'detail': 'No resume uploaded'},
        'github': {'status': 'not provided', 'detail': 'No GitHub profile provided'},
        'portfolio': {'status': 'not provided', 'detail': 'No portfolio URL provided'},
    }

    if resume_file is not None and resume_file.filename:
        resume_text = _extract_resume(resume_file.filename, await resume_file.read(MAX_RESUME_BYTES + 1))
        evidence['resume'] = resume_text
        sources['resume'] = {'status': 'analyzed', 'detail': f'{resume_file.filename} text extracted'}

    if github_url:
        username = _github_username(github_url)
        github_text, sources['github'] = _fetch_github(username)
        if github_text:
            evidence['github'] = github_text

    if portfolio_url:
        portfolio_text, sources['portfolio'] = _fetch_portfolio(portfolio_url)
        if portfolio_text:
            evidence['portfolio'] = portfolio_text

    if not evidence:
        raise HTTPException(
            status_code=422,
            detail='No resources could be analyzed. Check the resume file, GitHub profile, and portfolio accessibility.',
        )

    skills = ROLE_SKILLS[target_role]
    skill_evidence = []
    matched_skills = []
    for skill in skills:
        found_in = [source for source, text in evidence.items() if _contains_skill(text, skill)]
        if found_in:
            matched_skills.append(skill)
        skill_evidence.append({
            'name': skill,
            'status': 'evidence found' if found_in else 'not found in analyzed sources',
            'sources': found_in,
        })

    score = round(len(matched_skills) / len(skills) * 100)
    gaps = [item['name'] for item in skill_evidence if not item['sources']]
    return {
        'data': {
            'profile': {'target_role': target_role},
            'report': {
                'score': score,
                'score_label': 'Evidence coverage',
                'is_probability': False,
                'summary': (
                    f'{len(matched_skills)} of {len(skills)} role-related skills were found in the resources '
                    'that could be analyzed. This is an evidence coverage measure, not a probability of job success.'
                ),
                'matched_skills': matched_skills,
                'skills_needing_verification': gaps,
                'skill_evidence': skill_evidence,
                'sources': sources,
                'supporting_evidence': [
                    f'{skill["name"]}: found in {", ".join(skill["sources"])}'
                    for skill in skill_evidence
                    if skill['sources']
                ],
                'limitations': [
                    'Skill mentions are matched by keyword; this does not verify proficiency or work ownership.',
                    'Public GitHub and portfolio data may be incomplete or rate-limited.',
                    'This report is not a hiring decision, success probability, or automatic rejection signal.',
                ],
            },
        },
        'message': 'Evidence analysis completed',
    }
