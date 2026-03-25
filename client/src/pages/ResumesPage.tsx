import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Trash2, ExternalLink } from 'lucide-react';
import { getResumes, deleteResume, getPdfUrl } from '../api/resumes';
import { Resume } from '../types';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const { addToast } = useAppStore();

  useEffect(() => { getResumes().then(setResumes).catch(() => {}); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this resume?')) return;
    await deleteResume(id);
    setResumes((r) => r.filter((x) => x.id !== id));
    addToast('Resume deleted', 'info');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>
        <Link to="/templates">
          <Button><Plus size={16} /> New Resume</Button>
        </Link>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">No resumes yet</p>
          <p className="text-sm mt-1">Choose a template to create your first resume</p>
          <Link to="/templates"><Button className="mt-4">Create Resume</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <Link to={`/resumes/${r.id}`} className="block p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'FINAL' ? 'bg-green-100 text-green-700' : r.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
                <p className="text-xs text-gray-500 capitalize">{r.templateId} template</p>
                <p className="text-xs text-gray-400 mt-3">Updated {formatDate(r.updatedAt)}</p>
              </Link>
              <div className="flex items-center gap-2 px-5 pb-4">
                <a href={getPdfUrl(r.id)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink size={12} /> PDF
                </a>
                <button onClick={(e) => handleDelete(r.id, e)} className="ml-auto text-gray-400 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
