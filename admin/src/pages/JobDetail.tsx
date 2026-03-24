import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { ArrowLeft, ExternalLink } from 'lucide-react';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-gray-200">{children}</div>
    </div>
  );
}

export default function JobDetail() {
  const { userId, jobId } = useParams<{ userId: string; jobId: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
    queryKey: ['admin-job', userId, jobId],
    queryFn: () => adminApi.getJob(userId!, jobId!),
    enabled: !!userId && !!jobId,
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!job) return <p className="text-red-400">Job not found.</p>;

  return (
    <div className="max-w-3xl space-y-8">
      <button
        onClick={() => navigate(`/users/${userId}`)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to User
      </button>

      <section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{job.jobTitle}</h1>
            <p className="text-gray-400 mt-1">{job.company}</p>
          </div>
          <span className="mt-1 px-2 py-1 text-xs font-medium rounded bg-gray-800 text-gray-300 border border-gray-700 whitespace-nowrap">
            {job.status}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <Field label="Location">{job.location ?? '—'}</Field>
        <Field label="Salary">{job.salary ?? '—'}</Field>
        <Field label="Applied">
          {job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : '—'}
        </Field>
        <Field label="Created">{new Date(job.createdAt).toLocaleDateString()}</Field>
        {job.jobUrl && (
          <Field label="Job URL">
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Open listing <ExternalLink size={12} />
            </a>
          </Field>
        )}
        <Field label="AI Amendments">{job.aiAmendments.length}</Field>
      </section>

      {job.description && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Job Description</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {job.description}
          </div>
        </section>
      )}

      {job.notes && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Notes</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {job.notes}
          </div>
        </section>
      )}

      {job.coverLetter && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Cover Letter</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {job.coverLetter}
          </div>
        </section>
      )}

      {job.aiAmendments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">AI Amendments</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {job.aiAmendments.map((a, i) => (
                  <tr key={i} className="bg-gray-950">
                    <td className="px-4 py-3 text-gray-300">{a.type}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
