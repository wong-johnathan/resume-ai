import { Zap } from 'lucide-react';

interface Props {
  cost: number;
  tooltip?: boolean;
}

export default function CreditCost({ cost, tooltip = false }: Props) {
  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Zap className="h-3 w-3" />
      {cost}
    </span>
  );

  if (!tooltip) return badge;

  return (
    <span className="group relative inline-flex">
      {badge}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {cost} credit{cost !== 1 ? 's' : ''}
      </span>
    </span>
  );
}
