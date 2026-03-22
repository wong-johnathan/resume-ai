import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, FileText, RefreshCw, Pencil } from 'lucide-react';
import { getResume, getPdfUrl, getPreviewUrl, updateResume } from '../api/resumes';
import { Resume } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useAppStore } from '../store/useAppStore';
import { TailorChangesPanel } from '../components/resume/TailorChangesPanel';

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useAppStore();
  const [resume, setResume] = useState<Resume | null>(null);
  const [status, setStatus] = useState<Resume['status']>('DRAFT');
  const [previewKey, setPreviewKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'preview' | 'changes'>('preview');

  const [previewScale, setPreviewScale] = useState(() =>
    window.innerWidth < 768 ? Math.min(1, (window.innerWidth - 16) / 794) : 1
  );
  useEffect(() => {
    const update = () =>
      setPreviewScale(window.innerWidth < 768 ? Math.min(1, (window.innerWidth - 16) / 794) : 1);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (id) getResume(id).then((r) => { setResume(r); setStatus(r.status); }).catch(() => {});
  }, [id]);

  const handleStatusChange = async (newStatus: Resume['status']) => {
    if (!resume) return;
    setStatus(newStatus);
    await updateResume(resume.id, { status: newStatus });
    addToast('Status updated', 'success');
  };

  if (!resume) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-white border-b shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Link to={resume.tailoredFor && resume.tailoredFor !== 'job' ? `/jobs/${resume.tailoredFor}` : '/jobs'} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{resume.title}</h1>
          <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <FileText size={12} />
            <span className="capitalize">{resume.templateId}</span>
          </span>
          {resume.tailoredFor && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex-shrink-0">
              Tailored
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 pl-7 sm:pl-0">
          <Select
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'FINAL', label: 'Final' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as Resume['status'])}
            className="w-28 sm:w-32"
          />
          <Button variant="secondary" onClick={() => navigate(`/resumes/${resume.id}/edit`)}>
            <Pencil size={15} /> <span className="hidden sm:inline">Edit Content</span>
          </Button>
          <a href={getPdfUrl(resume.id)} download={`${resume.title}.pdf`}>
            <Button>
              <Download size={15} /> <span className="hidden sm:inline">Download PDF</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Tab navigation — only shown for tailored resumes with change data and snapshot */}
      {resume.tailoredFor && resume.tailorChanges && resume.tailorSourceSnapshot && (
        <div className="flex border-b bg-white px-4 sm:px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('changes')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'changes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Changes
          </button>
        </div>
      )}

      {/* Preview area or Changes tab */}
      {activeTab === 'preview' || !resume.tailoredFor || !resume.tailorChanges || !resume.tailorSourceSnapshot ? (
        <div className="bg-gray-100 overflow-auto relative" style={{ minHeight: previewScale < 1 ? `${1122 * previewScale + 32}px` : 'calc(100vh - 65px)' }}>
          <button
            onClick={() => setPreviewKey((k) => k + 1)}
            className="sticky top-3 float-right mr-3 z-10 bg-white border rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 shadow-sm flex items-center gap-1.5"
            title="Reload preview"
          >
            <RefreshCw size={12} /> Refresh
          </button>

          {previewScale < 1 ? (
            <div style={{ width: `${794 * previewScale}px`, height: `${1122 * previewScale}px`, overflow: 'hidden' }}>
              <iframe
                key={previewKey}
                src={getPreviewUrl(resume.id)}
                title="Resume Preview"
                style={{
                  width: '794px',
                  height: '1122px',
                  border: 'none',
                  display: 'block',
                  background: '#fff',
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
          ) : (
            <iframe
              key={previewKey}
              src={getPreviewUrl(resume.id)}
              title="Resume Preview"
              className="w-full border-none block"
              style={{ minHeight: '1122px', background: '#fff' }}
              onLoad={(e) => {
                try {
                  const doc = e.currentTarget.contentDocument;
                  if (doc) e.currentTarget.style.height = doc.documentElement.scrollHeight + 'px';
                } catch {}
              }}
            />
          )}
        </div>
      ) : (
        <div className="bg-gray-50 overflow-auto flex-1">
          <TailorChangesPanel
            changes={resume.tailorChanges}
            source={resume.tailorSourceSnapshot ?? resume.contentJson}
            current={resume.contentJson}
          />
        </div>
      )}
    </div>
  );
}
