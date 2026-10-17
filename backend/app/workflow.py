from __future__ import annotations

import re


SKILL_CATALOG = [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C#', 'C++', 'Go', 'Rust',
    'React', 'Angular', 'Vue', 'Node.js', 'FastAPI', 'Django', 'Flask',
    'Spring Boot', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
    'REST API', 'GraphQL', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Linux', 'Git', 'CI/CD', 'Terraform', 'Machine learning', 'Deep learning',
    'Data analysis', 'Statistics', 'Pandas', 'NumPy', 'Power BI', 'Tableau',
    'Excel', 'Data visualization', 'Cybersecurity', 'Networking', 'Testing',
    'Accessibility', 'UX research', 'Figma', 'Product management', 'Agile',
    'Communication', 'Leadership', 'Teamwork', 'Problem solving', 'Salesforce',
    'Apex', 'SOQL', 'CRM', 'SAP', 'Data engineering', 'ETL', 'Incident response',
    'Risk analysis', 'Requirements analysis', 'Stakeholder management', 'SEO',
    'Content strategy', 'Financial analysis', 'Forecasting', 'Recruiting',
    'Supply chain', 'Clinical documentation', 'Customer service',
    'Domain-specific knowledge',
]

ROLE_HINTS: list[tuple[tuple[str, ...], list[str]]] = [
    (('salesforce',), ['Salesforce', 'Apex', 'SOQL', 'CRM']),
    (('data analyst', 'business intelligence', 'bi analyst'), ['SQL', 'Data analysis', 'Statistics', 'Data visualization', 'Excel', 'Power BI']),
    (('data scientist', 'machine learning', 'ai engineer', 'artificial intelligence'), ['Python', 'Machine learning', 'Statistics', 'Data analysis']),
    (('data engineer', 'analytics engineer'), ['Python', 'SQL', 'Data engineering', 'ETL', 'Cloud']),
    (('cybersecurity', 'security analyst', 'security engineer'), ['Cybersecurity', 'Networking', 'Linux', 'Incident response']),
    (('cloud', 'devops', 'site reliability', 'platform engineer'), ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD']),
    (('software engineer', 'software developer', 'full-stack', 'full stack', 'backend developer', 'frontend developer', 'web developer'), ['JavaScript', 'Python', 'SQL', 'REST API', 'Testing', 'Git']),
    (('product manager', 'product owner'), ['Product management', 'Communication', 'Data analysis', 'Stakeholder management']),
    (('designer', 'ux ', 'user experience'), ['UX research', 'Figma', 'Accessibility', 'Communication']),
    (('business analyst', 'systems analyst'), ['Requirements analysis', 'SQL', 'Communication', 'Data analysis']),
    (('financial analyst', 'accountant', 'finance'), ['Financial analysis', 'Excel', 'Forecasting', 'Risk analysis']),
    (('recruiter', 'talent acquisition'), ['Recruiting', 'Communication', 'Stakeholder management']),
    (('marketing', 'growth'), ['SEO', 'Data analysis', 'Content strategy', 'Communication']),
    (('project manager', 'program manager'), ['Agile', 'Communication', 'Leadership', 'Stakeholder management']),
    (('nurse', 'clinician', 'healthcare'), ['Clinical documentation', 'Communication', 'Problem solving']),
    (('customer success', 'support specialist'), ['Customer service', 'Communication', 'Problem solving']),
]

SKILL_ALIASES: dict[str, tuple[str, ...]] = {
    'Python': (r'python',),
    'Java': (r'\bjava(?!script)\b',),
    'JavaScript': (r'javascript', r'\bjs\b', r'ecmascript'),
    'TypeScript': (r'typescript', r'\bts\b'),
    'C#': (r'\bc\s*#(?!\w)', r'\bcsharp\b'),
    'C++': (r'\bc\s*\+\+(?!\w)', r'\bcpp\b'),
    'Go': (r'\bgolang\b', r'\bgo programming\b', r'\bgo language\b', r'\blanguage:\s*go\b'),
    'Rust': (r'\brust\b',),
    'React': (r'\breact(?:\.js)?\b',),
    'Angular': (r'\bangular\b',),
    'Vue': (r'\bvue(?:\.js)?\b',),
    'Node.js': (r'\bnode(?:\.js)?\b', r'\bnodejs\b'),
    'FastAPI': (r'\bfast\s*api\b',),
    'Django': (r'\bdjango\b',),
    'Flask': (r'\bflask\b',),
    'Spring Boot': (r'\bspring(?:\s+boot)?\b',),
    'SQL': (r'\bsql\b', r'\bpostgres(?:ql)?\b', r'\bmysql\b', r'\bsqlite\b', r'\bt-sql\b'),
    'PostgreSQL': (r'\bpostgres(?:ql)?\b',),
    'MySQL': (r'\bmysql\b',),
    'MongoDB': (r'\bmongo(?:db)?\b',),
    'Redis': (r'\bredis\b',),
    'REST API': (
        r'\brest(?:ful)?\s+apis?\b',
        r'\brestful services?\b',
        r'\bapi (?:development|design|integration)\b',
    ),
    'GraphQL': (r'\bgraphql\b',),
    'Docker': (r'\bdocker(?:ized|ised|ization|isation)?\b', r'\bcontainers?\b'),
    'Kubernetes': (r'\bkubernetes\b', r'\bk8s\b'),
    'AWS': (r'\baws\b', r'\bamazon web services\b'),
    'Azure': (r'\bazure\b',),
    'GCP': (r'\bgcp\b', r'\bgoogle cloud(?: platform)?\b'),
    'Linux': (r'\blinux\b',),
    'Git': (r'\bgit(?:hub|lab)?\b', r'\bversion control\b'),
    'CI/CD': (r'\bci\s*/?\s*cd\b', r'\bcontinuous integration\b', r'\bcontinuous delivery\b'),
    'Terraform': (r'\bterraform\b',),
    'Machine learning': (r'\bmachine[- ]learning\b', r'\bml\b'),
    'Deep learning': (r'\bdeep[- ]learning\b',),
    'Data analysis': (r'\bdata analys(?:is|t)\b', r'\banalytics\b', r'\banaly[sz]ed data\b'),
    'Statistics': (r'\bstatistics?\b', r'\bstatistical\b'),
    'Pandas': (r'\bpandas\b',),
    'NumPy': (r'\bnumpy\b',),
    'Power BI': (r'\bpower\s*bi\b',),
    'Tableau': (r'\btableau\b',),
    'Excel': (r'\bexcel\b', r'\bspreadsheets?\b'),
    'Data visualization': (r'\bdata visuali[sz]ation\b', r'\bdashboards?\b', r'\btableau\b', r'\bpower\s*bi\b'),
    'Cybersecurity': (r'\bcyber[ -]?security\b', r'\binformation security\b'),
    'Networking': (r'\bnetwork(?:ing)?\b', r'\btcp\s*/?\s*ip\b'),
    'Testing': (r'\btest(?:ing|s)?\b', r'\bquality assurance\b', r'\bqa\b', r'\bunit[- ]tests?\b'),
    'Accessibility': (r'\baccessibility\b', r'\bwcag\b', r'\baria\b'),
    'UX research': (r'\bux research\b', r'\busability (?:testing|research)\b', r'\buser research\b'),
    'Figma': (r'\bfigma\b',),
    'Product management': (r'\bproduct management\b', r'\broadmap\b'),
    'Agile': (r'\bagile\b', r'\bscrum\b', r'\bkanban\b'),
    'Communication': (r'\bcommunication\b', r'\bpresented\b', r'\bstakeholder updates?\b'),
    'Leadership': (r'\bleadership\b', r'\bled (?:a |an |the )?(?:team|project|initiative)\b'),
    'Teamwork': (r'\bteamwork\b', r'\bcollaborat(?:e|ed|ion|ing)\b'),
    'Problem solving': (r'\bproblem[- ]solving\b', r'\btroubleshoot(?:ing|ed)?\b', r'\broot[- ]cause\b'),
    'Salesforce': (r'\bsalesforce\b',),
    'Apex': (r'\bapex\b',),
    'SOQL': (r'\bsoql\b',),
    'CRM': (r'\bcrm\b', r'\bcustomer relationship management\b'),
    'SAP': (r'\bsap\b',),
    'Data engineering': (r'\bdata engineering\b', r'\bdata pipeline\b'),
    'ETL': (r'\betl\b', r'\bextract(?:ion)?[,]? transform(?:ation)?[,]? load(?:ing)?\b'),
    'Incident response': (r'\bincident response\b', r'\bincident management\b'),
    'Risk analysis': (r'\brisk analys(?:is|t)\b', r'\brisk assessment\b'),
    'Requirements analysis': (r'\brequirements? (?:analysis|gathering|elicitation)\b',),
    'Stakeholder management': (r'\bstakeholder (?:management|engagement|communication)\b', r'\bcross[- ]functional\b'),
    'SEO': (r'\bseo\b', r'\bsearch engine optim(?:ization|isation)\b'),
    'Content strategy': (r'\bcontent strateg(?:y|ies)\b', r'\beditorial strateg(?:y|ies)\b'),
    'Financial analysis': (r'\bfinancial analys(?:is|t)\b', r'\bfinancial model(?:ing|ling)\b'),
    'Forecasting': (r'\bforecast(?:ing|ed)?\b', r'\bprojections?\b'),
    'Recruiting': (r'\brecruit(?:ing|ment|er)\b', r'\btalent acquisition\b'),
    'Supply chain': (r'\bsupply chain\b', r'\blogistics\b'),
    'Clinical documentation': (r'\bclinical document(?:ation|ing)\b', r'\bpatient records?\b'),
    'Customer service': (r'\bcustomer service\b', r'\bcustomer support\b', r'\bclient support\b'),
}

STOP_WORDS = {
    'the', 'and', 'that', 'this', 'with', 'from', 'have', 'were', 'when',
    'what', 'which', 'would', 'could', 'should', 'because', 'then', 'than',
    'there', 'their', 'about', 'into', 'your', 'you', 'for', 'are', 'was',
    'has', 'had', 'been', 'will', 'can', 'how', 'why', 'but', 'not', 'use',
    'used', 'using', 'through', 'project', 'experience', 'work', 'worked',
}


def normalize_role(role: str) -> str:
    normalized = ' '.join(role.split())
    if not normalized or len(normalized) > 120:
        raise ValueError('Enter a job title between 1 and 120 characters.')
    return normalized


def skills_for_role(role: str, requirements: str = '') -> list[str]:
    role_text = f'{role} {requirements}'.lower()
    inferred: list[str] = []
    for hints, competencies in ROLE_HINTS:
        if any(hint in role.lower() for hint in hints):
            inferred.extend(competencies)
    for skill in SKILL_CATALOG:
        if skill_match(role_text, skill) and skill not in inferred:
            inferred.append(skill)
    if not inferred:
        inferred = ['Domain-specific knowledge', 'Communication', 'Problem solving']
    return list(dict.fromkeys(inferred))[:12]


def skill_match(text: str, skill: str) -> bool:
    normalized = text.lower()
    skill_normalized = skill.lower()
    if skill_normalized == 'domain-specific knowledge':
        return False
    patterns = SKILL_ALIASES.get(skill)
    if patterns is None:
        return bool(re.search(rf'(?<!\w){re.escape(skill_normalized)}(?!\w)', normalized))
    return any(re.search(pattern, normalized, re.I) for pattern in patterns)


def weighted_role_fit(
    skills: list[str],
    evidence: dict[str, str],
    weights: dict[str, float] | None = None,
    role_description: str = '',
) -> dict:
    category_weights = weights or {
        'required_skill_alignment': 35,
        'experience_evidence': 25,
        'github_evidence': 20,
        'education_qualifications': 10,
        'achievements': 10,
    }
    normalized_weights = {
        key: max(0.0, float(value))
        for key, value in category_weights.items()
    }
    weight_total = sum(normalized_weights.values())
    if weight_total <= 0:
        raise ValueError('At least one role-fit weight must be greater than zero.')
    normalized_weights = {key: value / weight_total for key, value in normalized_weights.items()}

    resume = evidence.get('resume', '')
    github = evidence.get('github', '')
    portfolio = evidence.get('portfolio', '')
    all_text = '\n'.join(evidence.values())
    matches_by_source = {
        source: [skill for skill in skills if skill_match(text, skill)]
        for source, text in evidence.items()
    }
    matched = [skill for skill in skills if any(skill in values for values in matches_by_source.values())]
    requirement_score = len(matched) / len(skills) * 100 if skills else 0
    experience_signals = _experience_signals(resume)
    achievement_signals = _achievement_signals(resume)
    qualification_terms = r'(?:degree|bachelor|master|doctorate|ph\.?d\.?|diploma|certification|certified)'
    education_required = bool(re.search(
        rf'\b{qualification_terms}\b.{{0,35}}\b(?:required|mandatory|essential|must have|minimum)\b|'
        rf'\b(?:required|mandatory|essential|must have|minimum)\b.{{0,35}}\b{qualification_terms}\b',
        role_description,
        re.I,
    )) and not bool(re.search(
        rf'\b(?:no|not|without)\s+(?:formal\s+)?{qualification_terms}\b.{{0,30}}\b(?:required|necessary|needed)\b|'
        rf'\b{qualification_terms}\b.{{0,30}}\bnot\s+(?:required|necessary|needed)\b',
        role_description,
        re.I,
    ))
    education_found = bool(re.search(
        r'\b(bachelor|master|doctorate|ph\.?d\.?|diploma|degree|university|college|certification|certified)\b',
        resume,
        re.I,
    ))
    github_skills = matches_by_source.get('github', [])
    github_text = evidence.get('github', '')
    repository_names = set(re.findall(
        r'(?im)^Repository\s+(.+?)\s+(?:README|file)\s*:',
        github_text,
    ))
    repository_count = len(repository_names)
    readme_count = len(re.findall(r'(?im)^Repository\s+[^:\r\n]+\s+README:', github_text))
    source_file_count = len(re.findall(r'(?im)^Repository\s+[^:\r\n]+\s+file\s+[^:\r\n]+:', github_text))
    github_coverage = len(github_skills) / len(skills) if skills else 0
    github_project_depth = min(repository_count, 5) / 5
    github_score = round(
        70 * github_coverage
        + 15 * github_project_depth
        + 10 * min(readme_count, 3) / 3
        + 5 * min(source_file_count, 5) / 5
    )

    categories: dict[str, dict] = {
        'required_skill_alignment': {
            'score': requirement_score,
            'assessed': bool(all_text),
            'basis': (
                f'{len(matched)} of {len(skills)} role competencies supported by analyzed resources; '
                f'{len(matches_by_source.get("resume", []))} in resume, '
                f'{len(github_skills)} on GitHub, '
                f'{len(matches_by_source.get("portfolio", []))} in portfolio'
            ),
        },
        'experience_evidence': {
            'score': experience_signals['score'],
            'assessed': bool(resume),
            'basis': experience_signals['basis'],
        },
        'github_evidence': {
            'score': github_score,
            'assessed': 'github' in evidence,
            'basis': (
                f'{len(github_skills)} role competencies found across {repository_count} repository '
                f'records, {readme_count} README files, and {source_file_count} source/config files'
                if github else 'No accessible GitHub text.'
            ),
        },
        'education_qualifications': {
            'score': 100 if education_found else 0,
            'assessed': bool(resume) and education_required,
            'basis': (
                'The job description specifies a degree or certification requirement; resume text was checked for it.'
                if education_required else
                'No degree or certification requirement was specified; this category is excluded rather than penalizing the candidate.'
            ),
        },
        'achievements': {
            'score': achievement_signals['score'],
            'assessed': bool(resume),
            'basis': achievement_signals['basis'],
        },
    }
    applicable_weight = sum(
        normalized_weights.get(name, 0)
        for name, category in categories.items()
        if category['assessed']
    )
    score = (
        sum(
            normalized_weights.get(name, 0) * category['score']
            for name, category in categories.items()
            if category['assessed']
        ) / applicable_weight
        if applicable_weight
        else 0
    )
    return {
        'score': round(score),
        'weights': {name: round(weight * 100, 2) for name, weight in normalized_weights.items()},
        'categories': categories,
        'assessed_weight_percent': round(applicable_weight * 100, 2),
        'matched_skills': matched,
        'skills_needing_verification': [skill for skill in skills if skill not in matched],
        'matches_by_source': matches_by_source,
        'github_metrics': {
            'role_competencies_found': len(github_skills),
            'repository_records_reviewed': repository_count,
            'readme_files_reviewed': readme_count,
            'source_files_reviewed': source_file_count,
        },
    }


def _experience_signals(resume: str) -> dict[str, str | int]:
    experience_terms = len(re.findall(
        r'\b(experience|employment|internship|professional|career|work history|project experience)\b',
        resume,
        re.I,
    ))
    date_ranges = len(re.findall(
        r'\b(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:19|20)\d{2}|present|current)\b',
        resume,
        re.I,
    ))
    action_terms = len(re.findall(
        r'\b(develop(?:ed)?|build(?:ing|t)?|design(?:ed)?|implement(?:ed)?|manage(?:d)?|lead|led|creat(?:e|ed)|maintain(?:ed)?|deliver(?:ed)?|analy[sz](?:e|ed|ing)|support(?:ed)?|deploy(?:ed)?|optimi[sz](?:e|ed))\b',
        resume,
        re.I,
    ))
    metrics = len(re.findall(r'\b\d+(?:\.\d+)?\s*(?:%|percent|x|users|customers|projects|years|months|hours|days)\b', resume, re.I))
    score = min(100, min(experience_terms, 2) * 15 + min(date_ranges, 3) * 20 + min(action_terms, 4) * 7 + min(metrics, 3) * 6)
    return {
        'score': score,
        'basis': (
            f'{experience_terms} employment/experience cues, {date_ranges} dated role periods, '
            f'{action_terms} action statements, and {metrics} quantified details detected'
        ),
    }


def _achievement_signals(resume: str) -> dict[str, str | int]:
    action_terms = len(re.findall(
        r'\b(achiev(?:e|ed|ement)|improv(?:e|ed|ement)|increas(?:e|ed)|reduc(?:e|ed)|deliver(?:ed)|award(?:ed)?|sav(?:e|ed|ings)|launch(?:ed)|optimi[sz](?:e|ed)|grow(?:n|th)?|rais(?:e|ed))\b',
        resume,
        re.I,
    ))
    metrics = len(re.findall(r'\b\d+(?:\.\d+)?\s*(?:%|percent|x|users|customers|projects|years|months|hours|days|dollars|usd)\b', resume, re.I))
    score = min(100, min(action_terms, 4) * 15 + min(metrics, 4) * 10)
    return {
        'score': score,
        'basis': f'{action_terms} outcome/action statements and {metrics} quantified results detected in the resume',
    }


def adaptive_follow_up(answer: str, category: str, evidence_target: str) -> str:
    terms = [
        word for word in re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{2,}", answer)
        if word.lower() not in STOP_WORDS
    ]
    anchor = ' '.join(dict.fromkeys(terms[:6])) or 'the example you described'
    if len(terms) < 4:
        return (
            f'Could you clarify your example about {anchor}? What was your specific role, '
            'what action did you take, and what was the outcome?'
        )
    if category == 'hard skill':
        return (
            f'You mentioned {anchor}. What edge case or failure mode could undermine that approach, '
            f'and what evidence would show that your solution worked for {evidence_target}?'
        )
    return (
        f'You mentioned {anchor}. What did you personally do first, how did others respond, '
        f'and what changed as a result for {evidence_target}?'
    )
