const statusColors: Record<string, string> = {
  SAVED: 'bg-gray-100 text-gray-700',
  APPLIED: 'bg-blue-100 text-blue-700',
  PHONE_SCREEN: 'bg-purple-100 text-purple-700',
  INTERVIEW: 'bg-yellow-100 text-yellow-700',
  OFFER: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
