import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, FileText, TrendingUp, Plus, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getJobs } from '../api/jobs';
import { getResumes } from '../api/resumes';
import { JobApplication, Resume } from '../types';
import { StatusBadge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-12" />
    </div>
  );
}

function CreditBalanceCard() {
  const { user } = useAuth();
  const sub = user?.subscription;
  const isPro = sub?.status === 'PRO';
  const creditPct = Math.round(((sub?.creditsRemaining ?? 50) / (sub?.creditsTotal ?? 50)) * 100);

  return (
    <div className="bg-white rounded-xl border shadow-sm mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
            <Zap size={15} className="text-amber-600" />
          </div>
          <h2 className="font-semibold text-gray-900">AI Credits</h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              isPro
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isPro ? 'Pro' : 'Trial'}
          </span>
          <Link to="/billing" className="text-sm text-blue-600 hover:underline">
            View Billing
          </Link>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-600">Credit balance</span>
            <span className="text-sm font-semibold text-gray-900">
              {sub?.creditsRemaining ?? 50} / {sub?.creditsTotal ?? 50}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${creditPct}%` }}
            />
          </div>
        </div>
        {!isPro && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Trial jobs used</span>
            <span className="font-medium text-gray-700">
              {sub?.jobsUsed ?? 0} / {sub?.trialLimit ?? 3}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getJobs(), getResumes()])
      .then(([j, r]) => { setJobs(j); setResumes(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts = (status: string) => jobs.filter((j) => j.status === status).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">Here's your job search at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Applications" value={jobs.length} icon={Briefcase} color="bg-blue-500" />
            <StatCard label="Interviews" value={counts('INTERVIEW')} icon={TrendingUp} color="bg-yellow-500" />
            <StatCard label="Offers" value={counts('OFFER')} icon={TrendingUp} color="bg-green-500" />
            <StatCard label="Resumes" value={resumes.length} icon={FileText} color="bg-purple-500" />
          </>
        )}
      </div>

      <CreditBalanceCard />

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Recent Applications</h2>
            <Link to="/jobs" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            ) : (
              <>
                {jobs.slice(0, 5).map((job) => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.jobTitle}</p>
                      <p className="text-xs text-gray-500">{job.company}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
                {jobs.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    No applications yet.{' '}
                    <Link to="/jobs" className="text-blue-600 hover:underline">Add your first</Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-5 space-y-3">
            <Link to="/templates" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plus size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Download resume</p>
                <p className="text-xs text-gray-500">Pick a template and download PDF</p>
              </div>
            </Link>
            <Link to="/jobs" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Briefcase size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Add a job application</p>
                <p className="text-xs text-gray-500">Track a new opportunity</p>
              </div>
            </Link>
            <Link to="/profile" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Update your profile</p>
                <p className="text-xs text-gray-500">Keep your info current</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
