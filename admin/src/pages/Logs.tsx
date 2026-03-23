import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, ActivityLogEntry } from '../api/admin';
import { DataTable } from '../components/DataTable';

const ACTION_OPTIONS = [
  '', 'LOGIN', 'LOGOUT', 'RESUME_CREATED', 'RESUME_DELETED', 'RESUME_ARCHIVED',
  'JOB_CREATED', 'JOB_DELETED', 'AI_TAILOR', 'AI_COVER_LETTER', 'AI_INTERVIEW_PREP',
  'AI_SUMMARY', 'PROFILE_UPDATED', 'ACCOUNT_DELETED', 'INTERVIEW_PREP_GENERATED',
];

export default function Logs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page, action],
    queryFn: () => adminApi.getLogs({ page, limit: 50, action: action || undefined }),
  });

  const columns = [
    {
      key: 'time',
      header: 'Time',
      render: (l: ActivityLogEntry) => (
        <span className="font-mono text-xs">{new Date(l.createdAt).toLocaleString()}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (l: ActivityLogEntry) => l.user?.email ?? l.userId,
    },
    {
      key: 'action',
      header: 'Action',
      render: (l: ActivityLogEntry) => (
        <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{l.action}</span>
      ),
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (l: ActivityLogEntry) =>
        l.metadata && Object.keys(l.metadata).length > 0 ? (
          <span className="font-mono text-xs text-gray-500">
            {Object.entries(l.metadata)
              .slice(0, 3)
              .map(([k, v]) => `${k}:${String(v).slice(0, 20)}`)
              .join(' · ')}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Activity Logs</h1>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a || 'All Actions'}</option>
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
          emptyMessage="No log entries found"
        />
      )}
    </div>
  );
}
