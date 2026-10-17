import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import type { FaceDetector } from '@mediapipe/tasks-vision';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Lock,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const queryClient = new QueryClient();

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `Request failed for ${path}: ${response.status}`;
    try {
      const result = await response.json();
      if (typeof result.detail === 'string') message = result.detail;
    } catch {
      // Keep the HTTP status message when an error response is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function getCandidateId(): string {
  try {
    return sessionStorage.getItem('verityhire-candidate-id') ?? '';
  } catch {
    return '';
  }
}

function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-200">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-3 text-white" onClick={() => setNavOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-violet-500 text-sm font-bold text-slate-950">
              V
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.25em] text-slate-100/80">VERITY</div>
              <div className="text-lg font-bold text-white">HIRE AI</div>
            </div>
          </NavLink>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <NavLink to="/candidate/onboarding" className={({ isActive }) => `transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
              Candidate
            </NavLink>
            <NavLink to="/candidate/report" className={({ isActive }) => `transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
              Intelligence report
            </NavLink>
            <NavLink to="/assessment" className={({ isActive }) => `transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
              Assessment
            </NavLink>
            <NavLink to="/interview" className={({ isActive }) => `transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
              Interview room
            </NavLink>
            <NavLink to="/recruiter" className={({ isActive }) => `transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
              Recruiter
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => `transition ${isActive ? 'text-white' : 'hover:text-white'}`}>
              Admin
            </NavLink>
          </nav>

          <div className="hidden md:flex">
            <button className="rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-200 transition hover:bg-teal-400/15">
              Sign in
            </button>
          </div>

          <button className="inline-flex rounded-full border border-white/10 p-2 md:hidden" onClick={() => setNavOpen((value) => !value)} aria-label="Toggle navigation">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {navOpen && (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-sm text-slate-300">
              <NavLink to="/candidate/onboarding" onClick={() => setNavOpen(false)}>Candidate</NavLink>
              <NavLink to="/candidate/report" onClick={() => setNavOpen(false)}>Intelligence report</NavLink>
              <NavLink to="/assessment" onClick={() => setNavOpen(false)}>Assessment</NavLink>
              <NavLink to="/interview" onClick={() => setNavOpen(false)}>Interview room</NavLink>
              <NavLink to="/recruiter" onClick={() => setNavOpen(false)}>Recruiter</NavLink>
              <NavLink to="/admin" onClick={() => setNavOpen(false)}>Admin</NavLink>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/candidate/onboarding" element={<CandidateOnboardingPage />} />
            <Route path="/candidate/report" element={<CandidateReportPage />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/interview" element={<InterviewRoomPage />} />
            <Route path="/recruiter" element={<RecruiterDashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

function LandingPage() {
  const configQuery = useQuery({ queryKey: ['config'], queryFn: () => fetchJson<any>('/api/config') });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-10">
      <section className="grid gap-8 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-teal-950/20 lg:grid-cols-[1.3fr_0.7fr] lg:p-10">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-teal-200">
            <Sparkles className="h-4 w-4" />
            Adaptive hiring intelligence
          </div>

          <div className="space-y-5">
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Evaluate what a candidate can demonstrate, not only what they claim.
            </h1>
            <p className="max-w-xl text-base text-slate-300 sm:text-lg">
              VerityHire AI combines resume parsing, GitHub and portfolio evidence, timed assessments, and webcam-assisted interviews into a fair, configurable recruitment workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <NavLink to="/candidate/onboarding" className="rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110">
              Start candidate onboarding
            </NavLink>
            <NavLink to="/recruiter" className="rounded-full border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/5">
              Open recruiter dashboard
            </NavLink>
          </div>

          <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
            <StatBlock label="Analysis sources" value="Resume • GitHub • Portfolio" detail="when submitted and accessible" />
            <StatBlock label="Report score" value="Evidence coverage" detail="not job success probability" />
            <StatBlock label="Hiring decision" value="Human review" detail="no automatic rejection" />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-4 shadow-xl shadow-slate-950/30">
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
            <span>System status</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {configQuery.isLoading ? 'Loading' : 'Local mode'}
            </span>
          </div>

          <div className="space-y-4">
            <InfoCard title="Resource analysis" value="Resume • GitHub • Portfolio" tone="teal" icon={<FileSearch className="h-5 w-5" />} />
            <InfoCard title="Evidence report" value="Generated from submitted sources" tone="violet" icon={<Lock className="h-5 w-5" />} />
            <InfoCard title="Assessment coverage" value="Timed tasks + interview" tone="amber" icon={<ClipboardCheck className="h-5 w-5" />} />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
              <span>Analysis status</span>
              <span className="font-medium text-white">Awaiting resources</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-0 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-violet-500" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {[
          { icon: <FileSearch className="h-5 w-5" />, title: 'Evidence-driven profile analysis', body: 'Review resume text, public GitHub activity, and accessible portfolio text against role-related skills.' },
          { icon: <Activity className="h-5 w-5" />, title: 'Adaptive assessment engine', body: 'Dynamic 10-minute tasks based on the candidate’s role, evidence, and previous answers.' },
          { icon: <Video className="h-5 w-5" />, title: 'Privacy-first interview flow', body: 'Consent-driven webcam and mic capture with explicit privacy controls and fairness safeguards.' },
        ].map((feature) => (
          <div key={feature.title} className="rounded-[24px] border border-white/10 bg-slate-900/70 p-6">
            <div className="mb-4 inline-flex rounded-xl border border-teal-400/20 bg-teal-500/10 p-2 text-teal-200">{feature.icon}</div>
            <h3 className="mb-2 text-xl font-semibold text-white">{feature.title}</h3>
            <p className="text-sm text-slate-300">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-white">Fairness and privacy principles</h3>
            <Lock className="h-5 w-5 text-teal-200" />
          </div>
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Candidate-submitted content is treated as untrusted; prompts and uploaded documents never override policy.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Webcam and mic access require explicit consent before media capture.</li>
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Evidence coverage is not a probability, proficiency score, or substitute for human review.</li>
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-violet-500/10 to-slate-900 p-6">
          <h3 className="mb-4 text-2xl font-semibold text-white">Live configuration state</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <span>AI provider mode</span>
              <span className="font-semibold text-teal-200">Local-dev</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <span>Assessment timer</span>
              <span className="font-semibold text-violet-200">10 minutes</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <span>Interview retention</span>
              <span className="font-semibold text-amber-200">90 days</span>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function CandidateOnboardingPage() {
  const { data, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => fetchJson<any>('/api/jobs') });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('Full-Stack Developer');
  const [roleDescription, setRoleDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const jobs = data?.jobs ?? [];

  const handleSubmit = async () => {
    if (!selectedRole.trim()) {
      setErrorMessage('Enter the job role you are applying for.');
      return;
    }
    if (!resumeFile || !githubUrl.trim()) {
      setErrorMessage('A resume file and a GitHub profile URL are both required before analysis.');
      return;
    }
    if (resumeFile && resumeFile.size > 5 * 1024 * 1024) {
      setErrorMessage('Resume file must be no larger than 5 MB.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    const formData = new FormData();
    formData.append('target_role', selectedRole);
    formData.append('role_description', roleDescription);
    formData.append('resume_file', resumeFile);
    formData.append('github_url', githubUrl.trim());
    if (portfolioUrl.trim()) formData.append('portfolio_url', portfolioUrl.trim());

    try {
      const response = await fetch('/api/candidate/onboarding', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail ?? `Analysis failed (${response.status})`);
      }
      queryClient.setQueryData(['report'], result);
      try {
        sessionStorage.setItem('verityhire-candidate-report', JSON.stringify(result));
        sessionStorage.setItem('verityhire-candidate-id', result.data.profile.candidate_id);
      } catch {
        setErrorMessage('Analysis was saved, but browser session storage is unavailable. Keep this tab open to continue.');
      }
      navigate('/candidate/report');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Analysis could not be completed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading job templates and onboarding flow" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Candidate onboarding" title="Create a personalized hiring journey" text="Collect resume evidence, role context, and profile connections before the assessment begins." />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">1. Select a target role</h3>
          <label htmlFor="target-role" className="mb-3 block text-sm font-medium text-slate-300">
            What job role are you interested in applying for?
            <input
              id="target-role"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              maxLength={120}
              required
              placeholder="Enter any job title, including a custom role"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400"
            />
          </label>
          <p className="mb-3 text-xs text-slate-400">Examples below are optional starting points. You can enter any suitable title.</p>
          <div className="grid gap-3">
            {jobs.map((job: any) => (
              <button key={job.id} onClick={() => setSelectedRole(job.title)} className={`rounded-2xl border p-4 text-left transition ${selectedRole === job.title ? 'border-teal-400/40 bg-teal-500/10' : 'border-white/10 bg-slate-950/40 hover:border-white/20'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{job.title}</div>
                    <div className="mt-1 text-sm text-slate-400">{job.department} • {job.location}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <label htmlFor="resume-file" className="mb-2 block text-sm font-medium text-slate-300">Required resume (up to 5 MB)</label>
              <input id="resume-file" type="file" required accept="*/*" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-dashed border-white/15 bg-slate-900 p-3 text-sm text-slate-300" />
              {resumeFile && <p className="mt-2 text-xs text-teal-200">Selected: {resumeFile.name}</p>}
              <p className="mt-2 text-xs text-slate-400">Supports PDF, DOCX, ODT, RTF, PPTX, XLSX, common image scans (OCR), and text-based files. Legacy DOC files must be saved as DOCX first.</p>
            </div>
            <label className="block text-sm text-slate-300">
              Required public GitHub profile URL
              <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} type="url" required placeholder="https://github.com/yourhandle" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400" />
            </label>
            <label className="block text-sm text-slate-300">
              Job description or key requirements (optional, improves role-specific matching)
              <textarea value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} maxLength={4000} rows={4} placeholder="Paste the job responsibilities and skills if available" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400" />
            </label>
            <label className="block text-sm text-slate-300">
              Public portfolio URL
              <input value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} type="url" placeholder="https://yourportfolio.dev" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400" />
            </label>
            <p className="text-xs leading-5 text-slate-400">Resume and GitHub profile are both required. GitHub must be a public profile that the service can verify; rate limits or outages remain verification-pending, not a negative candidate finding.</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">What will be analyzed</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Resume: required; text is extracted from common document formats and OCR is used for image-based resumes.</div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">GitHub: required; verify the public profile and review accessible repository evidence.</div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Portfolio: review public page text when the site permits access.</div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-amber-100">The local deterministic analysis estimates evidence-based role alignment. It is not a probability of job success, proficiency verdict, or automated hiring decision.</div>
          </div>

          <button disabled={isSubmitting || !selectedRole.trim() || !resumeFile || !githubUrl.trim()} onClick={handleSubmit} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? 'Analyzing submitted evidence…' : 'Analyze my resources'}
          </button>

          {errorMessage && <div role="alert" className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{errorMessage}</div>}
        </div>
      </div>
    </motion.div>
  );
}

function CandidateReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['report', getCandidateId()],
    queryFn: async () => {
      const candidateId = getCandidateId();
      if (candidateId) {
        return fetchJson<any>(`/api/candidate/${encodeURIComponent(candidateId)}/report`);
      }
      const savedReport = sessionStorage.getItem('verityhire-candidate-report');
      if (savedReport) {
        try {
          return JSON.parse(savedReport);
        } catch {
          sessionStorage.removeItem('verityhire-candidate-report');
        }
      }
      return null;
    },
  });

  const report = data?.data?.report;
  const profile = data?.data?.profile;
  const eligibility = report?.eligibility;
  const applicationStatus = report?.application_status;
  const skillChart = (report?.skill_evidence ?? []).map((skill: any) => ({
    name: skill.name,
    value: skill.sources.length ? 100 : 0,
  }));

  if (isLoading) {
    return <LoadingState message="Loading your evidence analysis" />;
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="Candidate evidence report" title="Analyze your submitted resources first" text="No report is available yet. Submit your resume and public GitHub profile to begin the review process." />
        <NavLink to="/candidate/onboarding" className="inline-flex rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-5 py-3 font-semibold text-slate-950">Go to resource analysis</NavLink>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Candidate evidence report" title="Resource-based skill evidence" text="This report reflects only the resources that were successfully analyzed. It is not a probability of job success or an automated hiring decision." />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm tracking-[0.22em] text-slate-400">{report.score_label}</div>
                <div className="mt-2 text-5xl font-black text-white">{report.score}/100</div>
              </div>
              <div className="rounded-2xl border border-teal-400/20 bg-teal-500/10 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-teal-200">Role</div>
                <div className="mt-1 text-lg font-semibold text-white">{profile?.target_role}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              {report.summary}
            </div>
            <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100">
              This is a transparent evidence-alignment estimate from the submitted resources, not a prediction of job success, verified proficiency score, or hiring recommendation. A human reviewer must verify the cited evidence.
            </div>
            {report.role_framework && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                <div className="font-semibold text-white">Role competency framework</div>
                <p className="mt-1 text-slate-400">Source: {report.role_framework.source}</p>
                <p className="mt-1 text-slate-300">{report.role_framework.assumptions}</p>
                <p className="mt-2 text-slate-300">Competencies: {report.role_framework.competencies?.join(', ')}</p>
              </div>
            )}
            {report.score_categories && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Object.entries(report.score_categories).map(([category, details]: [string, any]) => (
                  <div key={category} className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300">
                    <div className="font-semibold capitalize text-white">{category.replaceAll('_', ' ')}</div>
                    <div className="mt-1">{details.assessed ? `${details.score}/100 assessed` : 'Not assessed; weight excluded'}</div>
                    <div className="mt-1 text-slate-400">{details.basis}</div>
                  </div>
                ))}
              </div>
            )}
            {report.evidence_coverage && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                <div className="font-semibold text-white">Evidence actually analyzed</div>
                <p className="mt-2">
                  Resume text: {report.evidence_coverage.resume_characters_analyzed?.toLocaleString() ?? 0} characters
                  {' · '}role competencies found on GitHub: {report.evidence_coverage.github_role_competencies_found ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  GitHub repositories: {report.evidence_coverage.github_repository_records_reviewed ?? 0}
                  {' · '}READMEs: {report.evidence_coverage.github_readme_files_reviewed ?? 0}
                  {' · '}source/config files: {report.evidence_coverage.github_source_files_reviewed ?? 0}
                  {' · '}job description supplied: {report.evidence_coverage.role_description_provided ? 'yes' : 'no'}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {report.analysis_method}. Evidence coverage: {report.evidence_coverage.assessed_weight_percent}% of configured scoring weight.
                </p>
              </div>
            )}
            {eligibility && (
              <div className={`mt-4 rounded-2xl border p-4 text-sm ${eligibility.next_stage_unlocked ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
                <div className="font-semibold">
                  {applicationStatus === 'evidence_approved' ? 'Recruiter approved your evidence — assessment is unlocked'
                    : applicationStatus === 'assessment_approved' ? 'Recruiter approved your assessment — interview is unlocked'
                      : applicationStatus === 'assessment_review' && eligibility.next_stage_unlocked ? 'Assessment submitted — interview is open; recruiter review continues'
                        : applicationStatus === 'assessment_review' ? 'Assessment submitted — preparing interview access'
                          : applicationStatus === 'evidence_review' && eligibility.status === 'verification_pending' ? 'Resume or GitHub verification is pending'
                            : applicationStatus === 'evidence_review' && eligibility.next_stage_unlocked ? 'Evidence threshold met — assessment is unlocked'
                            : applicationStatus === 'evidence_review' ? 'Evidence review required before assessment'
                          : eligibility.status === 'verification_pending' ? 'Resume or GitHub verification is pending'
                            : eligibility.status === 'review_required' ? 'Correction or recruiter review required'
                              : 'Recruiter review required'}
                </div>
                <p className="mt-1">{eligibility.message ?? (eligibility.status === 'verification_pending' ? 'Both a readable resume and a successfully verified public GitHub profile are required before advancing. Retry if a service outage occurred.' : 'Progress is controlled by the configured evidence threshold and recruiter approval at each stage.')}</p>
                <p className="mt-1 text-xs opacity-80">Configured evidence threshold: {eligibility.threshold}/100. This is a workflow gate, not a hiring decision.</p>
                {applicationStatus === 'evidence_approved' ? (
                  <NavLink to="/assessment" className="mt-3 inline-flex rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950">Continue to assessment</NavLink>
                ) : applicationStatus === 'evidence_review' && eligibility.next_stage_unlocked ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <NavLink to="/assessment" className="inline-flex rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950">Start assessment</NavLink>
                    {report.sources?.github?.status !== 'analyzed' && (
                      <NavLink to="/candidate/onboarding" className="inline-flex rounded-full border border-white/20 px-4 py-2 font-semibold text-white">
                        Resubmit evidence to retry GitHub analysis
                      </NavLink>
                    )}
                  </div>
                ) : applicationStatus === 'assessment_approved' ? (
                  <NavLink to="/interview" className="mt-3 inline-flex rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950">Continue to interview</NavLink>
                ) : applicationStatus === 'assessment_review' && eligibility.next_stage_unlocked ? (
                  <NavLink to="/interview" className="mt-3 inline-flex rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950">Start interview</NavLink>
                ) : applicationStatus === 'evidence_review' && eligibility.status === 'verification_pending' ? (
                  <NavLink to="/candidate/onboarding" className="mt-3 inline-flex rounded-full border border-amber-200/30 px-4 py-2 font-semibold text-amber-100">Retry resume / GitHub verification</NavLink>
                ) : applicationStatus === 'human_review' ? (
                  <p className="mt-3 font-medium">Your completed stages are with the recruiting team for final human review.</p>
                ) : (
                  <p className="mt-3 text-xs">The assessment unlocks after your evidence meets the configured threshold. The interview unlocks only after assessment submission and recruiter review.</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Skill evidence found in resources</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Matched skills</h3>
            <div className="space-y-3">
              {report.matched_skills.map((skill: string) => (
                <div key={skill} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <span>{skill}</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  {(report.skill_evidence.find((item: any) => item.name === skill)?.evidence_snippets ?? []).map((snippet: any, index: number) => (
                    <blockquote key={`${snippet.source}-${index}`} className="mt-3 border-l-2 border-teal-400/50 pl-3 text-xs text-slate-400">
                      {snippet.excerpt}
                      <cite className="mt-1 block not-italic text-slate-500">{snippet.source} · {snippet.source_location}</cite>
                    </blockquote>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Skills needing verification</h3>
            <div className="space-y-3">
              {report.skills_needing_verification.map((skill: string) => (
                <div key={skill} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                  {skill}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Evidence highlights</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              {report.supporting_evidence.map((item: string, index: number) => (
                <li key={index} className="flex gap-2">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Resource analysis status</h3>
            <div className="space-y-3">
              {Object.entries(report.sources).map(([source, details]: [string, any]) => (
                <div key={source} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium capitalize text-white">{source}</span>
                    <span className="text-xs uppercase tracking-wide text-teal-200">{details.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{details.detail}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-400">
              {report.limitations.map((limitation: string) => <li key={limitation}>• {limitation}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AssessmentPage() {
  const candidateId = getCandidateId();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['assessment', candidateId],
    queryFn: () => fetchJson<any>(`/api/assessment?candidate_id=${encodeURIComponent(candidateId)}`),
    enabled: Boolean(candidateId),
  });
  const assessment = data?.data;
  const totalSeconds = assessment?.time_limit_seconds ?? 600;
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const displayedTimeRemaining = timeRemaining ?? assessment?.time_remaining_seconds ?? totalSeconds;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const answersRef = useRef(answers);
  const submissionInProgressRef = useRef(false);
  const submitRef = useRef<(timeExpired: boolean) => void>(() => undefined);

  const submitAssessment = useCallback(async (timeExpired: boolean) => {
    const currentAnswers = answersRef.current;
    const answeredCount = Object.values(currentAnswers).filter((answer) => answer.trim()).length;
    if (submitted || submissionInProgressRef.current || (!timeExpired && answeredCount === 0)) {
      return;
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);
    setSubmissionError('');
    try {
      const response = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: assessment?.session_id, answers: currentAnswers, time_expired: timeExpired }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail ?? `Submission failed (${response.status})`);
      }
      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ['report'] });
      try {
        sessionStorage.removeItem(`verityhire-assessment-${assessment?.session_id}`);
      } catch {
        // The server has already confirmed submission; a local draft is harmless.
      }
      setSubmissionMessage(
        timeExpired
          ? `Time expired. Your assessment was saved with ${result.data.answered_count} answered task(s).`
          : `Assessment saved with ${result.data.answered_count} answered task(s).`,
      );
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Assessment submission failed. Please retry.');
      submissionInProgressRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [assessment?.session_id, queryClient, submitted]);

  useEffect(() => {
    if (!assessment?.session_id) return;
    if (assessment.status === 'completed') {
      setSubmitted(true);
      setSubmissionMessage('This assessment was already submitted and is available for recruiter review.');
    }
    try {
      const saved = sessionStorage.getItem(`verityhire-assessment-${assessment.session_id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        answersRef.current = parsed;
        setAnswers(parsed);
      } else if (assessment.tasks) {
        const savedAnswers = Object.fromEntries(
          assessment.tasks.filter((task: any) => task.answer).map((task: any) => [task.id, task.answer]),
        ) as Record<string, string>;
        answersRef.current = savedAnswers;
        setAnswers(savedAnswers);
      }
    } catch {
      setSubmissionError('A saved draft could not be restored. Your current answers remain available.');
    }
  }, [assessment?.session_id]);

  useEffect(() => {
    submitRef.current = (timeExpired: boolean) => {
      void submitAssessment(timeExpired);
    };
  }, [submitAssessment]);

  useEffect(() => {
    if (!assessment || submitted || displayedTimeRemaining <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeRemaining((current) => {
        const seconds = current ?? assessment.time_remaining_seconds ?? totalSeconds;
        if (seconds <= 1) {
          window.clearInterval(interval);
          submitRef.current(true);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [assessment, submitted, displayedTimeRemaining, totalSeconds]);

  const progress = Math.max(0, Math.min(100, ((totalSeconds - displayedTimeRemaining) / totalSeconds) * 100));

  const handleAnswerChange = (taskId: string, value: string) => {
    setAnswers((current) => {
      const updated = { ...current, [taskId]: value };
      answersRef.current = updated;
      if (assessment?.session_id) {
        try {
          sessionStorage.setItem(`verityhire-assessment-${assessment.session_id}`, JSON.stringify(updated));
        } catch {
          setSubmissionError('Browser storage is full; submit before leaving this page to avoid losing this draft.');
        }
      }
      return updated;
    });
  };

  const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;

  if (isLoading) {
    return <LoadingState message="Preparing your role-specific assessment" />;
  }

  if (!candidateId || error) {
    const errorText = error instanceof Error ? error.message : 'Start with candidate evidence analysis before the assessment.';
    return (
      <div className="space-y-5">
        <SectionHeader eyebrow="Assessment workspace" title="Assessment is not available yet" text={errorText} />
        <NavLink to={candidateId ? '/candidate/report' : '/candidate/onboarding'} className="inline-flex rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-5 py-3 font-semibold text-slate-950">
          {candidateId ? 'View application progress' : 'Go to evidence analysis'}
        </NavLink>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Assessment workspace" title={assessment?.title ?? 'Role-specific assessment'} text="Timed tasks are generated from the selected role and evidence gaps. Saved responses are available to the local recruiter review flow." />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm uppercase tracking-[0.2em] text-slate-400">Timer</span>
            <div className="rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1 font-semibold text-teal-200">
              {displayedTimeRemaining <= 0 ? '00:00' : `${Math.floor(displayedTimeRemaining / 60)}:${String(displayedTimeRemaining % 60).padStart(2, '0')}`}
            </div>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3"><span>Role alignment</span><span className="font-semibold text-white">System design</span></div>
            <div className="flex justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3"><span>Tasks answered</span><span className="font-semibold text-white">{answeredCount} / {assessment?.tasks?.length ?? 0}</span></div>
            <div className="flex justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3"><span>Auto-submit</span><span className="font-semibold text-white">Enabled</span></div>
          </div>

          {submitted && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {submissionMessage}
              <NavLink to="/interview" className="mt-3 inline-flex rounded-full bg-emerald-300 px-4 py-2 font-semibold text-slate-950">Continue to voice interview</NavLink>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Question panel</h3>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">{assessment?.tasks?.length ?? 0} tasks</span>
          </div>

          <div className="space-y-4">
            {(assessment?.tasks ?? []).map((task: any) => (
              <div key={task.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-teal-200">{task.task_type}</span>
                  <span className="text-xs text-slate-400">Weight: {task.weight}</span>
                </div>
                <p className="text-lg text-white">{task.prompt}</p>
                <textarea
                  value={answers[task.id] ?? ''}
                  onChange={(event) => handleAnswerChange(task.id, event.target.value)}
                  disabled={submitted}
                  className="mt-4 min-h-28 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none focus:border-teal-400"
                  placeholder="Draft your response here..."
                />
              </div>
            ))}
          </div>

          {!answeredCount && !submitted && <p className="mt-3 text-center text-sm text-slate-400">Answer at least one task to enable manual submission. If the timer runs out, your answers auto-submit.</p>}
          {submissionError && <p role="alert" className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{submissionError}</p>}
          <button
            onClick={() => submitRef.current(false)}
            disabled={submitted || isSubmitting || (!answeredCount && displayedTimeRemaining > 0)}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitted ? 'Submitted' : isSubmitting ? 'Saving assessment…' : displayedTimeRemaining <= 0 ? 'Retry submission' : 'Submit assessment'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function InterviewRoomPage() {
  const candidateId = getCandidateId();
  const { data, isLoading, error } = useQuery({
    queryKey: ['interview', candidateId],
    queryFn: () => fetchJson<any>(`/api/interview?candidate_id=${encodeURIComponent(candidateId)}`),
    enabled: Boolean(candidateId),
  });
  const interview = data?.data;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceMonitorIntervalRef = useRef<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);
  const [consent, setConsent] = useState({ camera: false, microphone: false });
  const [isPaused, setIsPaused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [status, setStatus] = useState('Camera and microphone consent required');
  const streamRef = useRef<MediaStream | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [reviewReady, setReviewReady] = useState(interview?.status === 'ready_to_submit');
  const [finalSubmitting, setFinalSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [faceMonitorReady, setFaceMonitorReady] = useState(false);
  const [detectorRetryCount, setDetectorRetryCount] = useState(0);
  const [faceMonitorStatus, setFaceMonitorStatus] = useState('Face visibility check starts after camera preview is active.');
  const [integrityWarning, setIntegrityWarning] = useState('');
  const [voiceActivityStatus, setVoiceActivityStatus] = useState('Not recording');
  const loggedSignalsRef = useRef(new Set<string>());
  const submitAnswerRef = useRef<() => void>(() => undefined);
  const cameraMonitorActive = cameraPreviewReady && faceMonitorReady && faceCount === 1 && !isTabHidden;

  const recordIntegritySignal = (eventType: string, context: string, confidence = 0.5) => {
    if (!interview?.session_id) return;
    void fetch('/api/interview/integrity-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: interview.session_id,
        event_type: eventType,
        context,
        confidence,
      }),
    }).then(async (response) => {
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(typeof result.detail === 'string' ? result.detail : `Signal could not be saved (${response.status})`);
      }
    }).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'unknown error';
      setStatus(`A technical signal could not be saved (${detail}). The interview remains subject to human review.`);
    });
  };

  useEffect(() => {
    if (!interview) return;
    setQuestionIndex(interview.current_question_index ?? 0);
    setCurrentQuestion(interview.current_question ?? null);
    setIsFollowUp(Boolean(interview.current_is_follow_up));
    setReviewReady(interview.status === 'ready_to_submit');
    setCompleted(interview.status === 'submitted');
  }, [interview]);

  useEffect(() => () => {
    speechRecognitionRef.current?.stop();
    if (voiceMonitorIntervalRef.current !== null) {
      window.clearInterval(voiceMonitorIntervalRef.current);
    }
    void audioContextRef.current?.close();
    faceDetectorRef.current?.close();
    streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!sessionStarted || !video || !stream) {
      return;
    }
    video.srcObject = stream;
    video.play().then(() => {
      setCameraPreviewReady(true);
      setStatus('Camera preview and microphone are ready.');
    }).catch(() => {
      setCameraPreviewReady(false);
      setStatus('Devices are connected, but the preview did not start. Use the preview button or check browser permissions.');
    });
  }, [sessionStarted]);

  useEffect(() => {
    if (!cameraPreviewReady) {
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    let lastDetectionAt = 0;
    let multipleFaceFrames = 0;
    let missingFaceFrames = 0;
    let detector: FaceDetector | null = null;
    let faceCheckPaused = true;
    setFaceMonitorReady(false);
    setFaceCount(null);
    setFaceMonitorStatus('Loading the local face visibility model…');

    const monitorFrames = (timestamp: number) => {
      if (cancelled || !detector) return;
      animationFrame = window.requestAnimationFrame(monitorFrames);
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || timestamp - lastDetectionAt < 700) return;
      lastDetectionAt = timestamp;
      try {
        const result = detector.detectForVideo(video, timestamp);
        const count = result.detections.length;
        setFaceCount(count);
        if (count > 1) {
          speechRecognitionRef.current?.stop();
          multipleFaceFrames += 1;
          missingFaceFrames = 0;
          if (multipleFaceFrames >= 2) {
            setIntegrityWarning('More than one face is visible. The interview is paused; continue when only you are in frame. This is an advisory signal for human review, not an automatic rejection.');
            setStatus('Interview paused while the camera view is checked.');
            if (!loggedSignalsRef.current.has('multiple_faces')) {
              loggedSignalsRef.current.add('multiple_faces');
              recordIntegritySignal('multiple_faces', `Local face detector observed ${count} faces in repeated frames.`, 0.55);
            }
          }
        } else if (count === 0) {
          speechRecognitionRef.current?.stop();
          multipleFaceFrames = 0;
          missingFaceFrames += 1;
          if (missingFaceFrames >= 4) {
            setIntegrityWarning('No face is visible. The interview is paused; return to frame and check lighting. This is an advisory signal for human review, not an automatic rejection.');
            setStatus('Interview paused until the camera can see you again.');
            if (!loggedSignalsRef.current.has('no_face')) {
              loggedSignalsRef.current.add('no_face');
              recordIntegritySignal('no_face', 'Local face detector did not see a face across repeated frames.', 0.45);
            }
          }
        } else {
          multipleFaceFrames = 0;
          missingFaceFrames = 0;
          loggedSignalsRef.current.clear();
          setIntegrityWarning('');
          if (faceCheckPaused) {
            faceCheckPaused = false;
            setStatus('One face detected. You may continue the interview.');
          }
        }
        if (count !== 1) faceCheckPaused = true;
        setFaceMonitorStatus(
          count > 1
            ? `${count} faces visible in the camera frame`
            : count === 1
              ? 'One face visible in the camera frame'
              : 'No face detected in the camera frame',
        );
      } catch {
        setFaceMonitorStatus('Face visibility check stopped because a camera frame could not be analyzed.');
        setFaceMonitorReady(false);
        setFaceCount(0);
        setIntegrityWarning('The camera frame could not be checked. The interview is paused; retry the face check or request help from the recruiting team.');
        speechRecognitionRef.current?.stop();
        detector?.close();
        detector = null;
        faceDetectorRef.current = null;
      }
    };

    const initializeDetector = async () => {
      try {
        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm',
        );
        const loadedDetector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.65,
        });
        if (cancelled) {
          loadedDetector.close();
          return;
        }
        detector = loadedDetector;
        faceDetectorRef.current = loadedDetector;
        setFaceMonitorStatus('Face visibility check is active locally in this browser.');
        setFaceMonitorReady(true);
        animationFrame = window.requestAnimationFrame(monitorFrames);
      } catch {
        if (!cancelled) {
          setFaceMonitorReady(false);
          setFaceCount(0);
          setFaceMonitorStatus('Face visibility check is unavailable. The camera remains active; no face-count warning can be provided.');
          setIntegrityWarning('The local face-check model could not load. The interview remains paused; retry the check or contact the recruiting team. This technical issue is not a negative candidate finding.');
          recordIntegritySignal('face_check_unavailable', 'Local face visibility model failed to initialize.', 0.2);
        }
      }
    };

    void initializeDetector();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      detector?.close();
      faceDetectorRef.current = null;
    };
  }, [cameraPreviewReady, detectorRetryCount]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!sessionStarted || !stream) return;
    const onTrackEnded = (event: Event) => {
      const track = event.currentTarget as MediaStreamTrack;
      setCameraPreviewReady(false);
      setFaceMonitorReady(false);
      setFaceCount(0);
      setSessionStarted(false);
      speechRecognitionRef.current?.stop();
      setIntegrityWarning(`${track.kind === 'video' ? 'Camera' : 'Microphone'} disconnected. Reconnect it before continuing.`);
      setStatus(`${track.kind === 'video' ? 'Camera' : 'Microphone'} disconnected`);
      recordIntegritySignal(
        track.kind === 'video' ? 'camera_disconnected' : 'microphone_disconnected',
        `${track.kind} media track ended unexpectedly.`,
        0.95,
      );
    };
    stream.getTracks().forEach((track) => track.addEventListener('ended', onTrackEnded));
    return () => stream.getTracks().forEach((track) => track.removeEventListener('ended', onTrackEnded));
  }, [sessionStarted]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const hidden = document.visibilityState === 'hidden';
      setIsTabHidden(hidden);
      if (!hidden || !sessionStarted || completed) return;
      speechRecognitionRef.current?.stop();
      recordIntegritySignal('tab_hidden', 'Interview tab was not visible; the interview timer is paused until the candidate returns.', 0.4);
      setStatus('Interview paused because this tab is not visible. Return here to continue.');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [completed, sessionStarted]);

  useEffect(() => {
    const durationSeconds = (interview?.max_response_minutes ?? 5) * 60;
    setQuestionTimeRemaining(durationSeconds);
  }, [currentQuestion?.id, interview?.max_response_minutes]);

  useEffect(() => {
    if (!sessionStarted || !cameraMonitorActive || isPaused || completed || reviewReady || !currentQuestion) return;
    const timer = window.setInterval(() => {
      setQuestionTimeRemaining((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer);
          speechRecognitionRef.current?.stop();
          setStatus('The response time limit was reached. Submit the captured transcript or request a technical retry.');
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cameraMonitorActive, completed, currentQuestion, isPaused, reviewReady, sessionStarted]);

  const handleConsent = async () => {
    if (!consent.camera || !consent.microphone) {
      setStatus('Enable both camera and microphone to continue');
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('Camera and microphone access is unavailable. Use a supported browser on localhost or HTTPS.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      const message = name === 'NotAllowedError'
        ? 'Camera or microphone permission was denied. Allow both devices for this site in browser settings, then retry.'
        : name === 'NotFoundError'
          ? 'No camera or microphone was found. Connect a device and retry.'
          : name === 'NotReadableError'
            ? 'The camera or microphone is busy in another app. Close that app and retry.'
            : name === 'OverconstrainedError'
              ? 'The selected camera or microphone cannot satisfy the requested settings. Check your devices and retry.'
              : `Could not start camera and microphone${name ? ` (${name})` : ''}. Check device connections and browser permissions.`;
      setStatus(message);
      return;
    }

    setFaceMonitorStatus('Loading the local face visibility model…');
    setFaceMonitorReady(false);
    setFaceCount(null);
    try {
      const response = await fetch('/api/interview/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera: true, microphone: true, session_id: interview?.session_id }),
      });
      if (!response.ok) {
        throw new Error(`Consent request failed: ${response.status}`);
      }
      streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPreviewReady(false);
      setSessionStarted(true);
      setStatus('Camera and microphone connected. Starting preview…');
    } catch {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStatus('Could not confirm consent with the interview service. Please try again.');
    }
  };

  const handleStartSpeaking = () => {
    if (!cameraMonitorActive) {
      setStatus('The camera preview and local one-face check must be active before recording an answer.');
      return;
    }
    if (questionTimeRemaining <= 0) {
      setStatus('This question reached its response time limit. Submit the transcript or request a technical retry.');
      return;
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus('Voice transcription is not supported in this browser. Use a current version of Chrome or Edge.');
      return;
    }
    if (!streamRef.current?.getAudioTracks().some((track) => track.readyState === 'live')) {
      setStatus('Microphone is not active. Re-enable it before answering.');
      return;
    }

    setAnswerText('');
    setVoiceActivityStatus('Listening for speech…');
    if (voiceMonitorIntervalRef.current !== null) {
      window.clearInterval(voiceMonitorIntervalRef.current);
    }
    void audioContextRef.current?.close();
    try {
      const stream = streamRef.current;
      if (stream) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const startedAt = Date.now();
        let speechDetected = false;
        voiceMonitorIntervalRef.current = window.setInterval(() => {
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
          if (rms > 0.018) {
            speechDetected = true;
            setVoiceActivityStatus('Voice activity detected');
          } else if (!speechDetected && Date.now() - startedAt > 8000) {
            setVoiceActivityStatus('No clear microphone activity — speak toward the microphone.');
          } else if (speechDetected) {
            setVoiceActivityStatus('Microphone level is quiet; continue when ready.');
          }
        }, 250);
      }
    } catch {
      setVoiceActivityStatus('Live speech activity check is unavailable, but browser speech transcription can still run.');
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      setAnswerText(Array.from(event.results).map((result) => result[0].transcript).join(' '));
      setVoiceActivityStatus('Speech recognized by browser transcription');
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (voiceMonitorIntervalRef.current !== null) {
        window.clearInterval(voiceMonitorIntervalRef.current);
        voiceMonitorIntervalRef.current = null;
      }
      setStatus(`Voice capture stopped: ${event.error}. You can try again.`);
      recordIntegritySignal('transcription_error', `Browser speech recognition error: ${event.error}.`, 0.2);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (voiceMonitorIntervalRef.current !== null) {
        window.clearInterval(voiceMonitorIntervalRef.current);
        voiceMonitorIntervalRef.current = null;
      }
      speechRecognitionRef.current = null;
    };
    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setStatus('Listening. Speak your answer clearly, then stop the microphone.');
    } catch {
      speechRecognitionRef.current = null;
      setIsListening(false);
      setStatus('Could not start voice capture. Check microphone permission and try again.');
    }
  };

  const handleStopSpeaking = () => {
    speechRecognitionRef.current?.stop();
  };

  const handleSubmitAnswer = async () => {
    const questions = interview?.questions ?? [];
    const question = currentQuestion ?? questions[questionIndex];
    if (!cameraMonitorActive || !question || !answerText.trim() || isListening || isSubmitting) {
      if (!cameraMonitorActive) {
        setStatus('The interview is paused until one face is visible and the camera check is active.');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answerText.trim(),
          question_id: question.id,
          session_id: interview?.session_id,
          question_index: questionIndex,
          is_follow_up: isFollowUp,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail ?? `Answer submission failed: ${response.status}`);
      }
      if (result.data.status === 'ready_to_submit') {
        setReviewReady(true);
        setCurrentQuestion(null);
        setStatus('All responses are saved. Review the session and submit when ready.');
      } else {
        setCurrentQuestion(result.data.next_question);
        setQuestionIndex(Math.floor(result.data.next_question.position / 2));
        setIsFollowUp(result.data.next_question.category === 'adaptive follow-up');
        setAnswerText('');
        setStatus(result.data.status === 'follow_up'
          ? 'Your response was saved. A follow-up based on your answer is ready.'
          : 'Your response was saved. The next role-focused question is ready.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Answer could not be submitted. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    submitAnswerRef.current = () => {
      void handleSubmitAnswer();
    };
  }, [handleSubmitAnswer]);

  const handleFinalSubmit = async () => {
    if (!interview?.session_id || !reviewReady || finalSubmitting) return;
    setFinalSubmitting(true);
    setSubmissionError('');
    try {
      const response = await fetch('/api/interview/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: interview.session_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? `Submission failed (${response.status})`);
      setCompleted(true);
      setReviewReady(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraPreviewReady(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      setStatus('Submitted successfully.');
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Submission failed. Your saved responses are preserved; retry.');
    } finally {
      setFinalSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Preparing adaptive interview" />;
  }

  if (!candidateId || error) {
    const errorText = error instanceof Error ? error.message : 'Complete evidence analysis and the role assessment before the interview.';
    return (
      <div className="space-y-5">
        <SectionHeader eyebrow="Voice interview" title="Interview is not available yet" text={errorText} />
        <NavLink to={candidateId ? '/candidate/report' : '/candidate/onboarding'} className="inline-flex rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-5 py-3 font-semibold text-slate-950">
          {candidateId ? 'View application progress' : 'Go to candidate onboarding'}
        </NavLink>
      </div>
    );
  }

  const questions = interview?.questions ?? [];
  const question = currentQuestion ?? questions[questionIndex];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400"><Video className="h-4 w-4" /> Interview status</div>
          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${isPaused ? 'border-amber-400/20 bg-amber-500/10 text-amber-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>
            {isPaused ? 'Paused' : status}
          </span>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
          <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 object-cover" />
          {sessionStarted && !cameraPreviewReady && (
            <button onClick={() => {
              const video = videoRef.current;
              if (video && streamRef.current) {
                video.srcObject = streamRef.current;
                video.play().then(() => {
                  setCameraPreviewReady(true);
                  setStatus('Camera preview and microphone are ready.');
                }).catch(() => setStatus('Preview still cannot start. Check whether the camera is blocked by another application.'));
              }
            }} className="mt-3 w-full rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/5">
              Start camera preview
            </button>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
            <span>Camera</span>
            <span className={`font-medium ${cameraPreviewReady ? 'text-emerald-200' : 'text-slate-400'}`}>{cameraPreviewReady ? 'Live preview' : sessionStarted ? 'Connected, preview off' : 'Not started'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
            <span>Microphone</span>
            <span className={`font-medium ${isListening ? 'text-emerald-200' : sessionStarted ? 'text-teal-200' : 'text-slate-400'}`}>{isListening ? 'Listening' : sessionStarted ? 'Ready' : 'Not started'}</span>
          </div>
          {sessionStarted && (
            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs">
              <div className="flex items-start justify-between gap-3 text-slate-300">
                <span>Visible-face check</span>
                <span className="text-right text-teal-200">{faceCount === null ? faceMonitorStatus : `${faceCount} ${faceCount === 1 ? 'face' : 'faces'} visible`}</span>
              </div>
              {!faceMonitorReady && (
                <button
                  onClick={() => setDetectorRetryCount((count) => count + 1)}
                  className="rounded-full border border-amber-300/30 px-3 py-1.5 font-medium text-amber-100 hover:bg-amber-500/10"
                >
                  Retry face check
                </button>
              )}
              {isTabHidden && <p className="text-amber-100">Interview paused. Return to this tab to continue.</p>}
              <div className="flex items-start justify-between gap-3 text-slate-300">
                <span>Speech activity</span>
                <span className="text-right text-teal-200">{voiceActivityStatus}</span>
              </div>
                <p className="text-slate-400">Face detection checks visible faces in this browser only. It does not identify people, inspect off-screen areas, or make hiring decisions. The camera image is not sent to the backend. Microphone level can be affected by background noise and does not identify who is speaking.</p>
            </div>
          )}
          {integrityWarning && (
            <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              {integrityWarning}
            </div>
          )}
        </div>

        {!sessionStarted ? (
          <>
            <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Before you begin</p>
              <p>Estimated interview duration: up to {interview?.expected_duration_minutes ?? 30} minutes, including role-specific questions and contextual follow-ups.</p>
              <p>Take the interview alone in a quiet, well-lit space. Both camera and microphone must be enabled before questions appear.</p>
              <p>Your camera preview is shown here. A face-count model/runtime downloads from public CDNs, then processes frames locally in your browser; video frames are not uploaded. The interview pauses when the camera check cannot see exactly one face. Voice transcription may be processed by your browser speech provider. No typing is accepted.</p>
              <p>Raw camera video and microphone audio are not uploaded or stored. Speech transcripts are sent to this local API and saved to the local database for human review. Retention deletion is not implemented in this prototype.</p>
              <p>Camera, tab visibility, and device signals are approximate and are reviewed by a person. They never automatically reject you. Background sounds cannot be reliably identified as misconduct.</p>
              <label className="flex items-start gap-3 pt-1">
                <input type="checkbox" checked={consent.camera && consent.microphone} onChange={(event) => setConsent({ camera: event.target.checked, microphone: event.target.checked })} className="mt-1 h-4 w-4" />
                <span>I consent to enabling my camera and microphone and understand browser speech recognition may process audio according to the browser provider’s settings.</span>
              </label>
            </div>
            <button disabled={!consent.camera || !consent.microphone} onClick={handleConsent} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
              Enable devices and begin interview
            </button>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Interview session active</div>
            <p className="mt-2">Your camera preview remains on during the interview. The microphone listens only while you start voice capture for an answer.</p>
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
        {completed ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-300" />
          <h3 className="text-xl font-semibold text-white">Submitted Successfully</h3>
          <p className="mt-2 text-sm text-slate-300">Your assessment has been received. Your results will be reviewed according to the recruitment process.</p>
          </div>
        ) : reviewReady ? (
          <div className="flex min-h-[360px] flex-col justify-center rounded-2xl border border-teal-400/20 bg-teal-500/5 p-6">
            <h3 className="text-2xl font-semibold text-white">Review before final submission</h3>
            <p className="mt-2 text-sm text-slate-300">Confirm that your answers were captured. Responses are saved locally for recruiter review; no automated rejection or AI-authorship judgment is made.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
                Questions answered: {interview?.response_count ?? 0}
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
                Camera: {sessionStarted ? 'was active in this session' : 'session restored'}
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
                Microphone: {sessionStarted ? 'was enabled with consent' : 'session restored'}
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
                Technical signals: informational and subject to human review
              </div>
            </div>
            {submissionError && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{submissionError}</p>}
            <button onClick={handleFinalSubmit} disabled={finalSubmitting} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">
              {finalSubmitting ? 'Submitting saved responses…' : 'Submit Interview'}
            </button>
          </div>
        ) : !cameraMonitorActive ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center text-slate-400">
            <div>
              <p className="font-semibold text-white">
                {!cameraPreviewReady
                  ? 'Start the camera preview to continue.'
                  : !faceMonitorReady
                    ? 'The face visibility check must be ready before continuing.'
                    : isTabHidden
                      ? 'Return to the interview tab to continue.'
                      : faceCount === 0
                        ? 'No face detected. Return to the camera frame; the interview timer is paused.'
                        : 'More than one face detected. Continue when only you are in frame; the interview timer is paused.'}
              </p>
              <p className="mt-2 text-sm">Technical and face-visibility signals are advisory for human review only, never automatic rejection.</p>
            </div>
          </div>
        ) : question ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{isFollowUp ? `Follow-up to question ${questionIndex + 1}` : `Question ${questionIndex + 1} of ${interview?.question_count ?? questions.length}`}</div>
                <div className="mt-2 text-xs font-medium text-amber-200">
                  Response time remaining: {Math.floor(questionTimeRemaining / 60)}:{String(questionTimeRemaining % 60).padStart(2, '0')}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">{question.question_text}</div>
              </div>
              <div className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${question.category === 'hard skill' ? 'border-violet-400/20 bg-violet-500/10 text-violet-200' : question.category === 'soft skill' ? 'border-teal-400/20 bg-teal-500/10 text-teal-200' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>{question.category}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Evidence target</span>
                <span className="font-medium text-white">{question.evidence_target}</span>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-teal-400" style={{ width: `${((questionIndex + (isFollowUp ? 0.5 : 0)) / (interview?.question_count ?? questions.length)) * 100}%` }} />
              </div>
              <label htmlFor="spoken-answer" className="mb-2 block text-sm font-medium text-slate-200">Voice transcript (read-only)</label>
              <textarea
                id="spoken-answer"
                value={answerText}
                readOnly
                className="min-h-32 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none"
                placeholder="Your spoken answer transcript will appear here. Typing is disabled."
              />
              <div className="mt-3 flex flex-wrap gap-3">
                {!isListening ? (
                  <button onClick={handleStartSpeaking} disabled={isPaused || completed || questionTimeRemaining <= 0} className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
                    <Mic className="h-4 w-4" /> Start speaking
                  </button>
                ) : (
                  <button onClick={handleStopSpeaking} className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-100">
                    <MicOff className="h-4 w-4" /> Stop listening
                  </button>
                )}
                <span className="self-center text-xs text-slate-400">You control when voice capture starts and stops.</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button disabled={isListening || isSubmitting || !cameraMonitorActive} onClick={() => setIsPaused((value) => !value)} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50">
                {isPaused ? 'Resume interview' : 'Pause / technical interruption'}
              </button>
              <button disabled={!answerText.trim() || isListening || isSubmitting || isPaused || !cameraMonitorActive} onClick={handleSubmitAnswer} className="rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? 'Submitting…' : isFollowUp && questionIndex + 1 === questions.length ? 'Submit final answer' : 'Submit spoken answer'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-amber-400/20 p-6 text-center text-amber-100">
            No interview questions are available. Please contact the recruiting team.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RecruiterDashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['recruiter-dashboard'], queryFn: () => fetchJson<any>('/api/recruiter/dashboard') });
  const summary = data?.data;
  const candidates = summary?.applications ?? [];
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const selected = candidates.find((candidate: any) => candidate.candidate_id === selectedCandidate) ?? candidates[0];
  const reportQuery = useQuery({
    queryKey: ['recruiter-report', selected?.candidate_id],
    queryFn: () => fetchJson<any>(`/api/recruiter/reports/${encodeURIComponent(selected.candidate_id)}`),
    enabled: Boolean(selected?.candidate_id),
  });
  const report = reportQuery.data?.data?.report;
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState('');
  const [advanceMessage, setAdvanceMessage] = useState('');
  const performance = (report?.skill_evidence ?? []).map((skill: any) => ({
    name: skill.name,
    value: skill.sources?.length ? 100 : 0,
  }));

  const approveNextStage = async () => {
    if (!selected?.candidate_id || isAdvancing) return;
    setIsAdvancing(true);
    setAdvanceError('');
    setAdvanceMessage('');
    try {
      const response = await fetch(`/api/recruiter/applications/${encodeURIComponent(selected.candidate_id)}/approve-next-stage`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? `Approval failed (${response.status})`);
      setAdvanceMessage(result.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recruiter-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['recruiter-report', selected.candidate_id] }),
        queryClient.invalidateQueries({ queryKey: ['report', selected.candidate_id] }),
      ]);
    } catch (error) {
      setAdvanceError(error instanceof Error ? error.message : 'Could not approve the next stage.');
    } finally {
      setIsAdvancing(false);
    }
  };

  useEffect(() => {
    if (candidates.length && !candidates.some((candidate: any) => candidate.candidate_id === selectedCandidate)) {
      setSelectedCandidate(candidates[0].candidate_id);
    }
  }, [candidates, selectedCandidate]);

  if (isLoading) {
    return <LoadingState message="Loading pipeline evidence" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Recruiter pipeline" title="Review candidate evidence without losing signal" text="Compare role-fit, assessment performance, and interview evidence in one review workspace." />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Candidates in review" value={summary?.candidate_count ?? 0} icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Active jobs" value={summary?.active_jobs ?? 0} icon={<BarChart3 className="h-5 w-5" />} />
        <MetricCard label="Review queue" value={summary?.jobs_to_review ?? 0} icon={<CircleDashed className="h-5 w-5" />} />
        <MetricCard label="Avg role fit" value={`${summary?.avg_role_fit ?? 0}`} icon={<Gauge className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">Candidate performance by competency</h3>
          {performance.length ? <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="value" fill="#a78bfa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-400">No saved candidate competency evidence is available yet.</p>}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">Evidence review queue</h3>
          <div className="space-y-3">
            {candidates.map((candidate: any) => (
              <div key={candidate.candidate_id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-200">
                <div>
                  <div className="font-medium text-white">{candidate.candidate_role || 'Candidate application'}</div>
                  <div className="text-xs text-slate-400">Role-fit {candidate.role_fit ?? 'not assessed'} • {candidate.status}</div>
                </div>
                <button onClick={() => setSelectedCandidate(candidate.candidate_id)} className={`rounded-full px-3 py-1 text-xs font-medium ${selected?.candidate_id === candidate.candidate_id ? 'border border-teal-400/20 bg-teal-500/10 text-teal-200' : 'border border-white/10 text-white hover:bg-white/5'}`}>
                  {selected?.candidate_id === candidate.candidate_id ? 'Selected' : 'Review'}
                </button>
              </div>
            ))}
            {!candidates.length && <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No candidate applications have been submitted.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
        <h3 className="mb-4 text-xl font-semibold text-white">Applications by role</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {candidates.map((candidate: any) => (
            <button key={candidate.candidate_id} onClick={() => setSelectedCandidate(candidate.candidate_id)} className={`rounded-[22px] border p-4 text-left ${selected?.candidate_id === candidate.candidate_id ? 'border-teal-400/30 bg-slate-950' : 'border-white/10 bg-slate-950/40'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold text-white">{candidate.job_title}</div>
                <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-xs text-violet-200">{candidate.role_fit ?? '—'}</div>
              </div>
              <div className="mt-3 text-sm text-slate-300">Application {candidate.candidate_id.slice(0, 8)} · {candidate.status}</div>
            </button>
          ))}
          {!candidates.length && <p className="text-sm text-slate-400">No applications to compare.</p>}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
        <h3 className="mb-2 text-xl font-semibold text-white">Selected candidate review</h3>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          {selected ? <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">{selected.candidate_role}</div>
              <div className="text-sm text-slate-400">Application {selected.candidate_id.slice(0, 8)} · {selected.status}</div>
            </div>
            <div className="rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-200">{selected.role_fit ?? '—'}/100</div>
          </div> : <p className="text-sm text-slate-400">Select a saved application to review its evidence.</p>}
          {reportQuery.isLoading && selected && <p className="mt-4 text-sm text-slate-400">Loading saved report…</p>}
          {reportQuery.error && <p role="alert" className="mt-4 text-sm text-rose-200">Report could not be loaded. Retry by selecting the candidate again.</p>}
          {report && (
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>{report.summary}</p>
              <p>Application stage: {report.application_status}; assessment: {report.assessment_status}; interview: {report.interview_status}</p>
              {selected && ['evidence_review', 'assessment_review'].includes(report.application_status) && (
                <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
                  <p className="font-medium text-violet-100">
                    {report.application_status === 'evidence_review'
                      ? `Resume and GitHub evidence score: ${selected.role_fit ?? '—'}/100 (required threshold: ${report.eligibility?.threshold ?? '—'}).`
                      : 'Review the submitted assessment responses below before approving an interview.'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Advancement requires this human review. Camera or face-visibility signals never automatically reject a candidate.</p>
                  {advanceError && <p role="alert" className="mt-3 text-sm text-rose-200">{advanceError}</p>}
                  {advanceMessage && <p role="status" className="mt-3 text-sm text-emerald-200">{advanceMessage}</p>}
                  <button
                    onClick={() => void approveNextStage()}
                    disabled={isAdvancing || (report.application_status === 'evidence_review' && (
                      (selected.role_fit ?? 0) < (report.eligibility?.threshold ?? 100)
                      || report.sources?.resume?.status !== 'analyzed'
                      || report.sources?.github?.status !== 'analyzed'
                    ))}
                    className="mt-3 rounded-full bg-violet-300 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAdvancing ? 'Saving review…' : report.application_status === 'evidence_review' ? 'Approve assessment stage' : 'Approve interview stage'}
                  </button>
                </div>
              )}
              {report.assessment_responses?.map((response: any) => (
                <details key={response.task_id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <summary className="cursor-pointer font-medium text-white">{response.category}: {response.result_category}</summary>
                  <p className="mt-2">{response.prompt}</p>
                  <p className="mt-2 whitespace-pre-wrap text-slate-400">{response.answer ?? 'No response saved.'}</p>
                  <p className="mt-2 text-xs text-slate-500">Review rubric: {response.rubric}</p>
                </details>
              ))}
              {report.interview_responses?.map((response: any) => (
                <details key={response.question_id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <summary className="cursor-pointer font-medium text-white">{response.category}: {response.result_category}</summary>
                  <p className="mt-2">{response.question}</p>
                  <p className="mt-2 whitespace-pre-wrap text-slate-400">{response.answer ?? 'No response saved.'}</p>
                  <p className="mt-2 text-xs text-slate-500">Evidence target: {response.evidence_target}</p>
                </details>
              ))}
              {report.integrity_events?.length > 0 && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
                  <div className="font-semibold text-amber-100">Informational technical signals (human review only)</div>
                  {report.integrity_events.map((event: any, index: number) => (
                    <p key={`${event.timestamp}-${index}`} className="mt-2 text-xs text-slate-300">
                      {event.timestamp} · {event.event_type} · confidence {Math.round(event.confidence * 100)}% · {event.review_status} · {event.context}
                    </p>
                  ))}
                </div>
              )}
              {report.final_report && <p>Final review: {report.final_report.summary}</p>}
              <button onClick={() => window.print()} className="rounded-full border border-white/15 px-4 py-2 font-medium text-white hover:bg-white/5">Print / export report</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AdminPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['admin'], queryFn: () => fetchJson<any>('/api/admin/settings') });
  const settings = data?.data;
  const [policyForm, setPolicyForm] = useState({ screening_threshold: 60, question_count: 6, max_minutes_per_question: 5, retention_days: 90 });
  const [policyStatus, setPolicyStatus] = useState('');
  const [policySaving, setPolicySaving] = useState(false);
  const [roleWeightRole, setRoleWeightRole] = useState('Full-Stack Developer');
  const [roleWeights, setRoleWeights] = useState({
    required_skill_alignment: 35,
    experience_evidence: 25,
    github_evidence: 20,
    education_qualifications: 10,
    achievements: 10,
  });

  useEffect(() => {
    if (settings?.policy) setPolicyForm(settings.policy);
  }, [settings]);

  useEffect(() => {
    const savedWeights = settings?.role_weights?.[roleWeightRole];
    if (savedWeights) setRoleWeights(savedWeights);
  }, [roleWeightRole, settings?.role_weights]);

  const savePolicy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPolicySaving(true);
    setPolicyStatus('');
    try {
      const response = await fetch('/api/admin/settings/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screening_threshold: Number(policyForm.screening_threshold),
          question_count: Number(policyForm.question_count),
          max_minutes_per_question: Number(policyForm.max_minutes_per_question),
          retention_days: Number(policyForm.retention_days),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? `Policy update failed (${response.status})`);
      setPolicyStatus('Recruitment policy saved.');
      await refetch();
    } catch (error) {
      setPolicyStatus(error instanceof Error ? error.message : 'Policy could not be saved. Retry.');
    } finally {
      setPolicySaving(false);
    }
  };

  const saveRoleWeights = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPolicySaving(true);
    setPolicyStatus('');
    try {
      const response = await fetch('/api/admin/settings/role-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleWeightRole, weights: roleWeights }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? `Role weights could not be saved (${response.status})`);
      setPolicyStatus(`Weights saved for ${roleWeightRole}.`);
      await refetch();
    } catch (error) {
      setPolicyStatus(error instanceof Error ? error.message : 'Role weights could not be saved.');
    } finally {
      setPolicySaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading provider and policy configuration" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Admin settings" title="Control AI providers, policies, and retention" text="Configurable generative AI and privacy settings for a compliant hiring workflow." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">AI provider status</h3>
          <div className="space-y-3">
            {(settings?.provider_status ?? []).map((provider: any) => (
              <div key={provider.provider} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">{provider.provider}</div>
                    <div className="text-sm text-slate-400">Model: {provider.model}</div>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-200">{provider.status}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">Provider credentials are not collected in this UI. Configure a supported provider and secrets through the server environment before enabling external AI services.</p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">Recruitment policy</h3>
          <form onSubmit={savePolicy} className="space-y-4">
            <label className="block text-sm text-slate-300">Evidence threshold (0–100)
              <input type="number" min="0" max="100" value={policyForm.screening_threshold} onChange={(event) => setPolicyForm((state) => ({ ...state, screening_threshold: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
            <label className="block text-sm text-slate-300">Interview base questions (1–25)
              <input type="number" min="1" max="25" value={policyForm.question_count} onChange={(event) => setPolicyForm((state) => ({ ...state, question_count: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
            <label className="block text-sm text-slate-300">Maximum minutes per response (1–5)
              <input type="number" min="1" max="5" value={policyForm.max_minutes_per_question} onChange={(event) => setPolicyForm((state) => ({ ...state, max_minutes_per_question: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
            <label className="block text-sm text-slate-300">Retention period (days)
              <input type="number" min="1" max="3650" value={policyForm.retention_days} onChange={(event) => setPolicyForm((state) => ({ ...state, retention_days: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
            {policyStatus && <p role={policyStatus.includes('saved') ? 'status' : 'alert'} className="text-sm text-teal-100">{policyStatus}</p>}
            <button disabled={policySaving} className="w-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{policySaving ? 'Saving policy…' : 'Save recruitment policy'}</button>
          </form>
          <p className="mt-4 text-xs leading-5 text-slate-400">The local demo stores policy settings but does not enforce retention deletion or authentication/RBAC. Do not use it with production candidate data.</p>
        </div>
      </div>
      <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
        <h3 className="mb-2 text-xl font-semibold text-white">Role-specific evidence weights</h3>
        <p className="mb-4 text-sm text-slate-400">Weights are normalized by the analysis engine. Categories that cannot be assessed are excluded and the remaining weights are renormalized.</p>
        <form onSubmit={saveRoleWeights} className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-300 md:col-span-2">Role title
            <input value={roleWeightRole} onChange={(event) => setRoleWeightRole(event.target.value)} maxLength={120} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
          </label>
          {Object.entries(roleWeights).map(([key, value]) => (
            <label key={key} className="block text-sm capitalize text-slate-300">{key.replaceAll('_', ' ')}
              <input type="number" min="0" max="1000" value={value} onChange={(event) => setRoleWeights((state) => ({ ...state, [key]: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
            </label>
          ))}
          <button disabled={policySaving} className="rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60 md:col-span-2">{policySaving ? 'Saving…' : 'Save weights for this role'}</button>
          {policyStatus && <p role={policyStatus.includes('saved') ? 'status' : 'alert'} className="text-sm text-teal-100 md:col-span-2">{policyStatus}</p>}
        </form>
      </div>
    </motion.div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-slate-900/60 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
        <div className="text-lg font-medium text-white">{message}</div>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-2 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">{eyebrow}</div>
      <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="max-w-3xl text-base text-slate-300">{text}</p>
    </div>
  );
}

function StatBlock({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-3 text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

function InfoCard({ title, value, tone, icon }: { title: string; value: string; tone: string; icon: React.ReactNode }) {
  const toneMap: Record<string, string> = {
    teal: 'border-teal-400/20 bg-teal-500/10 text-teal-200',
    violet: 'border-violet-400/20 bg-violet-500/10 text-violet-200',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
  };

  return (
    <div className={`flex items-center justify-between rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-300">{title}</div>
        <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      </div>
      <div className="rounded-xl bg-slate-950/40 p-2">{icon}</div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between text-slate-300">
        <div className="text-sm">{label}</div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-2 text-teal-200">{icon}</div>
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
