import { ActivityLogEntry } from '../api/admin';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-500',
  LOGOUT: 'bg-gray-500',
  RESUME_CREATED: 'bg-blue-500',
  RESUME_DELETED: 'bg-red-500',
  RESUME_ARCHIVED: 'bg-yellow-500',
  JOB_CREATED: 'bg-purple-500',
  JOB_DELETED: 'bg-red-400',
  AI_TAILOR: 'bg-indigo-500',
  AI_COVER_LETTER: 'bg-indigo-400',
  AI_INTERVIEW_PREP: 'bg-teal-500',
  AI_SUMMARY: 'bg-cyan-500',
  PROFILE_UPDATED: 'bg-orange-400',
  ACCOUNT_DELETED: 'bg-red-700',
  INTERVIEW_PREP_GENERATED: 'bg-teal-400',
};

export function ActivityTimeline({ logs }: { logs: ActivityLogEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">No activity recorded.</p>;
  }
  return (
    <ol className="relative border-l border-gray-800 ml-3 space-y-4">
      {logs.map((log) => (
        <li key={log.id} className="ml-4">
          <span
            className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border border-gray-950 ${ACTION_COLORS[log.action] ?? 'bg-gray-500'}`}
          />
          <p className="text-xs text-gray-500">
            {new Date(log.createdAt).toLocaleString()}
          </p>
          <p className="text-sm font-medium text-gray-200">{log.action.replace(/_/g, ' ')}</p>
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              {Object.entries(log.metadata)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
