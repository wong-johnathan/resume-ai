import { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, MapPin, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FitScoreDonut } from './FitScoreDonut';
import { getSampleTitles, createSampleJob } from '../../api/ai';
import { JobApplication, FitAnalysis } from '../../types/index';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (job: JobApplication) => void;
  initialUsed: number;
}

const LIMIT = 3;

export function SampleJobModal({ open, onClose, onCreated, initialUsed }: Props) {
  const [step, setStep] = useState<'pick' | 'preview'>('pick');
  const [titles, setTitles] = useState<string[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [generationsUsed, setGenerationsUsed] = useState(initialUsed);
  const [generating, setGenerating] = useState(false);
  const [previewJob, setPreviewJob] = useState<JobApplication | null>(null);
  const [error, setError] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);

  const effectiveTitle = customTitle.trim() || selectedTitle;
  const atLimit = generationsUsed >= LIMIT;
  const remaining = LIMIT - generationsUsed;

  // Reset and load titles on open
  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setSelectedTitle('');
    setCustomTitle('');
    setPreviewJob(null);
    setError('');
    setDescExpanded(false);
    setAlreadyGenerated(false);
    setGenerationsUsed(initialUsed);

    setLoadingTitles(true);
    getSampleTitles()
      .then((data) => {
        setTitles(data.titles);
        setGenerationsUsed(data.generationsUsed);
      })
      .catch(() => {
        // non-fatal — user can still type a custom title
      })
      .finally(() => setLoadingTitles(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!effectiveTitle || atLimit || alreadyGenerated) return;
    setGenerating(true);
    setError('');
    try {
      const data = await createSampleJob(effectiveTitle);
      setPreviewJob(data.job);
      setGenerationsUsed(data.generationsUsed);
      setAlreadyGenerated(true);
      setStep('preview');
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Generation failed. Please try again.';
      if (e?.response?.status === 403) {
        setGenerationsUsed(LIMIT);
      }
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenJob = () => {
    if (!previewJob) return;
    onCreated(previewJob);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Sample Job" size="xl">
      {/* ── Step 1: Pick a title ── */}
      {step === 'pick' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              AI generates a realistic job posting tailored to your profile.
            </p>
            <span className={`text-xs font-medium ${remaining <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {remaining} / {LIMIT} remaining
            </span>
          </div>

          {atLimit ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              You've used all {LIMIT} sample job generations.
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {loadingTitles
                    ? 'Generating suggestions from your profile…'
                    : 'Suggested titles — least → most compatible with your profile'}
                </p>
                {loadingTitles ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 w-28 bg-gray-100 rounded-full animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {titles.map((title, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedTitle(title); setCustomTitle(''); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selectedTitle === title && !customTitle
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {i === 0 && <span className="mr-1 opacity-50">↓</span>}
                        {i === titles.length - 1 && <span className="mr-1 opacity-60">★</span>}
                        {title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Or enter your own title</p>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => { setCustomTitle(e.target.value); setSelectedTitle(''); }}
                  placeholder="e.g. Senior Product Manager"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  {error}
                </p>
              )}

              {alreadyGenerated && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                  Already generated — open the job below ↓
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                {alreadyGenerated ? (
                  <Button onClick={() => setStep('preview')}>
                    View Preview →
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={!effectiveTitle}
                  >
                    <Sparkles size={14} /> Generate Sample →
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && previewJob && (() => {
        const fa = previewJob.fitAnalysis as FitAnalysis | null;
        return (
          <div className="space-y-4">
            {/* Job header */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">
                  Example Job
                </p>
                <h3 className="font-semibold text-gray-900">{previewJob.jobTitle}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 size={11} /> {previewJob.company}
                  </span>
                  {previewJob.location && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={11} /> {previewJob.location}
                    </span>
                  )}
                </div>
              </div>
              {fa && <FitScoreDonut score={fa.score} />}
            </div>

            {/* AI summary */}
            {fa?.summary && (
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">
                  ✦ AI Summary
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{fa.summary}</p>
              </div>
            )}

            {/* Job description */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Job Description</p>
              <pre
                className={`text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed overflow-hidden border rounded-lg p-3 bg-white ${
                  descExpanded ? '' : 'line-clamp-5'
                }`}
              >
                {previewJob.description}
              </pre>
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-1 text-xs text-blue-500 hover:underline"
              >
                {descExpanded ? 'Show less ↑' : 'Show full description ↓'}
              </button>
            </div>

            {/* Generation notice */}
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              This generation has been used. {generationsUsed} / {LIMIT} used.
            </p>

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep('pick')}>
                <ArrowLeft size={14} /> Back
              </Button>
              <Button onClick={handleOpenJob}>
                Open Job →
              </Button>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}
