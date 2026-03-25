import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Sparkles, FileText, ChevronRight, ChevronLeft, Loader2, Settings, Trash2, GripVertical, X, ExternalLink, Info } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { getJobs, createJob, updateJob, deleteJob } from '../api/jobs';
import { getJobStatuses, createJobStatus, deleteJobStatus, reorderJobStatuses } from '../api/jobStatuses';
import { tailorResume, streamCoverLetter, analyzeFit, getSampleJobStatus } from '../api/ai';
import { SampleJobModal } from '../components/jobs/SampleJobModal';
import { JobApplication, JobStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { useAppStore } from '../store/useAppStore';
import { useForm } from 'react-hook-form';
import { useTour } from '../hooks/useTour';
import { TakeTourButton } from '../components/tour/TakeTourButton';

type JobDetailsForm = {
  company: string;
  jobTitle: string;
  jobUrl?: string;
  description?: string;
  status: string;
  salary?: string;
  location?: string;
};

const STEPS = ['Job Details', 'AI Enhancement'] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 ${i < current ? 'text-blue-600' : i === current ? 'text-gray-900' : 'text-gray-400'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${i < current ? 'bg-blue-600 border-blue-600 text-white' : i === current ? 'border-gray-900 text-gray-900' : 'border-gray-300 text-gray-400'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < current ? 'bg-blue-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

function StatusDot({ color }: { color: string }) {
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

// Drag-to-reorder list for statuses
const DEFAULT_STATUS_LABELS = new Set(['SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN']);

function ManageStatusesModal({
  open,
  onClose,
  statuses,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  statuses: JobStatus[];
  onSave: (updated: JobStatus[]) => void;
}) {
  const [list, setList] = useState<JobStatus[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { addToast } = useAppStore();
  const dragIdx = useRef<number | null>(null);

  useEffect(() => { setList([...statuses]); }, [statuses, open]);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    setError('');
    try {
      const created = await createJobStatus({ label, color: newColor });
      const updated = [...list, created];
      setList(updated);
      onSave(updated);
      setNewLabel('');
      setNewColor('#6b7280');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to add status');
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteJobStatus(id);
      const updated = list.filter((s) => s.id !== id);
      setList(updated);
      onSave(updated);
    } catch (e: any) {
      addToast(e?.response?.data?.error ?? 'Failed to delete status', 'error');
    } finally { setDeletingId(null); }
  };

  const handleDragStart = (i: number) => { dragIdx.current = i; };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const reordered = [...list];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(i, 0, moved);
    dragIdx.current = i;
    setList(reordered);
  };
  const handleDrop = async () => {
    if (dragIdx.current === null) return;
    dragIdx.current = null;
    setSaving(true);
    try {
      const updated = await reorderJobStatuses(list.map((s) => s.id));
      setList(updated);
      onSave(updated);
    } catch { addToast('Failed to save order', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Statuses">
      <div className="space-y-1 mb-4">
        {list.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={handleDrop}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing group"
          >
            <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
            <span className="w-5 h-5 rounded-full border flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="flex-1 text-sm text-gray-800">{s.label}</span>
            {DEFAULT_STATUS_LABELS.has(s.label) ? (
              <span className="w-[14px] flex-shrink-0" />
            ) : (
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No statuses yet.</p>}
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Add new status</p>
        <div className="flex gap-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
          />
          <input
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Status name…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button onClick={handleAdd} loading={adding} disabled={!newLabel.trim()}>
            <Plus size={14} /> Add
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {saving && <p className="text-xs text-gray-400 mt-2">Saving order…</p>}
    </Modal>
  );
}

export function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [sampleUsed, setSampleUsed] = useState(0);
  const [sampleLimit, setSampleLimit] = useState(3);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const { addToast } = useAppStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const { register, handleSubmit, reset, watch, setValue } = useForm<JobDetailsForm>({ defaultValues: { status: 'SAVED' } });
  const [jobDetails, setJobDetails] = useState<JobDetailsForm | null>(null);
  const [aiTailor, setAiTailor] = useState(false);
  const [aiCoverLetter, setAiCoverLetter] = useState(false);
  const [coverLetterTone, setCoverLetterTone] = useState('Professional');
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const abortRef = useRef<(() => void) | null>(null);

  const { activeTourId, completeTour } = useTour('jobs-list');

  // When the Add Job modal opens while the tour is active, complete the tour
  useEffect(() => {
    if (addOpen && activeTourId === 'jobs-list') {
      completeTour();
    }
  }, [addOpen, activeTourId, completeTour]);

  useEffect(() => {
    Promise.all([
      getJobs(),
      getJobStatuses(),
      getSampleJobStatus().catch(() => null),
    ]).then(([j, s, sample]) => {
      setJobs(j);
      setStatuses(s);
      if (sample) {
        setSampleUsed(sample.generationsUsed);
        setSampleLimit(sample.generationsLimit);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusMap = Object.fromEntries(statuses.map((s) => [s.label, s]));

  const openAdd = () => {
    setStep(0);
    reset({ status: statuses[0]?.label ?? 'SAVED' });
    setJobDetails(null);
    setAiTailor(false);
    setAiCoverLetter(false);
    setCoverLetterTone('Professional');
    setProcessing(false);
    setAddOpen(true);
  };

  const onStep1Submit = (data: JobDetailsForm) => {
    setJobDetails(data);
    setStep(1);
  };

  const streamToString = (jobId: string, tone: string): Promise<string> =>
    new Promise((resolve, reject) => {
      let text = '';
      const abort = streamCoverLetter(jobId, tone, (chunk) => { text += chunk; }, () => {
        resolve(text);
      }, reject);
      abortRef.current = abort;
    });

  const onSave = async (useAi: boolean) => {
    if (!jobDetails) return;
    setProcessing(true);
    let job: any;
    try {
      setProcessingLabel('Creating job application…');
      job = await createJob({ ...jobDetails } as any);
    } catch (e: any) {
      addToast(e?.response?.data?.error ?? 'Something went wrong', 'error');
      setProcessing(false);
      setProcessingLabel('');
      return;
    }

    const hasDescription = (jobDetails.description?.trim().length ?? 0) >= 50;

    if (useAi && aiTailor && hasDescription) {
      setProcessingLabel('Tailoring resume with AI…');
      try {
        await tailorResume(job.id);
      } catch (e: any) {
        addToast(e?.response?.data?.error ?? 'AI tailoring failed — you can retry from the job page.', 'error');
      }
    }

    if (useAi && aiCoverLetter && hasDescription) {
      setProcessingLabel('Generating cover letter with AI…');
      try {
        await streamToString(job.id, coverLetterTone);
        // Cover letter is saved server-side — no need to updateJob
      } catch (e: any) {
        addToast(e?.response?.data?.error ?? 'Cover letter generation failed — you can retry from the job page.', 'error');
      }
    }

    if (hasDescription) {
      setProcessingLabel('Analysing your fit…');
      try {
        const fit = await analyzeFit(jobDetails.description!);
        await updateJob(job.id, { fitAnalysis: fit } as any);
      } catch {
        // non-fatal — job is already created, proceed to detail page
      }
    }

    setProcessing(false);
    setProcessingLabel('');
    navigate(`/jobs/${job.id}`);
  };

  const handleStatusChange = async (job: JobApplication, newStatus: string) => {
    try {
      const updated = await updateJob(job.id, { status: newStatus });
      setJobs((j) => j.map((x) => x.id === job.id ? updated : x));
    } catch { addToast('Failed to update status', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job?')) return;
    await deleteJob(id);
    setJobs((j) => j.filter((x) => x.id !== id));
    addToast('Deleted', 'info');
  };

  const liveDescription = watch('description') ?? '';
  const hasEnoughDescription = (jobDetails?.description?.trim().length ?? liveDescription.trim().length) >= 50;

  const filtered = jobs.filter((j) => {
    const matchesStatus = !filterStatus || j.status === filterStatus;
    const q = search.toLowerCase();
    const matchesSearch = !q || j.jobTitle.toLowerCase().includes(q) || j.company.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
        <div className="flex gap-2 flex-shrink-0">
          <TakeTourButton tourId="jobs-list" />
          <Button variant="secondary" onClick={() => setManageOpen(true)}>
            <Settings size={15} /> <span className="hidden sm:inline">Statuses</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSampleOpen(true)}
            disabled={sampleUsed >= sampleLimit}
            title={sampleUsed >= sampleLimit ? 'Sample job limit reached' : undefined}
          >
            <Sparkles size={15} />
            <span className="hidden sm:inline">Try Sample</span>
            <span className="text-xs text-gray-400 ml-1">{sampleLimit - sampleUsed}/{sampleLimit}</span>
          </Button>
          <Button onClick={openAdd} data-tour="add-job-btn"><Plus size={16} /> <span className="hidden sm:inline">Add Job</span></Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search jobs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.label}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Job List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Role / Company</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Status updated</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Location</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Attachments</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Added</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Last updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3.5 w-24" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3.5 w-16" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">{jobs.length === 0 ? 'No jobs tracked yet.' : 'No jobs match your filters.'}</p>
            {jobs.length === 0 && (
              <Button className="mt-4" onClick={openAdd}><Plus size={15} /> Add your first job</Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Role / Company</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Status updated</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Location</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Attachments</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Added</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Last updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((job) => {
                const s = statusMap[job.status];
                return (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/jobs/${job.id}`} className="block">
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600">{job.jobTitle}</p>
                        <p className="text-xs text-gray-500">{job.company}</p>
                      </Link>
                      {job.jobUrl && (
                        <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:underline mt-0.5">
                          <ExternalLink size={10} /> Job posting
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusDot color={s?.color ?? '#6b7280'} />
                        <select
                          value={job.status}
                          onChange={(e) => handleStatusChange(job, e.target.value)}
                          className="text-xs border-0 bg-transparent focus:outline-none focus:ring-0 text-gray-700 cursor-pointer pr-4"
                        >
                          {statuses.map((st) => (
                            <option key={st.id} value={st.label}>{st.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">
                        {job.statusUpdatedAt ? new Date(job.statusUpdatedAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-500">{job.location ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-300">—</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-400">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">
                        {new Date(job.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Status summary pills */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {statuses.map((s) => {
            const count = jobs.filter((j) => j.status === s.label).length;
            if (count === 0) return null;
            return (
              <button
                key={s.id}
                onClick={() => setFilterStatus(filterStatus === s.label ? '' : s.label)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === s.label ? 'border-gray-400 bg-gray-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <StatusDot color={s.color} />
                {s.label} <span className="text-gray-400">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Manage Statuses Modal */}
      <ManageStatusesModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        statuses={statuses}
        onSave={setStatuses}
      />

      {/* Sample Job Modal */}
      <SampleJobModal
        open={sampleOpen}
        onClose={() => setSampleOpen(false)}
        onCreated={(job) => { setSampleUsed((n) => n + 1); navigate(`/jobs/${job.id}`); }}
        initialUsed={sampleUsed}
      />

      {/* Add Job Modal */}
      <Modal open={addOpen} onClose={() => { if (!processing) { abortRef.current?.(); setAddOpen(false); } }} title="Add Job Application" size="xl">
        {processing ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={36} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium text-gray-700">{processingLabel}</p>
            <p className="text-xs text-gray-400">This may take a moment…</p>
          </div>
        ) : (
          <>
            <StepIndicator current={step} />

            {/* Step 1: Job Details */}
            {step === 0 && (
              <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
                {/* URL row */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job URL</label>
                  <input
                    {...register('jobUrl')}
                    placeholder="https://…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Paste the link to the job posting for your own reference.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Job Title *" {...register('jobTitle', { required: true })} />
                  <Input label="Company *" {...register('company', { required: true })} />
                  <Input label="Location" {...register('location')} />
                  <Input label="Salary / Range" {...register('salary')} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center gap-2">
                      <StatusDot color={statusMap[watch('status')]?.color ?? '#6b7280'} />
                      <select
                        {...register('status')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {statuses.map((s) => <option key={s.id} value={s.label}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-sm font-medium text-gray-700">Job Description</label>
                    <div className="group relative flex items-center">
                      <Info size={14} className="text-gray-400 cursor-pointer" />
                      <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-72 rounded-lg bg-gray-800 text-white text-xs p-3 shadow-lg">
                        Copy and paste the <strong>full job description</strong> directly from the job posting website. Include responsibilities, requirements, and any other details listed.
                        <div className="mt-1.5 text-yellow-300 font-medium">Required to use AI resume tailoring and compatibility analysis.</div>
                      </div>
                    </div>
                  </div>
                  <Textarea
                    rows={7}
                    {...register('description')}
                    placeholder="Copy and paste the full job description from the job posting website…"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    <span className="font-medium text-gray-500">Tip:</span> Paste the complete job description as written on the website — this is <span className="font-medium text-gray-600">required</span> for AI resume tailoring and compatibility analysis.
                  </p>
                  {liveDescription.trim().length > 0 && liveDescription.trim().length < 50 && (
                    <p className="text-xs text-amber-600 mt-0.5">Add at least 50 characters to unlock AI features ({50 - liveDescription.trim().length} more needed)</p>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit">Next <ChevronRight size={15} /></Button>
                </div>
              </form>
            )}

            {/* Step 2: AI Enhancement */}
            {step === 1 && (
              <div className="space-y-4">
                {!hasEnoughDescription ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                    No job description was provided — AI enhancement is unavailable. You can still save your application as-is.
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      Optionally let AI enhance your application. You can always do this later from the job detail page.
                    </p>

                    <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${aiTailor ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="checkbox"
                        checked={aiTailor}
                        onChange={(e) => setAiTailor(e.target.checked)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                          <FileText size={15} className="text-blue-600" /> Tailor resume to this job
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          AI will build and tailor a resume from your profile to match this job's keywords.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${aiCoverLetter ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="checkbox"
                        checked={aiCoverLetter}
                        onChange={(e) => setAiCoverLetter(e.target.checked)}
                        className="mt-0.5 accent-purple-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                          <Sparkles size={15} className="text-purple-600" /> Generate cover letter with AI
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          AI will write a personalized cover letter based on your profile and this job description.
                        </p>
                        {aiCoverLetter && (
                          <div className="mt-3">
                            <Select
                              label="Tone"
                              options={['Professional', 'Conversational', 'Enthusiastic'].map((t) => ({ value: t, label: t }))}
                              value={coverLetterTone}
                              onChange={(e) => setCoverLetterTone(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </label>

                    <p className="text-xs text-gray-400 mt-2 p-3 bg-gray-50 rounded-lg border">This will not modify your profile. All enhancements are editable within the job.</p>
                  </>
                )}

                <div className="flex justify-between gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setStep(0)}><ChevronLeft size={15} /> Back</Button>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => onSave(false)}>Save Without AI</Button>
                    {hasEnoughDescription && (aiTailor || aiCoverLetter) && (
                      <Button onClick={() => onSave(true)}>
                        <Sparkles size={15} /> Apply AI &amp; Save
                      </Button>
                    )}
                    {(!hasEnoughDescription || (!aiTailor && !aiCoverLetter)) && (
                      <Button onClick={() => onSave(false)}>Save</Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
