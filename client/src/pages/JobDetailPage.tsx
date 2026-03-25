import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, FileText, ExternalLink, Pencil,
  MapPin, DollarSign, CheckCircle2, AlertTriangle, Download,
} from 'lucide-react';
import { getJob, updateJob, updateStatusHistoryNote, getJobOutput, patchJobOutput } from '../api/jobs';
import { getJobStatuses } from '../api/jobStatuses';
import { streamCoverLetter, tailorResume } from '../api/ai';
import { JobApplication, JobStatus, FitAnalysis, JobOutput } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { useTour } from '../hooks/useTour';
import { TakeTourButton } from '../components/tour/TakeTourButton';
import { InterviewPrepPanel } from '../components/jobs/InterviewPrepPanel';
import { StatusTimeline } from '../components/jobs/StatusTimeline';
import { FitScoreDonut } from '../components/jobs/FitScoreDonut';
import { JobOutputEditor } from '../components/jobs/JobOutputEditor';
import { ExportModal } from '../components/jobs/ExportModal';
import { CoverLetterExportModal } from '../components/jobs/CoverLetterExportModal';

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
  const [notes, setNotes] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);

  // Status change note prompt state
  const [pendingHistoryId, setPendingHistoryId] = useState<string | null>(null);
  const [notePromptText, setNotePromptText] = useState('');
  const promptRef = useRef<HTMLDivElement | null>(null);

  // Resume & Cover Letter tab state
  const [jobOutput, setJobOutput] = useState<JobOutput | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [coverLetterTone, setCoverLetterTone] = useState('Professional');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [coverLetterExportOpen, setCoverLetterExportOpen] = useState(false);
  const [localCoverLetter, setLocalCoverLetter] = useState('');

  useTour('job-detail');

  useEffect(() => {
    if (id) {
      getJob(id).then((j) => {
        setJob(j);
        setNotes(j.notes ?? '');
      }).catch(() => {});
      getJobStatuses().then(setStatuses).catch(() => {});
      getJobOutput(id).then(setJobOutput).catch(() => {});
    }
  }, [id]);

  // Sync localCoverLetter when jobOutput is loaded/updated
  useEffect(() => {
    if (jobOutput?.coverLetterText) {
      setLocalCoverLetter(jobOutput.coverLetterText);
    }
  }, [jobOutput?.coverLetterText]);

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
    if (!job) return;
    setTailoring(true);
    try {
      const updated = await tailorResume(job.id);
      setJobOutput(updated);
      addToast('Resume tailored successfully!', 'success');
    } catch (e: any) {
      if (e?.response?.status === 403) {
        addToast('Tailor limit reached (3/3)', 'error');
      } else {
        addToast(e?.response?.data?.error ?? 'Tailoring failed', 'error');
      }
    } finally {
      setTailoring(false);
    }
  };

  const handleGenerateCoverLetter = () => {
    if (!job) return;
    setGeneratingCoverLetter(true);
    setLocalCoverLetter('');
    streamCoverLetter(
      job.id,
      coverLetterTone,
      (chunk) => { setLocalCoverLetter((prev) => prev + chunk); },
      async () => {
        setGeneratingCoverLetter(false);
        // Refresh jobOutput from server to get updated coverLetterText and version
        try {
          const refreshed = await getJobOutput(job.id);
          setJobOutput(refreshed);
          setLocalCoverLetter(refreshed.coverLetterText ?? '');
        } catch { /* keep local state */ }
        addToast('Cover letter generated!', 'success');
      },
      () => {
        setGeneratingCoverLetter(false);
        addToast('Cover letter generation failed', 'error');
      }
    );
  };

  const handleSaveCoverLetter = async () => {
    if (!job) return;
    try {
      const updated = await patchJobOutput(job.id, { coverLetterText: localCoverLetter });
      setJobOutput(updated);
      addToast('Cover letter saved', 'success');
    } catch {
      addToast('Failed to save cover letter', 'error');
    }
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

  if (!job) return <div className="text-center py-20 text-gray-400">Loading…</div>;

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
        <div className="space-y-6">
          {/* Resume Section */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">Resume</h2>
              {jobOutput?.resumeJson && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Version {jobOutput.resumeVersion} / 3</span>
                  <Button variant="secondary" size="sm" onClick={() => setExportModalOpen(true)}>
                    <Download size={13} /> Download
                  </Button>
                </div>
              )}
            </div>

            {!jobOutput?.resumeJson ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleTailor} loading={tailoring} disabled={!job.description}>
                    <Sparkles size={13} /> Generate Tailored Resume
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => window.open(`/api/jobs/${job.id}/resume/pdf?templateId=minimal`, '_blank')}>
                    <FileText size={13} /> Export from Profile
                  </Button>
                </div>
                {!job.description && (
                  <p className="text-xs text-amber-600">Add a job description to enable AI tailoring.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTailor}
                    loading={tailoring}
                    disabled={jobOutput.resumeVersion >= 3}
                  >
                    <Sparkles size={13} /> {jobOutput.resumeVersion >= 3 ? 'Tailor limit reached' : 'Re-tailor'}
                  </Button>
                </div>
                <JobOutputEditor
                  jobId={job.id}
                  resumeJson={jobOutput.resumeJson}
                  onSaved={(updated) => setJobOutput((o) => o ? { ...o, resumeJson: updated } : o)}
                />
              </div>
            )}
          </div>

          {/* Cover Letter Section */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">Cover Letter</h2>
              {jobOutput?.coverLetterText && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Version {jobOutput.coverLetterVersion} / 3</span>
                  <Button variant="secondary" size="sm" onClick={() => setCoverLetterExportOpen(true)}>
                    <Download size={13} /> Download
                  </Button>
                </div>
              )}
            </div>

            {!jobOutput?.coverLetterText ? (
              <div className="space-y-3">
                <Select
                  label="Tone"
                  options={['Professional', 'Conversational', 'Enthusiastic'].map((t) => ({ value: t, label: t }))}
                  value={coverLetterTone}
                  onChange={(e) => setCoverLetterTone(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={handleGenerateCoverLetter}
                  loading={generatingCoverLetter}
                  disabled={!job.description}
                >
                  <Sparkles size={13} /> Generate Cover Letter
                </Button>
                {generatingCoverLetter && localCoverLetter && (
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {localCoverLetter}
                  </pre>
                )}
                {!job.description && (
                  <p className="text-xs text-amber-600">Add a job description to generate a cover letter.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  rows={10}
                  value={localCoverLetter}
                  onChange={(e) => setLocalCoverLetter(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setLocalCoverLetter('');
                      setJobOutput((o) => o ? { ...o, coverLetterText: null } : o);
                    }}
                    disabled={jobOutput.coverLetterVersion >= 3}
                  >
                    <Sparkles size={13} /> {jobOutput.coverLetterVersion >= 3 ? 'Regen limit reached' : 'Regenerate'}
                  </Button>
                  <Button size="sm" onClick={handleSaveCoverLetter}>
                    Save Changes
                  </Button>
                </div>
              </div>
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

      <ExportModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} jobId={job.id} />
      <CoverLetterExportModal open={coverLetterExportOpen} onClose={() => setCoverLetterExportOpen(false)} jobId={job.id} />
    </div>
  );
}
