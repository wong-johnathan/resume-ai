import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, ResumeSummary } from '../api/admin';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['', 'DRAFT', 'FINAL', 'ARCHIVED'];

export default function Resumes() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-resumes', page, status],
    queryFn: () => adminApi.getResumes({ page, limit: 20, status: status || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteResume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-resumes'] }),
  });

  const columns = [
    { key: 'title', header: 'Title', render: (r: ResumeSummary) => r.title },
    { key: 'user', header: 'User', render: (r: ResumeSummary) => r.user.email },
    { key: 'status', header: 'Status', render: (r: ResumeSummary) => r.status },
    { key: 'template', header: 'Template', render: (r: ResumeSummary) => <span className="font-mono text-xs">{r.templateId}</span> },
    { key: 'tailored', header: 'Tailored For', render: (r: ResumeSummary) => r.tailoredFor ?? '—' },
    { key: 'created', header: 'Created', render: (r: ResumeSummary) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      render: (r: ResumeSummary) => (
        <button onClick={() => setConfirmDelete(r.id)} className="text-red-400 hover:text-red-300 transition-colors">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Resumes</h1>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageCount={data?.pageCount ?? 1}
          onPageChange={setPage}
          emptyMessage="No resumes found"
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Resume"
        message="Permanently delete this resume? This cannot be undone."
        confirmLabel="Delete Resume"
        onConfirm={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  );
}
