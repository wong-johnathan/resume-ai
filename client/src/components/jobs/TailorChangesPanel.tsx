import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TailorChanges, BulletChange } from '../../types';

interface Props {
  changes: TailorChanges;
  initiallyExpanded: boolean;
  onCollapse: () => void;
}

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  reworded: { label: 'reworded', className: 'bg-blue-100 text-blue-700' },
  added:    { label: 'added',    className: 'bg-green-100 text-green-700' },
  removed:  { label: 'removed',  className: 'bg-red-100 text-red-600' },
  combined: { label: 'combined', className: 'bg-gray-100 text-gray-600' },
};

function BulletChangeRow({ change }: { change: BulletChange }) {
  const badge = TYPE_BADGE[change.type];
  if (!badge) return null; // hide 'unchanged'

  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className} flex-shrink-0`}>
          {badge.label}
        </span>
        {change.original && (
          <span className="text-xs text-gray-400 line-through truncate">{change.original}</span>
        )}
      </div>
      {change.rewritten && (
        <p className="text-xs text-gray-700 pl-[52px]">{change.rewritten}</p>
      )}
      <p className="text-[10px] text-gray-400 pl-[52px] italic">{change.reason}</p>
    </div>
  );
}

export function TailorChangesPanel({ changes, initiallyExpanded, onCollapse }: Props) {
  const [open, setOpen] = useState(initiallyExpanded);

  const handleToggle = () => {
    if (open) onCollapse();
    setOpen((v) => !v);
  };

  const visibleExperiences = changes.experiences.filter((exp) =>
    exp.bulletChanges.some((b) => b.type !== 'unchanged')
  );

  const visibleSkillChanges = changes.skills.skillChanges.filter(
    (s) => s.type !== 'unchanged'
  );

  return (
    <div className="border border-indigo-100 rounded-xl bg-indigo-50/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-indigo-50 transition-colors"
      >
        <div>
          <p className="text-xs font-semibold text-indigo-700">What AI Changed</p>
          {!open && (
            <p className="text-[10px] text-indigo-400 mt-0.5 truncate max-w-xs">
              {changes.overallSummary}
            </p>
          )}
        </div>
        {open ? (
          <ChevronUp size={14} className="text-indigo-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-indigo-400 flex-shrink-0" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Overall summary */}
          <p className="text-xs text-indigo-600 italic">{changes.overallSummary}</p>

          {/* Summary section */}
          {changes.summary.original !== changes.summary.rewritten && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-[10px] text-gray-400 mb-1 italic">{changes.summary.sectionSummary}</p>
              <div className="bg-white rounded-lg border border-gray-100 p-2 space-y-1.5">
                <div>
                  <span className="text-[10px] font-semibold text-red-500 uppercase">Before</span>
                  <p className="text-xs text-gray-500 line-through mt-0.5">{changes.summary.original}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-green-600 uppercase">After</span>
                  <p className="text-xs text-gray-700 mt-0.5">{changes.summary.rewritten}</p>
                </div>
              </div>
            </div>
          )}

          {/* Experience sections */}
          {visibleExperiences.map((exp) => (
            <div key={exp.index}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                {exp.company} — {exp.title}
              </p>
              <p className="text-[10px] text-gray-400 mb-1 italic">{exp.sectionSummary}</p>
              <div className="bg-white rounded-lg border border-gray-100 p-2">
                {exp.bulletChanges
                  .filter((b) => b.type !== 'unchanged')
                  .map((b, i) => (
                    <BulletChangeRow key={i} change={b} />
                  ))}
              </div>
            </div>
          ))}

          {/* Skills section */}
          {visibleSkillChanges.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Skills</p>
              <p className="text-[10px] text-gray-400 mb-1 italic">{changes.skills.sectionSummary}</p>
              <div className="bg-white rounded-lg border border-gray-100 p-2 space-y-1">
                {visibleSkillChanges.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      s.type === 'added' ? 'bg-green-100 text-green-700' :
                      s.type === 'removed' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {s.type}
                    </span>
                    <div>
                      <span className="text-xs font-medium text-gray-700">{s.name}</span>
                      <span className="text-[10px] text-gray-400 ml-1">— {s.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
