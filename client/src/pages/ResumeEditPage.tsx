import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, Pencil, Download, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { getResume, updateResume, renderResumePreview, getPdfUrl } from '../api/resumes';
import { Resume } from '../types';
import type { ResumeContent, ResumeExperience, ResumeEducation, ResumeCertification } from '../types/resumeContent';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { useAppStore } from '../store/useAppStore';

export function ResumeEditPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useAppStore();
  const [resume, setResume] = useState<Resume | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [previewScale, setPreviewScale] = useState(() =>
    window.innerWidth < 768 ? Math.min(1, (window.innerWidth - 16) / 794) : 1
  );
  useEffect(() => {
    const update = () =>
      setPreviewScale(window.innerWidth < 768 ? Math.min(1, (window.innerWidth - 16) / 794) : 1);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const adjustIframeHeight = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && iframeRef.current) {
        iframeRef.current.style.height = doc.documentElement.scrollHeight + 'px';
      }
    } catch {}
  }, []);

  const { register, control, watch, getValues, reset } = useForm<ResumeContent>();

  const { fields: expFields, append: appendExp, update: updateExp, remove: removeExp } =
    useFieldArray({ control, name: 'experiences', keyName: 'fieldId' as any });
  const { fields: eduFields, append: appendEdu, update: updateEdu, remove: removeEdu } =
    useFieldArray({ control, name: 'educations', keyName: 'fieldId' as any });
  const { fields: skillFields, append: appendSkill, remove: removeSkill } =
    useFieldArray({ control, name: 'skills', keyName: 'fieldId' as any });
  const { fields: certFields, append: appendCert, update: updateCert, remove: removeCert } =
    useFieldArray({ control, name: 'certifications', keyName: 'fieldId' as any });

  useEffect(() => {
    if (!id) return;
    getResume(id)
      .then(async (r) => {
        setResume(r);
        reset(r.contentJson as ResumeContent);
        try {
          const html = await renderResumePreview(r.id, r.contentJson as ResumeContent);
          setPreviewHtml(html);
        } catch {}
      })
      .catch(() => {});
  }, [id, reset]);

  // Resize iframe whenever preview HTML updates
  useEffect(() => {
    if (previewHtml) {
      // Allow the browser to parse and render the new srcdoc before measuring
      const t = setTimeout(adjustIframeHeight, 100);
      return () => clearTimeout(t);
    }
  }, [previewHtml, adjustIframeHeight]);

  // Live preview via debounced watch subscription
  useEffect(() => {
    const { unsubscribe } = watch((value) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!id) return;
        try {
          const html = await renderResumePreview(id, value as ResumeContent);
          setPreviewHtml(html);
        } catch {}
      }, 800);
    });
    return () => {
      unsubscribe();
      clearTimeout(debounceRef.current);
    };
  }, [watch, id]);

  const handleSave = async () => {
    if (!resume) return;
    setSaving(true);
    try {
      await updateResume(resume.id, { contentJson: getValues() as any });
      addToast('Resume saved!', 'success');
    } catch {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!resume) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b shadow-sm flex-shrink-0">
        <Link to={`/resumes/${resume.id}`} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{resume.title}</h1>
        </div>
        <a href={getPdfUrl(resume.id)} download={`${resume.title}.pdf`}>
          <Button variant="secondary" size="sm">
            <Download size={14} /> <span className="hidden sm:inline">Download PDF</span>
          </Button>
        </a>
        <Button onClick={handleSave} loading={saving} size="sm">
          <Save size={14} /> <span className="hidden sm:inline">Save</span>
        </Button>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b bg-white flex-shrink-0">
        <button
          onClick={() => setMobileTab('edit')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mobileTab === 'edit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            mobileTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Edit pane */}
        <div className={`${mobileTab === 'edit' ? 'block' : 'hidden'} md:block w-full md:w-[42%] overflow-y-auto border-r bg-gray-50 p-4 space-y-3 flex-shrink-0`}>
          {/* Personal Info */}
          <EditSection title="Personal Info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="First Name" {...register('personalInfo.firstName')} />
              <Input label="Last Name" {...register('personalInfo.lastName')} />
              <Input label="Email" type="email" {...register('personalInfo.email')} />
              <Input label="Phone" {...register('personalInfo.phone')} />
              <div className="sm:col-span-2">
                <Input label="Location" placeholder="City, State" {...register('personalInfo.location')} />
              </div>
              <Input label="LinkedIn URL" {...register('personalInfo.linkedinUrl')} />
              <Input label="GitHub URL" {...register('personalInfo.githubUrl')} />
              <div className="sm:col-span-2">
                <Input label="Portfolio URL" {...register('personalInfo.portfolioUrl')} />
              </div>
            </div>
          </EditSection>

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

          {/* Experience */}
          <EditSection title="Experience">
            <div className="space-y-2">
              {expFields.map((exp, index) => (
                <ExpItem
                  key={(exp as any).fieldId}
                  exp={exp as unknown as ResumeExperience}
                  onUpdate={(data) => updateExp(index, data)}
                  onDelete={() => removeExp(index)}
                />
              ))}
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
        </div>

        {/* Preview pane */}
        <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 bg-gray-100 overflow-auto`}>
          {previewHtml ? (
            <div
              style={previewScale < 1 ? {
                width: `${794 * previewScale}px`,
                height: `${1122 * previewScale}px`,
                overflow: 'hidden',
                flexShrink: 0,
              } : { width: '100%' }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Resume Preview"
                className={previewScale >= 1 ? 'w-full border-none block' : 'border-none block'}
                style={previewScale < 1 ? {
                  width: '794px',
                  height: '1122px',
                  background: '#fff',
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                } : { minHeight: '1122px', background: '#fff' }}
                sandbox="allow-same-origin"
                onLoad={adjustIframeHeight}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm w-full">
              Loading preview…
            </div>
          )}
        </div>
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
