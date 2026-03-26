import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Save, Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { patchJobOutput } from '../../api/jobs';
import { useAppStore } from '../../store/useAppStore';
import type { ResumeContent, ResumeExperience, ResumeEducation, ResumeCertification } from '../../types/resumeContent';
import type { TailorChanges, BulletChange, SkillChange } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { RichTextEditor } from '../ui/RichTextEditor';

interface Props {
  jobId: string;
  resumeJson: ResumeContent;
  tailorChanges?: TailorChanges;
  onSaved?: (updated: ResumeContent) => void;
}

export function JobOutputEditor({ jobId, resumeJson, tailorChanges, onSaved }: Props) {
  const { addToast } = useAppStore();
  const [saving, setSaving] = useState(false);

  const { control, getValues, reset } = useForm<ResumeContent>({
    defaultValues: resumeJson,
  });

  const { fields: expFields, append: appendExp, update: updateExp, remove: removeExp } =
    useFieldArray({ control, name: 'experiences', keyName: 'fieldId' as any });
  const { fields: eduFields, append: appendEdu, update: updateEdu, remove: removeEdu } =
    useFieldArray({ control, name: 'educations', keyName: 'fieldId' as any });
  const { fields: skillFields, append: appendSkill, remove: removeSkill } =
    useFieldArray({ control, name: 'skills', keyName: 'fieldId' as any });
  const { fields: certFields, append: appendCert, update: updateCert, remove: removeCert } =
    useFieldArray({ control, name: 'certifications', keyName: 'fieldId' as any });

  useEffect(() => {
    reset(resumeJson);
  }, [resumeJson, reset]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await patchJobOutput(jobId, { resumeJson: getValues() });
      addToast('Changes saved', 'success');
      if (onSaved) {
        onSaved(result.resumeJson as ResumeContent);
      }
    } catch {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Summary */}
      <EditSection title="Summary">
        <Controller
          name="summary"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
      </EditSection>
      {tailorChanges && tailorChanges.summary.original !== tailorChanges.summary.rewritten && (
        <InlineSectionChange
          title="Professional Summary"
          subtext={tailorChanges.summary.sectionSummary}
          before={tailorChanges.summary.original}
          after={tailorChanges.summary.rewritten}
        />
      )}

      {/* Experience */}
      <EditSection title="Experience">
        <div className="space-y-2">
          {expFields.map((exp, index) => {
            const expChange = tailorChanges?.experiences.find(
              (e) => e.index === index || (e.title === (exp as any).title && e.company === (exp as any).company)
            );
            return (
              <div key={(exp as any).fieldId}>
                <ExpItem
                  exp={exp as unknown as ResumeExperience}
                  onUpdate={(data) => updateExp(index, data)}
                  onDelete={() => removeExp(index)}
                />
                {expChange && expChange.bulletChanges.some((b) => b.type !== 'unchanged') && (
                  <InlineSectionChange
                    title={expChange.title}
                    subtitle={expChange.company}
                    subtext={expChange.sectionSummary}
                    before={
                      <ul className="list-disc list-outside pl-4 space-y-1.5">
                        {expChange.bulletChanges.filter((b) => b.original).map((b, i) => (
                          <li key={b.original ?? i}>{b.original}</li>
                        ))}
                      </ul>
                    }
                    after={
                      <ul className="list-disc list-outside pl-4 space-y-1.5">
                        {expChange.bulletChanges.filter((b) => b.rewritten).map((b, i) => (
                          <li key={b.rewritten ?? i}>{b.rewritten}</li>
                        ))}
                      </ul>
                    }
                    bulletChanges={expChange.bulletChanges}
                  />
                )}
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() =>
            appendExp({
              company: '',
              title: '',
              location: null,
              startDate: new Date().toISOString().slice(0, 10),
              endDate: null,
              isCurrent: false,
              description: '',
              order: expFields.length,
            })
          }
        >
          <Plus size={14} /> Add Experience
        </Button>
      </EditSection>

      {/* Education */}
      <EditSection title="Education">
        <div className="space-y-2">
          {eduFields.map((edu, index) => (
            <EduItem
              key={(edu as any).fieldId}
              edu={edu as unknown as ResumeEducation}
              onUpdate={(data) => updateEdu(index, data)}
              onDelete={() => removeEdu(index)}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() =>
            appendEdu({
              institution: '',
              degree: '',
              fieldOfStudy: null,
              startDate: new Date().toISOString().slice(0, 10),
              endDate: null,
              gpa: null,
              order: eduFields.length,
            })
          }
        >
          <Plus size={14} /> Add Education
        </Button>
      </EditSection>

      {/* Skills */}
      <EditSection title="Skills">
        <div className="flex flex-wrap gap-2 mb-3">
          {skillFields.map((skill, index) => (
            <div
              key={(skill as any).fieldId}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
            >
              {(skill as any).name}
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="hover:text-red-500"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <SkillAdder onAdd={(name) => appendSkill({ name, level: 'INTERMEDIATE', category: null })} />
      </EditSection>
      {tailorChanges && tailorChanges.skills.skillChanges.some((s) => s.type !== 'unchanged') && (
        <InlineSkillsChange
          subtext={tailorChanges.skills.sectionSummary}
          skillChanges={tailorChanges.skills.skillChanges}
        />
      )}

      {/* Certifications */}
      <EditSection title="Certifications">
        <div className="space-y-2">
          {certFields.map((cert, index) => (
            <CertItem
              key={(cert as any).fieldId}
              cert={cert as unknown as ResumeCertification}
              onUpdate={(data) => updateCert(index, data)}
              onDelete={() => removeCert(index)}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => appendCert({ name: '', issuer: '', issueDate: null, credentialUrl: null })}
        >
          <Plus size={14} /> Add Certification
        </Button>
      </EditSection>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} /> Save Changes
        </Button>
      </div>

    </div>
  );
}

// ─── Inline change blocks ─────────────────────────────────────────────────────

const BULLET_BADGE: Record<string, { label: string; className: string }> = {
  reworded: { label: 'REWORDED', className: 'bg-blue-100 text-blue-700' },
  added:    { label: 'ADDED',    className: 'bg-green-100 text-green-700' },
  removed:  { label: 'REMOVED',  className: 'bg-red-100 text-red-600' },
  combined: { label: 'COMBINED', className: 'bg-gray-100 text-gray-600' },
};

const SKILL_BADGE: Record<string, { label: string; className: string }> = {
  added:     { label: 'ADDED',     className: 'bg-green-100 text-green-700' },
  removed:   { label: 'REMOVED',   className: 'bg-red-100 text-red-600' },
  reordered: { label: 'REORDERED', className: 'bg-blue-100 text-blue-700' },
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

function InlineSectionChange({
  title,
  subtitle,
  subtext,
  before,
  after,
  bulletChanges,
}: {
  title: string;
  subtitle?: string;
  subtext: string;
  before: ReactNode;
  after: ReactNode;
  bulletChanges?: BulletChange[];
}) {
  const visible = bulletChanges?.filter((b) => b.type !== 'unchanged') ?? [];
  return (
    <div className="flex flex-col gap-3 px-1 pt-3 pb-1">
      <div>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        <p className="text-sm text-gray-500 mt-1">{subtext}</p>
      </div>
      <SideBySideCard before={before} after={after} />
      {visible.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Change Details</div>
          <div className="flex flex-col gap-2">
            {visible.map((b) => {
              const badge = BULLET_BADGE[b.type];
              if (!badge) return null;
              return (
                <div key={b.original ?? b.rewritten} className="flex items-start gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-gray-500 leading-relaxed">{b.reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineSkillsChange({ subtext, skillChanges }: { subtext: string; skillChanges: SkillChange[] }) {
  const visible = skillChanges.filter((s) => s.type !== 'unchanged');
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 px-1 pt-3 pb-1">
      <div>
        <h3 className="text-base font-bold text-gray-900">Skills</h3>
        <p className="text-sm text-gray-500 mt-1">{subtext}</p>
      </div>
      <div className="flex flex-col gap-2">
        {visible.map((s) => {
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
    </div>
  );
}

// ─── Section container ────────────────────────────────────────────────────────

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-900 text-sm"
        onClick={() => setExpanded((e) => !e)}
      >
        {title}
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {expanded && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

// ─── Experience ───────────────────────────────────────────────────────────────

function ExpItem({
  exp,
  onUpdate,
  onDelete,
}: {
  exp: ResumeExperience;
  onUpdate: (data: ResumeExperience) => void;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-start">
        <div className="min-w-0 mr-2">
          <p className="text-sm font-medium truncate">{exp.title || 'Untitled'}</p>
          <p className="text-xs text-gray-500 truncate">{exp.company}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={() => setEditOpen(true)} className="text-gray-400 hover:text-blue-500">
            <Pencil size={14} />
          </button>
          <button type="button" onClick={onDelete} className="text-gray-400 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <EditExpModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        exp={exp}
        onSave={(data) => { onUpdate(data); setEditOpen(false); }}
      />
    </div>
  );
}

function EditExpModal({
  open,
  onClose,
  exp,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  exp: ResumeExperience;
  onSave: (data: ResumeExperience) => void;
}) {
  const { register, handleSubmit, reset, watch, control } = useForm({
    defaultValues: {
      title: exp.title,
      company: exp.company,
      location: exp.location ?? '',
      startDate: exp.startDate ? String(exp.startDate).slice(0, 10) : '',
      endDate: exp.endDate ? String(exp.endDate).slice(0, 10) : '',
      isCurrent: exp.isCurrent,
      description: exp.description,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: exp.title,
        company: exp.company,
        location: exp.location ?? '',
        startDate: exp.startDate ? String(exp.startDate).slice(0, 10) : '',
        endDate: exp.endDate ? String(exp.endDate).slice(0, 10) : '',
        isCurrent: exp.isCurrent,
        description: exp.description,
      });
    }
  }, [open, exp, reset]);

  const isCurrent = watch('isCurrent');

  const onSubmit = (data: any) => {
    onSave({
      ...exp,
      title: data.title,
      company: data.company,
      location: data.location || null,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      endDate: data.isCurrent ? null : (data.endDate || null),
      isCurrent: data.isCurrent,
      description: data.description,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Experience" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Title *" {...register('title', { required: true })} />
          <Input label="Company *" {...register('company', { required: true })} />
        </div>
        <Input label="Location" {...register('location')} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isCurrent')}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Currently working here</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Start Date" type="date" {...register('startDate')} />
          {!isCurrent && <Input label="End Date" type="date" {...register('endDate')} />}
        </div>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor label="Description" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Education ────────────────────────────────────────────────────────────────

function EduItem({
  edu,
  onUpdate,
  onDelete,
}: {
  edu: ResumeEducation;
  onUpdate: (data: ResumeEducation) => void;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-start">
        <div className="min-w-0 mr-2">
          <p className="text-sm font-medium truncate">{edu.institution || 'Untitled'}</p>
          <p className="text-xs text-gray-500 truncate">{edu.degree}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={() => setEditOpen(true)} className="text-gray-400 hover:text-blue-500">
            <Pencil size={14} />
          </button>
          <button type="button" onClick={onDelete} className="text-gray-400 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <EditEduModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        edu={edu}
        onSave={(data) => { onUpdate(data); setEditOpen(false); }}
      />
    </div>
  );
}

function EditEduModal({
  open,
  onClose,
  edu,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  edu: ResumeEducation;
  onSave: (data: ResumeEducation) => void;
}) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy ?? '',
      gpa: edu.gpa ?? '',
      startDate: edu.startDate ? String(edu.startDate).slice(0, 10) : '',
      endDate: edu.endDate ? String(edu.endDate).slice(0, 10) : '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy ?? '',
        gpa: edu.gpa ?? '',
        startDate: edu.startDate ? String(edu.startDate).slice(0, 10) : '',
        endDate: edu.endDate ? String(edu.endDate).slice(0, 10) : '',
      });
    }
  }, [open, edu, reset]);

  const onSubmit = (data: any) => {
    onSave({
      ...edu,
      institution: data.institution,
      degree: data.degree,
      fieldOfStudy: data.fieldOfStudy || null,
      gpa: data.gpa || null,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      endDate: data.endDate || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Education" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Institution *" {...register('institution', { required: true })} />
        <Input label="Degree" {...register('degree')} />
        <Input label="Field of Study" {...register('fieldOfStudy')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Start Date" type="date" {...register('startDate')} />
          <Input label="End Date" type="date" {...register('endDate')} />
        </div>
        <Input label="GPA" {...register('gpa')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Skills ───────────────────────────────────────────────────────────────────

function SkillAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) { onAdd(value.trim()); setValue(''); }
          }
        }}
        placeholder="Type a skill and press Enter"
        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button
        type="button"
        size="sm"
        onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

// ─── Certifications ───────────────────────────────────────────────────────────

function CertItem({
  cert,
  onUpdate,
  onDelete,
}: {
  cert: ResumeCertification;
  onUpdate: (data: ResumeCertification) => void;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-start">
        <div className="min-w-0 mr-2">
          <p className="text-sm font-medium truncate">{cert.name || 'Untitled'}</p>
          <p className="text-xs text-gray-500 truncate">{cert.issuer}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button" onClick={() => setEditOpen(true)} className="text-gray-400 hover:text-blue-500">
            <Pencil size={14} />
          </button>
          <button type="button" onClick={onDelete} className="text-gray-400 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <EditCertModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        cert={cert}
        onSave={(data) => { onUpdate(data); setEditOpen(false); }}
      />
    </div>
  );
}

function EditCertModal({
  open,
  onClose,
  cert,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  cert: ResumeCertification;
  onSave: (data: ResumeCertification) => void;
}) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: cert.name,
      issuer: cert.issuer,
      issueDate: cert.issueDate ? String(cert.issueDate).slice(0, 10) : '',
      credentialUrl: cert.credentialUrl ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: cert.name,
        issuer: cert.issuer,
        issueDate: cert.issueDate ? String(cert.issueDate).slice(0, 10) : '',
        credentialUrl: cert.credentialUrl ?? '',
      });
    }
  }, [open, cert, reset]);

  const onSubmit = (data: any) => {
    onSave({
      ...cert,
      name: data.name,
      issuer: data.issuer,
      issueDate: data.issueDate || null,
      credentialUrl: data.credentialUrl || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Certification" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name *" {...register('name', { required: true })} />
        <Input label="Issuing Organization *" {...register('issuer', { required: true })} />
        <Input label="Issue Date" type="date" {...register('issueDate')} />
        <Input label="Credential URL" {...register('credentialUrl')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
