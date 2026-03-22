import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getJob } from '../api/jobs';
import { JobApplication } from '../types';
import { InterviewPrepPanel } from '../components/jobs/InterviewPrepPanel';

export function JobPrepPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getJob(id)
        .then(setJob)
        .catch(() => setJob(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-6 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {job.company ?? 'job'}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{job.jobTitle}</h1>
        {job.company && (
          <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
        )}
      </div>

      <InterviewPrepPanel jobId={job.id} hasDescription={!!job.description} />
    </div>
  );
}
