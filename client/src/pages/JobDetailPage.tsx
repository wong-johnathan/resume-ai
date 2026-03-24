import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, FileText, ExternalLink, Pencil,
  MapPin, DollarSign, Copy, History, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Eye,
} from 'lucide-react';
import { getJob, updateJob, updateStatusHistoryNote } from '../api/jobs';
import { getJobStatuses } from '../api/jobStatuses';
import { streamCoverLetter, tailorResume } from '../api/ai';
import { JobApplication, JobStatus, FitAnalysis } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { TEMPLATE_OPTIONS } from '../api/templates';
import { useTour } from '../hooks/useTour';
import { TakeTourButton } from '../components/tour/TakeTourButton';
import { InterviewPrepPanel } from '../components/jobs/InterviewPrepPanel';
import { StatusTimeline } from '../components/jobs/StatusTimeline';
import { FitScoreDonut } from '../components/jobs/FitScoreDonut';

const AI_AMENDMENT_LIMIT = 3;

const TABS = [
  { id: 'info',   label: 'Job Info & Fit' },
  { id: 'resume', label: 'Resume & Cover Letter' },
  { id: 'prep',   label: 'Interview Prep' },
  { id: 'notes',  label: 'Notes & Timeline' },
] as const;
type TabId = typeof TABS[number]['id'];

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useAppStore();

  const validTabIds = TABS.map((t) => t.id);
  const rawTab = searchParams.get('tab') ?? 'info';
  const activeTab = (validTabIds.includes(rawTab as TabId) ? rawTab : 'info') as TabId;
  const setTab = (tab: TabId) => navigate(`?tab=${tab}`, { replace: true });

  const [job, setJob] = useState<JobApplication | null>(null);
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<JobApplication>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [coverLetterPreviewOpen, setCoverLetterPreviewOpen] = useState(false);
  const [coverLetterPreviewText, setCoverLetterPreviewText] = useState<string | null>(null);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [tone, setTone] = useState('Professional');
  const [coverLetter, setCoverLetter] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailorSourceId, setTailorSourceId] = useState('');
  const [notes, setNotes] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  // Status change note prompt state
  const [pendingHistoryId, setPendingHistoryId] = useState<string | null>(null);
  const [notePromptText, setNotePromptText] = useState('');
  const promptRef = useRef<HTMLDivElement | null>(null);

  useTour('job-detail');

  useEffect(() => {
    if (id) {
      getJob(id).then((j) => {
        setJob(j);
        setNotes(j.notes ?? '');
        const t = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        setCoverLetter((j.coverLetter ?? '').replace(/\[date\]/gi, t));
      }).catch(() => {});
      getJobStatuses().then(setStatuses).catch(() => {});
    }
  }, [id]);

  // Click-outside dismissal for note prompt
  useEffect(() => {
    if (!pendingHistoryId) return;
    const handler = (e: MouseEvent) => {
      if (promptRef.current && !promptRef.current.contains(e.target as Node)) {
        setPendingHistoryId(null);
        setNotePromptText('');
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [pendingHistoryId]);

  const handleStatusChange = async (status: string) => {
    if (!job) return;
    const updated = await updateJob(job.id, { status });
    setJob(updated);
    addToast('Status updated', 'success');
    // Show note prompt for the newest history entry
    const newest = updated.statusHistory?.[0];
    if (newest) {
      setPendingHistoryId(newest.id);
      setNotePromptText('');
    }
  };

  const handleSavePromptNote = async () => {
    if (!job || !pendingHistoryId || !notePromptText.trim()) {
      setPendingHistoryId(null);
      setNotePromptText('');
      return;
    }
    try {
      const updated = await updateStatusHistoryNote(job.id, pendingHistoryId, notePromptText.trim());
      setJob((j) => j ? {
        ...j,
        statusHistory: j.statusHistory?.map((e) => e.id === pendingHistoryId ? { ...e, note: updated.note } : e),
      } : j);
    } catch {
      addToast('Failed to save note', 'error');
    } finally {
      setPendingHistoryId(null);
      setNotePromptText('');
    }
  };

  const handleTailor = async () => {
    if (!job || !tailorSourceId || !job.description) return;
    setTailoring(true);
    try {
      await tailorResume(tailorSourceId, job.description, job.id);
      const updated = await getJob(job.id);
      setJob(updated);
      setTailorSourceId('');
      addToast('Resume tailored and linked to this job!', 'success');
    } catch (e: any) {
      addToast(e?.response?.data?.error ?? 'Tailoring failed', 'error');
    } finally { setTailoring(false); }
  };

  const handleSaveNotes = async () => {
    if (!job) return;
    await updateJob(job.id, { notes });
    addToast('Notes saved', 'success');
  };

  const openEdit = () => {
    if (!job) return;
    setEditForm({
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location ?? '',
      salary: job.salary ?? '',
      jobUrl: job.jobUrl ?? '',
      description: job.description ?? '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!job) return;
    setEditSaving(true);
    try {
      const updated = await updateJob(job.id, {
        jobTitle: editForm.jobTitle,
        company: editForm.company,
        location: editForm.location || undefined,
        salary: editForm.salary || undefined,
        jobUrl: editForm.jobUrl || undefined,
        description: editForm.description || undefined,
      });
      setJob(updated);
      setEditOpen(false);
      addToast('Job updated', 'success');
    } catch { addToast('Failed to update job', 'error'); }
    finally { setEditSaving(false); }
  };

  const handleGenerateCoverLetter = () => {
    if (!job?.description) return addToast('Add a job description first', 'info');
    setCoverLetter('');
    setStreaming(true);
    let generated = '';
    const abort = streamCoverLetter(
      job.description,
      tone,
      (chunk) => { generated += chunk; setCoverLetter((prev) => prev + chunk); },
      async () => {
        setStreaming(false);
        const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        generated = generated.replace(/\[date\]/gi, today);
        setCoverLetter(generated);
        try {
          await updateJob(job.id, { coverLetter: generated });
          const refreshed = await getJob(job.id);
          setJob(refreshed);
          addToast('Cover letter saved', 'success');
        } catch { addToast('Failed to save cover letter', 'error'); }
      },
      () => { setStreaming(false); addToast('Cover letter generation failed', 'error'); },
      job.id
    );
    abortRef.current = abort;
  };

  if (!job) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const displayCoverLetter = job.coverLetter?.replace(/\[date\]/gi, today) ?? null;
  const amendmentCount = job.aiAmendments?.length ?? 0;
  const amendmentLimitReached = amendmentCount >= AI_AMENDMENT_LIMIT;

  return (
    <div className="max-w-3xl">
      {/* ── Header ── */}
      <div className="flex items-start gap-3 mb-4">
        <Link to="/jobs" className="text-gray-400 hover:text-gray-600 mt-1"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{job.jobTitle}</h1>
          <p className="text-gray-600 text-sm font-medium">{job.company}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {job.location && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={11} /> {job.location}
              </span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <DollarSign size={11} /> {job.salary}
              </span>
            )}
            {job.jobUrl && (
              <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <ExternalLink size={11} /> View posting
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TakeTourButton tourId="job-detail" />
          <Button variant="secondary" size="sm" onClick={openEdit}>
            <Pencil size={14} /> Edit
          </Button>
        </div>
      </div>

      {/* ── Status row (below title, above tabs) ── */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Status</span>
          <div className="w-48" data-tour="status-select">
            <Select
              options={statuses.map((s) => ({ value: s.label, label: s.label }))}
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            />
          </div>
        </div>
        {/* Note prompt (appears after status change) */}
        {pendingHistoryId && (
          <div ref={promptRef} className="mt-2 ml-[72px] p-3 bg-blue-50 border border-blue-100 rounded-xl max-w-sm">
            <p className="text-xs font-medium text-blue-800 mb-2">Add a note about this change?</p>
            <Textarea
              rows={2}
              value={notePromptText}
              onChange={(e) => setNotePromptText(e.target.value)}
              placeholder="e.g. Reached out to recruiter…"
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setPendingHistoryId(null); setNotePromptText(''); }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSavePromptNote(); }
              }}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleSavePromptNote} disabled={!notePromptText.trim()}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => { setPendingHistoryId(null); setNotePromptText(''); }}>Skip</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0" data-tour="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
              onClick={() => setTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab content ── */}

      {/* Job Info & Fit */}
      {activeTab === 'info' && (
        <div className="space-y-4">

          {job.fitAnalysis && (() => {
            const fa = job.fitAnalysis as FitAnalysis;
            return (
              <>
                {/* Row 1: Match score + AI summary */}
                <div className="grid grid-cols-[1fr_1.6fr] gap-4">
                  <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-center">
                    <FitScoreDonut score={fa.score} />
                  </div>
                  <div className="bg-white rounded-xl border shadow-sm p-5">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">✦ AI Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{fa.summary}</p>
                  </div>
                </div>

                {/* Row 2: Role Breakdown */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">Role Breakdown</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <CheckCircle2 size={13} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Key Strengths</span>
                      </div>
                      <ul className="space-y-2">
                        {fa.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <span className="flex-shrink-0 mt-0.5 text-green-500">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <AlertTriangle size={13} className="text-red-500" />
                        <span className="text-xs font-semibold text-red-600">Missing & Weak Points</span>
                      </div>
                      <ul className="space-y-2">
                        {fa.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                            <span className="flex-shrink-0 mt-0.5 text-red-400">•</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Row 3: Job Description */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Job Description</h2>
            {job.description ? (
              <>
                <pre
                  className={`text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed overflow-hidden ${
                    descExpanded ? '' : 'line-clamp-5'
                  }`}
                >
                  {job.description}
                </pre>
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-xs text-blue-500 hover:underline"
                >
                  {descExpanded ? 'Show less ↑' : 'Show full description ↓'}
                </button>
              </>
            ) : (
              <p className="text-xs text-gray-400">
                No description added.{' '}
                <button onClick={openEdit} className="text-blue-500 hover:underline">Add one</button>
              </p>
            )}
          </div>

        </div>
      )}

      {/* Resume & Cover Letter */}
      {activeTab === 'resume' && (
        <div className="space-y-4">
          {/* Resume panel */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Resume</h2>

            {job.resume?.tailoredFor && (
              <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-purple-50 border border-purple-100">
                <Sparkles size={13} className="text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">AI Tailored</span>
                  <p className="text-sm text-gray-800 font-medium truncate">{job.resume.title}</p>
                  <Link to={`/resumes/${job.resume.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
                    <FileText size={11} /> View resume
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <Sparkles size={10} /> AI amendments
              </span>
              <span className={`text-[10px] font-semibold ${amendmentLimitReached ? 'text-red-500' : amendmentCount === AI_AMENDMENT_LIMIT - 1 ? 'text-amber-500' : 'text-gray-500'}`}>
                {amendmentCount} / {AI_AMENDMENT_LIMIT}
              </span>
            </div>

            {job.description && (
              <div className="mt-2">
                {amendmentLimitReached ? (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2.5 border border-red-100">
                    AI amendment limit reached for this job.
                  </p>
                ) : (
                  <>
                    <Select
                      label={job.resume?.tailoredFor ? 'Re-tailor using template:' : 'Tailor resume for this job:'}
                      options={[{ value: '', label: '— Pick a template —' }, ...TEMPLATE_OPTIONS]}
                      value={tailorSourceId}
                      onChange={(e) => setTailorSourceId(e.target.value)}
                    />
                    <Button size="sm" className="mt-2 w-full" onClick={handleTailor} loading={tailoring} disabled={!tailorSourceId}>
                      <Sparkles size={13} />
                      {job.resume?.tailoredFor ? 'Re-tailor with AI' : 'Tailor with AI'}
                    </Button>
                    <p className="text-[10px] text-gray-400 mt-1">Creates a tailored copy from your profile data.</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Amendment history */}
          {(job.aiAmendments?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setHistoryOpen((o) => !o)}
              >
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                  <History size={14} className="text-gray-400" /> AI Amendment History
                  <span className="ml-1 text-[10px] font-normal text-gray-400">({job.aiAmendments!.length}/{AI_AMENDMENT_LIMIT})</span>
                </h2>
                {historyOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </button>
              {historyOpen && (
                <div className="mt-3 space-y-2">
                  {job.aiAmendments!.map((amendment, i) => (
                    <div key={amendment.id} className="rounded-lg border bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${amendment.type === 'RESUME_TAILOR' ? 'text-purple-600' : 'text-blue-600'}`}>
                          <Sparkles size={10} />
                          {amendment.type === 'RESUME_TAILOR' ? 'Resume Tailored' : 'Cover Letter'}
                          <span className="ml-1 font-normal text-gray-400">#{job.aiAmendments!.length - i}</span>
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(amendment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {amendment.type === 'RESUME_TAILOR' && amendment.resumeId && (
                        <Link to={`/resumes/${amendment.resumeId}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <FileText size={11} /> View tailored resume
                        </Link>
                      )}
                      {amendment.type === 'COVER_LETTER' && amendment.coverLetterText && (
                        <button
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => { setCoverLetterPreviewText((amendment.coverLetterText ?? '').replace(/\[date\]/gi, today)); setCoverLetterPreviewOpen(true); }}
                        >
                          View cover letter
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cover letter */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-semibold text-gray-900 text-sm shrink-0">Cover Letter</h2>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {displayCoverLetter && (
                  <>
                    <button title="Preview" onClick={() => { setCoverLetterPreviewText(displayCoverLetter); setCoverLetterPreviewOpen(true); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700">
                      <Eye size={14} />
                    </button>
                    <button title="Copy" onClick={() => { navigator.clipboard.writeText(displayCoverLetter); addToast('Cover letter copied!', 'success'); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700">
                      <Copy size={14} />
                    </button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmRegenOpen(true)} disabled={amendmentLimitReached} loading={streaming}>
                      <Sparkles size={14} /> Regenerate
                    </Button>
                  </>
                )}
                {!displayCoverLetter && (
                  <Button variant="secondary" size="sm" onClick={() => setCoverLetterOpen(true)} disabled={amendmentLimitReached}>
                    <Sparkles size={14} /> Generate
                  </Button>
                )}
              </div>
            </div>
            {displayCoverLetter ? (
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">{displayCoverLetter}</pre>
            ) : (
              <p className="text-xs text-gray-400">No cover letter yet. Generate one with AI or write your own.</p>
            )}
          </div>
        </div>
      )}

      {/* Interview Prep */}
      {activeTab === 'prep' && (
        <InterviewPrepPanel jobId={job.id} hasDescription={!!job.description} />
      )}

      {/* Notes & Timeline */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">Overall Notes</h2>
              <Button size="sm" variant="secondary" onClick={handleSaveNotes}>Save</Button>
            </div>
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interview notes, contact info, follow-up reminders…" />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Status History</h2>
            <StatusTimeline
              jobId={job.id}
              entries={job.statusHistory ?? []}
              onEntriesChange={(entries) => setJob((j) => j ? { ...j, statusHistory: entries } : j)}
            />
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Job" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Job Title *" value={editForm.jobTitle ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))} />
            <Input label="Company *" value={editForm.company ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} />
            <Input label="Location" value={editForm.location ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
            <Input label="Salary / Range" value={editForm.salary ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, salary: e.target.value }))} />
          </div>
          <Input label="Job URL" value={editForm.jobUrl ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, jobUrl: e.target.value }))} placeholder="https://…" />
          <Textarea label="Job Description" rows={8} value={editForm.description ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} loading={editSaving} disabled={!editForm.jobTitle?.trim() || !editForm.company?.trim()}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <Modal open={coverLetterPreviewOpen} onClose={() => setCoverLetterPreviewOpen(false)} title="Cover Letter Preview" size="xl">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-[70vh] overflow-y-auto">{coverLetterPreviewText}</pre>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(coverLetterPreviewText!); addToast('Cover letter copied!', 'success'); }}>
            <Copy size={14} /> Copy
          </Button>
          <Button variant="secondary" onClick={() => setCoverLetterPreviewOpen(false)}>Close</Button>
        </div>
      </Modal>

      <Modal open={confirmRegenOpen} onClose={() => setConfirmRegenOpen(false)} title="Regenerate Cover Letter">
        <p className="text-sm text-gray-600 mb-5">This will replace your current cover letter. Are you sure?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmRegenOpen(false)}>Cancel</Button>
          <Button onClick={() => { setConfirmRegenOpen(false); handleGenerateCoverLetter(); }}>
            <Sparkles size={14} /> Regenerate
          </Button>
        </div>
      </Modal>

      <Modal open={coverLetterOpen} onClose={() => { abortRef.current?.(); setCoverLetterOpen(false); }} title="Cover Letter" size="xl">
        <div className="space-y-4">
          <Select
            label="Tone"
            options={['Professional', 'Conversational', 'Enthusiastic'].map((t) => ({ value: t, label: t }))}
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
          <Button onClick={handleGenerateCoverLetter} loading={streaming} disabled={!job.description || amendmentLimitReached}>
            <Sparkles size={16} /> {coverLetter ? 'Regenerate' : 'Generate'} with AI
          </Button>
          {amendmentLimitReached && <p className="text-xs text-red-500">AI amendment limit reached for this job.</p>}
          <Textarea label="Cover Letter" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={20} placeholder="Write or generate a cover letter…" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCoverLetterOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const updated = await updateJob(job.id, { coverLetter: coverLetter || null });
              setJob(updated);
              setCoverLetterOpen(false);
              addToast('Cover letter saved', 'success');
            }} disabled={streaming}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
