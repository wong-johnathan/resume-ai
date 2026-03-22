import { TailorChanges, ResumeContent } from '../../types';

interface Props {
  changes: TailorChanges;
  source: ResumeContent;   // tailorSourceSnapshot — the "before" state
  current: ResumeContent;  // contentJson — the "after" state
}

const BADGE_STYLES: Record<string, string> = {
  reworded: 'bg-blue-50 text-blue-700 border-blue-200',
  added: 'bg-green-50 text-green-700 border-green-200',
  removed: 'bg-red-50 text-red-700 border-red-200',
  reordered: 'bg-purple-50 text-purple-700 border-purple-200',
};

function Badge({ type }: { type: string }) {
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${BADGE_STYLES[type] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {type}
    </span>
  );
}

function SideBySide({ left, right, label }: { left: string; right: string; label?: string }) {
  const changed = left.trim() !== right.trim();
  return (
    <div className="mt-2">
      {label && <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className={`text-xs p-2.5 rounded-lg border ${changed ? 'bg-red-50 border-red-100 text-red-900' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 text-gray-400">Before</p>
          {left
          ? <div className="leading-relaxed prose prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: left }} />
          : <em className="text-gray-400">—</em>}
        </div>
        <div className={`text-xs p-2.5 rounded-lg border ${changed ? 'bg-green-50 border-green-100 text-green-900' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 text-gray-400">After</p>
          {right
          ? <div className="leading-relaxed prose prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: right }} />
          : <em className="text-gray-400">—</em>}
        </div>
      </div>
    </div>
  );
}

export function TailorChangesPanel({ changes, source, current }: Props) {
  return (
    <div className="space-y-4 px-4 py-4 max-w-4xl mx-auto">
      {/* Overall summary */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
        <p className="text-sm font-medium text-purple-800">{changes.overallSummary}</p>
      </div>

      {/* Summary section */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-gray-900 mb-1">Professional Summary</h3>
        <p className="text-xs text-gray-500 mb-2">{changes.summary.sectionSummary}</p>
        <SideBySide left={changes.summary.original} right={changes.summary.rewritten} />
      </div>

      {/* Experience sections */}
      {changes.experiences.map((exp, i) => {
        const sourceExp = source.experiences[exp.index];
        const currentExp =
          current.experiences.find((e) => e.company === exp.company && e.title === exp.title) ??
          current.experiences[exp.index];
        const changedBullets = exp.bulletChanges.filter((b) => b.type !== 'unchanged');
        return (
          <div key={`exp-${i}-${exp.index}`} className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-gray-900">{exp.title}</h3>
            <p className="text-xs text-gray-400 mb-1">{exp.company}</p>
            <p className="text-xs text-gray-500 mb-3">{exp.sectionSummary}</p>

            <SideBySide
              left={sourceExp?.description ?? ''}
              right={currentExp?.description ?? ''}
            />

            {changedBullets.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Change Details</p>
                {changedBullets.map((bullet, bi) => (
                  <div key={`${bullet.type}-${bi}`} className="flex gap-2 items-start text-xs">
                    <Badge type={bullet.type} />
                    <p className="text-gray-600 flex-1">{bullet.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Skills section */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-sm text-gray-900 mb-1">Skills</h3>
        <p className="text-xs text-gray-500 mb-3">{changes.skills.sectionSummary}</p>

        {/* Side-by-side skill lists */}
        <SideBySide
          left={source.skills.map((s) => s.name).join(', ')}
          right={current.skills.map((s) => s.name).join(', ')}
        />

        {/* Per-skill change rows (skip unchanged) */}
        {(() => {
          const changedSkills = changes.skills.skillChanges.filter((s) => s.type !== 'unchanged');
          return changedSkills.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Change Details</p>
              {changedSkills.map((skill) => (
                <div key={skill.name} className="flex gap-2 items-start text-xs">
                  <Badge type={skill.type} />
                  <span className="font-medium text-gray-700 flex-shrink-0">{skill.name}:</span>
                  <p className="text-gray-600 flex-1">{skill.reason}</p>
                </div>
              ))}
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
