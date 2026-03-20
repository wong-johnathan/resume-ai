import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { getResume, getPdfUrl, getPreviewUrl, updateResume } from '../api/resumes';
import { Resume } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useAppStore } from '../store/useAppStore';

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useAppStore();
  const [resume, setResume] = useState<Resume | null>(null);
  const [status, setStatus] = useState<Resume['status']>('DRAFT');
  const [previewKey, setPreviewKey] = useState(0);

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
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b shadow-sm flex-shrink-0">
        <Link to="/resumes" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>

        <div className="flex items-center gap-2 flex-1 min-w-0">
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

        <Select
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'FINAL', label: 'Final' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as Resume['status'])}
          className="w-32 flex-shrink-0"
        />

        <a href={getPdfUrl(resume.id)} download={`${resume.title}.pdf`} className="flex-shrink-0">
          <Button>
            <Download size={15} /> Download PDF
          </Button>
        </a>
      </div>

      {/* Preview area */}
      <div className="bg-gray-100 overflow-auto relative" style={{ height: 'calc(100vh - 65px)' }}>
        <button
          onClick={() => setPreviewKey((k) => k + 1)}
          className="sticky top-3 float-right mr-3 z-10 bg-white border rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 shadow-sm flex items-center gap-1.5"
          title="Reload preview"
        >
          <RefreshCw size={12} /> Refresh
        </button>

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
      </div>
    </div>
  );
}
