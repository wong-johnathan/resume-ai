import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Trash2, ArrowLeft } from 'lucide-react';

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);
  const [confirmDeleteResume, setConfirmDeleteResume] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: !!userId,
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      navigate('/users');
    },
  });

  const deleteResumeMutation = useMutation({
    mutationFn: (resumeId: string) => adminApi.deleteResume(resumeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user', userId] }),
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!data) return <p className="text-red-400">User not found.</p>;

  const { user, resumes, jobs, aiAmendmentCount, aiUsage, activityLog, subscription } = data;
  const profile = user.profile;

  return (
    <div className="max-w-4xl space-y-8">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Users
      </button>

      {/* Profile */}
      <section>
        <h1 className="text-2xl font-bold text-white">{profile ? `${profile.firstName} ${profile.lastName}` : user.displayName ?? user.email}</h1>
        <div className="mt-2 text-sm text-gray-400 space-y-1">
          <p>{user.email}</p>
          {profile?.location && <p>{profile.location}</p>}
          <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
          <p>Last active: {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}</p>
        </div>
      </section>

      {/* Subscription */}
      {subscription && (
        <div className="bg-white rounded border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Subscription</h3>
          <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
            <span>Status: <strong>{subscription.status}</strong></span>
            <span>Credits: <strong>{subscription.creditsRemaining} / {subscription.creditsTotal}</strong></span>
            <span>Jobs used: <strong>{subscription.jobsUsed}</strong></span>
            {subscription.currentPeriodEnd && (
              <span>Renews: <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* AI Usage */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">AI Usage</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['Tailors', aiUsage.tailor],
            ['Cover Letters', aiUsage.coverLetter],
            ['Interview Preps', aiUsage.interviewPrep],
            ['Summaries', aiUsage.summary],
          ].map(([label, count]) => (
            <div key={label as string} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">{aiAmendmentCount} total AI amendments</p>
      </section>

      {/* Resumes */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Resumes ({resumes.length})</h2>
        {resumes.length === 0 ? (
          <p className="text-sm text-gray-500">No resumes.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  {['Title', 'Status', 'Template', 'Tailored For', 'Created', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {resumes.map((r) => (
                  <tr key={r.id} className="bg-gray-950 hover:bg-gray-900">
                    <td className="px-4 py-3 text-gray-200">{r.title}</td>
                    <td className="px-4 py-3 text-gray-400">{r.status}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.templateId}</td>
                    <td className="px-4 py-3 text-gray-400">{r.tailoredFor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmDeleteResume(r.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Jobs */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Jobs ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">No jobs.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  {['Company', 'Title', 'Status', 'Applied'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {jobs.map((j) => (
                  <tr
                    key={j.id}
                    className="bg-gray-950 hover:bg-gray-900 cursor-pointer"
                    onClick={() => navigate(`/users/${userId}/jobs/${j.id}`)}
                  >
                    <td className="px-4 py-3 text-gray-200">{j.company}</td>
                    <td className="px-4 py-3 text-gray-400">{j.jobTitle}</td>
                    <td className="px-4 py-3 text-gray-400">{j.status}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {j.appliedAt ? new Date(j.appliedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Activity log */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Activity Log</h2>
        <ActivityTimeline logs={activityLog} />
      </section>

      {/* Danger zone */}
      <section className="border border-red-900 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-400 mb-4">
          Permanently delete this user and all their data. This cannot be undone.
        </p>
        <button
          onClick={() => setConfirmDeleteUser(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Delete User
        </button>
      </section>

      <ConfirmDialog
        open={confirmDeleteUser}
        title="Delete User"
        message={`Permanently delete ${user.email} and all their data? This cannot be undone.`}
        confirmLabel="Delete User"
        onConfirm={() => { setConfirmDeleteUser(false); deleteUserMutation.mutate(); }}
        onCancel={() => setConfirmDeleteUser(false)}
        danger
      />
      <ConfirmDialog
        open={!!confirmDeleteResume}
        title="Delete Resume"
        message="Permanently delete this resume?"
        confirmLabel="Delete Resume"
        onConfirm={() => { if (confirmDeleteResume) deleteResumeMutation.mutate(confirmDeleteResume); setConfirmDeleteResume(null); }}
        onCancel={() => setConfirmDeleteResume(null)}
        danger
      />
    </div>
  );
}
