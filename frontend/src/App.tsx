import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useEffect, useRef, useState } from 'react';
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
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
            <StatBlock label="Candidates processed" value="5,284" detail="this quarter" />
            <StatBlock label="AI evidence checks" value="98.3%" detail="structured rubric coverage" />
            <StatBlock label="Review time" value="4.2h" detail="to decision" />
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
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const jobs = data?.jobs ?? [];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    const formData = new FormData();
    formData.append('target_role', selectedRole);
    if (resumeFile) formData.append('resume_file', resumeFile);
    if (githubUrl.trim()) formData.append('github_url', githubUrl.trim());
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
      } catch {
        setErrorMessage('Report is ready in this tab, but browser session storage is unavailable. Keep this tab open to view it.');
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
              <label htmlFor="resume-file" className="mb-2 block text-sm font-medium text-slate-300">Resume upload (PDF or DOCX, up to 5 MB)</label>
              <input id="resume-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-dashed border-white/15 bg-slate-900 p-3 text-sm text-slate-300" />
              {resumeFile && <p className="mt-2 text-xs text-teal-200">Selected: {resumeFile.name}</p>}
            </div>
            <label className="block text-sm text-slate-300">
              GitHub profile URL
              <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} type="url" placeholder="https://github.com/yourhandle" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400" />
            </label>
            <label className="block text-sm text-slate-300">
              Public portfolio URL
              <input value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} type="url" placeholder="https://yourportfolio.dev" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400" />
            </label>
            <p className="text-xs leading-5 text-slate-400">Provide at least one resource. The report checks public text and role-related skill evidence; it does not estimate hiring success or verify proficiency.</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">What will be analyzed</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Resume: extract readable text from your PDF or DOCX.</div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">GitHub: review public profile details and up to 20 recently updated repositories.</div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">Portfolio: review public page text when the site permits access.</div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-amber-100">This is evidence coverage, not a probability, proficiency test, or automated hiring decision.</div>
          </div>

          <button disabled={isSubmitting || (!resumeFile && !githubUrl.trim() && !portfolioUrl.trim())} onClick={handleSubmit} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
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
    queryKey: ['report'],
    queryFn: async () => {
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
        <SectionHeader eyebrow="Candidate evidence report" title="Analyze your submitted resources first" text="No resource-based report is available yet. Start with a resume, GitHub profile, or public portfolio URL." />
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
              This percentage is the share of target skills found in the analyzed text. It is not a probability, verified proficiency score, or hiring recommendation.
            </div>
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
                <div key={skill} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">
                  <span>{skill}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
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
  const { data, isLoading } = useQuery({ queryKey: ['assessment'], queryFn: () => fetchJson<any>('/api/assessment') });
  const assessment = data?.data;
  const totalSeconds = assessment?.time_limit_seconds ?? 600;
  const [timeRemaining, setTimeRemaining] = useState<number>(assessment?.time_remaining_seconds ?? 334);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!assessment) {
      return;
    }
    setTimeRemaining(assessment.time_remaining_seconds ?? totalSeconds);
  }, [assessment, totalSeconds]);

  useEffect(() => {
    if (!assessment || submitted || timeRemaining <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [assessment, submitted, timeRemaining]);

  const progress = Math.max(0, Math.min(100, ((totalSeconds - timeRemaining) / totalSeconds) * 100));

  const handleAnswerChange = (taskId: string, value: string) => {
    setAnswers((current) => ({ ...current, [taskId]: value }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    console.log('Assessment submitted', { answers, timeRemaining });
  };

  if (isLoading) {
    return <LoadingState message="Generating personalized 10-minute assessment" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Assessment workspace" title="Adaptive 10-minute assessment" text="Timed tasks are generated from role requirements, resume evidence, and verification gaps." />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm uppercase tracking-[0.2em] text-slate-400">Timer</span>
            <div className="rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1 font-semibold text-teal-200">
              {timeRemaining <= 0 ? '00:00' : `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`}
            </div>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3"><span>Role alignment</span><span className="font-semibold text-white">System design</span></div>
            <div className="flex justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3"><span>Evidence mapped</span><span className="font-semibold text-white">4 tasks</span></div>
            <div className="flex justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3"><span>Auto-submit</span><span className="font-semibold text-white">Enabled</span></div>
          </div>

          {submitted && (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Assessment submitted successfully. Recruiter review will begin once the local workflow completes.
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Question panel</h3>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">Task {assessment?.current_question_index ?? 3} / 4</span>
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
                  className="mt-4 min-h-28 w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-100 outline-none focus:border-teal-400"
                  placeholder="Draft your response here..."
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitted}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitted ? 'Submitted' : timeRemaining <= 0 ? 'Time expired' : 'Save and submit assessment'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function InterviewRoomPage() {
  const { data, isLoading } = useQuery({ queryKey: ['interview'], queryFn: () => fetchJson<any>('/api/interview') });
  const interview = data?.data;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [consent, setConsent] = useState({ camera: false, microphone: false });
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState('Camera and microphone consent required');
  const streamRef = useRef<MediaStream | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => () => {
    speechRecognitionRef.current?.stop();
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

    try {
      const response = await fetch('/api/interview/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera: true, microphone: true }),
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
    if (!cameraPreviewReady) {
      setStatus('Start your camera preview before recording an answer.');
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
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      setAnswerText(Array.from(event.results).map((result) => result[0].transcript).join(' '));
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setStatus(`Voice capture stopped: ${event.error}. You can try again.`);
    };
    recognition.onend = () => {
      setIsListening(false);
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
    const question = questions[questionIndex];
    if (!question || !answerText.trim() || isListening || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answerText.trim(), question_id: question.id }),
      });
      if (!response.ok) {
        throw new Error(`Answer submission failed: ${response.status}`);
      }
      if (questionIndex + 1 >= questions.length) {
        setCompleted(true);
        streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;
        setCameraPreviewReady(false);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setStatus('Interview complete. Local demo responses are not persisted.');
      } else {
        setQuestionIndex((current) => current + 1);
        setAnswerText('');
        setStatus('Answer submitted. Continue when ready.');
      }
    } catch {
      setStatus('Answer could not be submitted. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Preparing adaptive interview" />;
  }

  const questions = interview?.questions ?? [];
  const question = questions[questionIndex];

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
        </div>

        {!sessionStarted ? (
          <>
            <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Before you begin</p>
              <p>Take the interview alone in a quiet, well-lit space. Both camera and microphone must be enabled before questions appear.</p>
              <p>Your camera preview is shown here. Voice answers are transcribed by your browser speech service; processing may follow that provider’s settings. No typing is accepted.</p>
              <p>This local demo does not store video, audio, or transcripts. Voice answers are sent as text to the local API only.</p>
              <p>Background sounds or another person cannot be reliably identified as misconduct by this demo. Any concern must be reviewed by a person and will not automatically reject you.</p>
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
          <h3 className="text-xl font-semibold text-white">Interview responses submitted</h3>
          <p className="mt-2 text-sm text-slate-300">The local demo accepted your responses but does not persist them, detect AI-authored answers, or automatically reject candidates.</p>
          </div>
        ) : !cameraPreviewReady ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center text-slate-400">
          {sessionStarted ? 'Start the camera preview to confirm your video is live. The first question will appear after the preview starts.' : 'Complete camera and microphone consent to reveal the first question.'}
          </div>
        ) : question ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Question {questionIndex + 1} of {questions.length}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{question.question_text}</div>
              </div>
              <div className="shrink-0 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-200">{question.category}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Evidence target</span>
                <span className="font-medium text-white">{question.evidence_target}</span>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-teal-400" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
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
                  <button onClick={handleStartSpeaking} disabled={isPaused || completed} className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
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
              <button disabled={isListening || isSubmitting} onClick={() => setIsPaused((value) => !value)} className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50">
                {isPaused ? 'Resume interview' : 'Pause / technical interruption'}
              </button>
              <button disabled={!answerText.trim() || isListening || isSubmitting} onClick={handleSubmitAnswer} className="rounded-full bg-gradient-to-r from-teal-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? 'Submitting…' : questionIndex + 1 === questions.length ? 'Submit final answer' : 'Submit spoken answer'}
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
  const { data, isLoading } = useQuery({ queryKey: ['recruiter-dashboard'], queryFn: () => fetchJson<any>('/api/recruiter/dashboard') });
  const summary = data?.data;
  const [selectedCandidate, setSelectedCandidate] = useState('Maya Patel - Full-Stack Developer');

  const performance = [
    { name: 'Frontend', value: 92 },
    { name: 'API design', value: 86 },
    { name: 'SQL', value: 84 },
    { name: 'Leadership', value: 75 },
  ];

  const candidates = [
    { name: 'Maya Patel - Full-Stack Developer', score: 86, fit: 'Strong evidence', tag: 'Recommended for next step' },
    { name: 'Ari Seng - Data Analyst', score: 79, fit: 'Moderate evidence', tag: 'Needs technical verification' },
    { name: 'Nina Cole - Product Engineer', score: 68, fit: 'Partial evidence', tag: 'Requires recruiter follow-up' },
  ];

  if (isLoading) {
    return <LoadingState message="Loading pipeline evidence" />;
  }

  const selected = candidates.find((candidate) => candidate.name === selectedCandidate) ?? candidates[0];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Recruiter pipeline" title="Review candidate evidence without losing signal" text="Compare role-fit, assessment performance, and interview evidence in one review workspace." />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Candidates in review" value={summary?.candidate_count ?? 124} icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Active jobs" value={summary?.active_jobs ?? 8} icon={<BarChart3 className="h-5 w-5" />} />
        <MetricCard label="Review queue" value={summary?.jobs_to_review ?? 21} icon={<CircleDashed className="h-5 w-5" />} />
        <MetricCard label="Avg role fit" value={`${summary?.avg_role_fit ?? 76.8}`} icon={<Gauge className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">Candidate performance by competency</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="value" fill="#a78bfa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">Evidence review queue</h3>
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div key={candidate.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-200">
                <div>
                  <div className="font-medium text-white">{candidate.name}</div>
                  <div className="text-xs text-slate-400">Role-fit {candidate.score} • {candidate.fit}</div>
                </div>
                <button onClick={() => setSelectedCandidate(candidate.name)} className={`rounded-full px-3 py-1 text-xs font-medium ${selectedCandidate === candidate.name ? 'border border-teal-400/20 bg-teal-500/10 text-teal-200' : 'border border-white/10 text-white hover:bg-white/5'}`}>
                  {selectedCandidate === candidate.name ? 'Selected' : 'Open'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
        <h3 className="mb-4 text-xl font-semibold text-white">Candidate comparison</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {candidates.map((candidate) => (
            <div key={candidate.name} className={`rounded-[22px] border p-4 ${selectedCandidate === candidate.name ? 'border-teal-400/30 bg-slate-950' : 'border-white/10 bg-slate-950/40'}`}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-white">{candidate.name}</div>
                <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-xs text-violet-200">{candidate.score}/100</div>
              </div>
              <div className="mt-3 text-sm text-slate-300">{candidate.fit}</div>
              <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">{candidate.tag}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
        <h3 className="mb-2 text-xl font-semibold text-white">Selected candidate review</h3>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">{selected.name}</div>
              <div className="text-sm text-slate-400">{selected.fit}</div>
            </div>
            <div className="rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-200">{selected.score}/100</div>
          </div>
          <div className="mt-4 text-sm text-slate-300">{selected.tag}</div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin'], queryFn: () => fetchJson<any>('/api/admin/settings') });
  const [providerState, setProviderState] = useState<any[]>([]);
  const settings = data?.data;

  useEffect(() => {
    if (settings?.provider_status) {
      setProviderState(settings.provider_status);
    }
  }, [settings]);

  const toggleProvider = (providerName: string) => {
    setProviderState((current) =>
      current.map((provider) =>
        provider.provider === providerName
          ? {
              ...provider,
              status: provider.status === 'configured' ? 'pending' : 'configured',
            }
          : provider,
      ),
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading provider and policy configuration" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
      <SectionHeader eyebrow="Admin settings" title="Control AI providers, policies, and retention" text="Configurable generative AI and privacy settings for a compliant hiring workflow." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">AI provider configuration</h3>
          <div className="space-y-3">
            {(providerState.length ? providerState : settings?.provider_status ?? []).map((provider: any) => (
              <div key={provider.provider} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">{provider.provider}</div>
                    <div className="text-sm text-slate-400">Model: {provider.model}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${provider.status === 'configured' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>
                      {provider.status}
                    </span>
                    <button onClick={() => toggleProvider(provider.provider)} className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/5">
                      {provider.status === 'configured' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/75 p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">Retention and access policy</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <PolicyRow label="Resume retention" value={`${settings?.retention_policies?.resume_retention_days ?? 180} days`} />
            <PolicyRow label="Recording retention" value={`${settings?.retention_policies?.recording_retention_days ?? 90} days`} />
            <PolicyRow label="Audit log retention" value={`${settings?.retention_policies?.audit_log_days ?? 365} days`} />
            <PolicyRow label="Access control" value="RBAC enforced" />
            <PolicyRow label="Consent policy" value="Explicit opt-in required" />
          </div>
        </div>
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

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-3">
      <span>{label}</span>
      <span className="font-medium text-white">{value}</span>
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
