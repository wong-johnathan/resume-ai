import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { StatCard } from '../components/StatCard';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  if (isLoading) return <p className="text-gray-400">Loading stats...</p>;
  if (!stats) return <p className="text-red-400">Failed to load stats.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Unique Visitors" value={stats.uniqueVisitors} sub="distinct logins" />
        <StatCard label="Total Jobs" value={stats.totalJobs} />
        <StatCard label="Resumes Deleted" value={stats.resumesDeleted} />
      </div>
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Resumes</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Draft" value={stats.resumes.draft} />
        <StatCard label="Final" value={stats.resumes.final} />
        <StatCard label="Archived" value={stats.resumes.archived} />
        <StatCard label="Churn (Archived)" value={stats.resumesArchived} sub="archived events" />
      </div>
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">AI Usage</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Resume Tailors" value={stats.aiUsage.tailor} />
        <StatCard label="Cover Letters" value={stats.aiUsage.coverLetter} />
        <StatCard label="Interview Preps" value={stats.aiUsage.interviewPrep} />
        <StatCard label="Summary Gens" value={stats.aiUsage.summary} />
      </div>
    </div>
  );
}
