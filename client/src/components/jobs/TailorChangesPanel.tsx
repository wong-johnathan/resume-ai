import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TailorChanges, BulletChange, SkillChange } from '../../types';

interface Props {
  changes: TailorChanges;
  initiallyExpanded: boolean;
  onCollapse: () => void;
}

const BULLET_BADGE: Record<string, { label: string; className: string }> = {
  reworded: { label: 'REWORDED', className: 'bg-blue-100 text-blue-700' },
  added:    { label: 'ADDED',    className: 'bg-green-100 text-green-700' },
  removed:  { label: 'REMOVED',  className: 'bg-red-100 text-red-600' },
  combined: { label: 'COMBINED', className: 'bg-gray-100 text-gray-600' },
};

const SKILL_BADGE: Record<string, { label: string; className: string }> = {
  added:    { label: 'ADDED',     className: 'bg-green-100 text-green-700' },
  removed:  { label: 'REMOVED',   className: 'bg-red-100 text-red-600' },
  reordered:{ label: 'REORDERED', className: 'bg-blue-100 text-blue-700' },
};

function SideBySideCard({ before, after }: { before: ReactNode; after: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-3">Before</div>
        <div className="text-sm text-red-700 leading-relaxed">{before}</div>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-3">After</div>
        <div className="text-sm text-green-700 leading-relaxed">{after}</div>
      </div>
    </div>
  );
}

function ChangeDetails({ bulletChanges }: { bulletChanges: BulletChange[] }) {
  const visible = bulletChanges.filter((b) => b.type !== 'unchanged');
  if (visible.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Change Details</div>
      <div className="flex flex-col gap-2">
        {visible.map((b, i) => {
          const badge = BULLET_BADGE[b.type];
          if (!badge) return null;
          return (
            <div key={b.original ?? b.rewritten ?? i} className="flex items-start gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${badge.className}`}>
                {badge.label}
              </span>
              <span className="text-xs text-gray-500 leading-relaxed">{b.reason}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillChangeDetails({ skillChanges }: { skillChanges: SkillChange[] }) {
  const visible = skillChanges.filter((s) => s.type !== 'unchanged');
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {visible.map((s, i) => {
        const badge = SKILL_BADGE[s.type];
        if (!badge) return null;
        return (
          <div key={s.name} className="flex items-start gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${badge.className}`}>
              {badge.label}
            </span>
            <div>
              <span className="text-xs font-medium text-gray-700">{s.name}</span>
              <span className="text-xs text-gray-400 ml-1">— {s.reason}</span>
            </div>
          </div>
        );
      })}
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
    <div className="border border-indigo-100 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-indigo-50/40 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-indigo-700">AI Changes</p>
          {!open && (
            <p className="text-xs text-indigo-400 mt-0.5 truncate max-w-xs">
              {changes.overallSummary}
            </p>
          )}
        </div>
        {open ? (
          <ChevronUp size={15} className="text-indigo-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-indigo-400 flex-shrink-0" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-6 flex flex-col gap-8">
          {/* Overall summary */}
          <p className="text-sm text-indigo-600 italic">{changes.overallSummary}</p>

          {/* Professional Summary */}
          {changes.summary.original !== changes.summary.rewritten && (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Professional Summary</h3>
                <p className="text-sm text-gray-500 mt-1">{changes.summary.sectionSummary}</p>
              </div>
              <SideBySideCard
                before={changes.summary.original}
                after={changes.summary.rewritten}
              />
            </div>
          )}

          {/* Experiences */}
          {visibleExperiences.map((exp) => (
            <div key={exp.index} className="flex flex-col gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">{exp.title}</h3>
                <p className="text-sm text-gray-400">{exp.company}</p>
                <p className="text-sm text-gray-500 mt-1">{exp.sectionSummary}</p>
              </div>
              <SideBySideCard
                before={
                  <ul className="list-disc list-outside pl-4 space-y-1.5">
                    {exp.bulletChanges
                      .filter((b) => b.original)
                      .map((b, i) => <li key={b.original ?? i}>{b.original}</li>)}
                  </ul>
                }
                after={
                  <ul className="list-disc list-outside pl-4 space-y-1.5">
                    {exp.bulletChanges
                      .filter((b) => b.rewritten)
                      .map((b, i) => <li key={b.rewritten ?? i}>{b.rewritten}</li>)}
                  </ul>
                }
              />
              <ChangeDetails bulletChanges={exp.bulletChanges} />
            </div>
          ))}

          {/* Skills */}
          {visibleSkillChanges.length > 0 && (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Skills</h3>
                <p className="text-sm text-gray-500 mt-1">{changes.skills.sectionSummary}</p>
              </div>
              <SkillChangeDetails skillChanges={changes.skills.skillChanges} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
