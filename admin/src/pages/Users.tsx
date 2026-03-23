import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, UserSummary } from '../api/admin';
import { DataTable } from '../components/DataTable';
import { Search } from 'lucide-react';

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: search || undefined }),
  });

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (u: UserSummary) => (
        <Link to={`/users/${u.id}`} className="text-indigo-400 hover:text-indigo-300 hover:underline">
          {u.email}
        </Link>
      ),
    },
    { key: 'name', header: 'Name', render: (u: UserSummary) => u.displayName ?? '—' },
    {
      key: 'joined',
      header: 'Joined',
      render: (u: UserSummary) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (u: UserSummary) =>
        u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : 'Never',
    },
    { key: 'resumes', header: 'Resumes', render: (u: UserSummary) => u._count.resumes },
    { key: 'jobs', header: 'Jobs', render: (u: UserSummary) => u._count.jobApplications },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Users</h1>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(inputValue);
                setPage(1);
              }
            }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
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
          emptyMessage="No users found"
        />
      )}
    </div>
  );
}
