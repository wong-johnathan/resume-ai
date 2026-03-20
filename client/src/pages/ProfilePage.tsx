import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { getProfile, createProfile, updateProfile, addExperience, updateExperience, deleteExperience, addEducation, updateEducation, deleteEducation, addSkill, deleteSkill, addCertification, updateCertification, deleteCertification, parsePdf } from '../api/profile';
import { deleteAccount } from '../api/auth';
import { useAppStore } from '../store/useAppStore';
import { Profile, Certification, Education, Experience } from '../types';
import { useNavigate } from 'react-router-dom';

type ProfileForm = Omit<Profile, 'id' | 'userId' | 'experiences' | 'educations' | 'skills' | 'certifications'>;

export function ProfilePage() {
  const { addToast } = useAppStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ experience: true, education: true, skills: true, certs: true });
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [pendingImport, setPendingImport] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<ProfileForm>();

  const normalizeUrl = (url: string) =>
    url && !/^https?:\/\//i.test(url) ? `https://${url}` : url;

  const linkedinVal = watch('linkedinUrl') ?? '';
  const githubVal = watch('githubUrl') ?? '';
  const portfolioVal = watch('portfolioUrl') ?? '';

  useEffect(() => {
    getProfile()
      .then((p) => { setProfile(p); reset(p); })
      .catch(() => {});
  }, [reset]);

  const onSaveInfo = async (data: ProfileForm) => {
    setSaving(true);
    try {
      if (profile) {
        const updated = await updateProfile(data);
        setProfile((p) => p ? { ...p, ...updated } : null);
      } else {
        const created = await createProfile(data);
        setProfile(created as Profile);
      }
      addToast('Profile saved!', 'success');
    } catch {
      addToast('Failed to save profile', 'error');
    } finally { setSaving(false); }
  };

  const onPdfUpload = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parsePdf(file);
      const { experiences, educations, skills, certifications, ...personalInfo } = parsed;
      reset(personalInfo);
      setPendingImport({ experiences, educations, skills, certifications });
      addToast('PDF parsed! Review your info below, then click "Import Data".', 'success');
    } catch {
      addToast('Failed to parse PDF. Make sure it is a valid resume PDF.', 'error');
    } finally { setParsing(false); }
  };

  const onImportData = async () => {
    if (!profile || !pendingImport) return addToast('Save your profile info first', 'info');
    setImporting(true);
    try {
      const { experiences, educations, skills, certifications } = pendingImport;
      await Promise.all([
        ...experiences.map((e: any, i: number) => addExperience({ ...e, order: i })),
        ...educations.map((e: any, i: number) => addEducation({ ...e, order: i })),
        ...skills.map((s: any) => addSkill({ name: s.name, level: s.level || 'INTERMEDIATE' })),
        ...certifications.map((c: any) => addCertification(c)),
      ]);
      const refreshed = await getProfile();
      setProfile(refreshed);
      setPendingImport(null);
      addToast(`Imported ${experiences.length} experiences, ${educations.length} educations, ${skills.length} skills, ${certifications.length} certifications.`, 'success');
    } catch {
      addToast('Some items failed to import', 'error');
    } finally { setImporting(false); }
  };

  const toggleSection = (key: keyof typeof expandedSections) =>
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/login');
    } catch {
      addToast('Failed to delete account. Please try again.', 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      {/* PDF Upload */}
      <label
        className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl p-6 mb-4 cursor-pointer transition-colors ${parsing ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type === 'application/pdf') onPdfUpload(f); }}
      >
        <input type="file" accept="application/pdf" className="hidden" disabled={parsing} onChange={(e) => { const f = e.target.files?.[0]; if (f) { onPdfUpload(f); e.target.value = ''; } }} />
        {parsing ? <Loader2 size={24} className="text-blue-500 animate-spin" /> : <FileUp size={24} className="text-gray-400" />}
        <p className="text-sm font-medium text-gray-700">{parsing ? 'Parsing your resume…' : 'Upload resume PDF to auto-fill'}</p>
        {!parsing && <p className="text-xs text-gray-400">Click to browse or drag & drop</p>}
      </label>

      {/* Pending import banner */}
      {pendingImport && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-green-800">
            <span className="font-medium">Detected from PDF:</span> {pendingImport.experiences.length} experiences · {pendingImport.educations.length} educations · {pendingImport.skills.length} skills · {pendingImport.certifications.length} certifications
          </p>
          <Button size="sm" loading={importing} onClick={onImportData}>Import Data</Button>
        </div>
      )}

      {/* Personal Info */}
      <form onSubmit={handleSubmit(onSaveInfo)} className="bg-white rounded-xl border shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input label="First Name" {...register('firstName', { required: true })} error={errors.firstName ? 'Required' : ''} />
          <Input label="Last Name" {...register('lastName', { required: true })} error={errors.lastName ? 'Required' : ''} />
          <Input label="Email" type="email" {...register('email', { required: true })} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Location" placeholder="City, State" {...register('location')} />
          <div>
            <Input label="LinkedIn URL" placeholder="linkedin.com/in/…" {...register('linkedinUrl', { onBlur: (e) => setValue('linkedinUrl', normalizeUrl(e.target.value)) })} />
            {linkedinVal && !/^https?:\/\//i.test(linkedinVal) && <p className="text-xs text-blue-500 mt-0.5">https:// will be added automatically</p>}
          </div>
          <div>
            <Input label="GitHub URL" placeholder="github.com/…" {...register('githubUrl', { onBlur: (e) => setValue('githubUrl', normalizeUrl(e.target.value)) })} />
            {githubVal && !/^https?:\/\//i.test(githubVal) && <p className="text-xs text-blue-500 mt-0.5">https:// will be added automatically</p>}
          </div>
          <div>
            <Input label="Portfolio URL" placeholder="yoursite.com" {...register('portfolioUrl', { onBlur: (e) => setValue('portfolioUrl', normalizeUrl(e.target.value)) })} />
            {portfolioVal && !/^https?:\/\//i.test(portfolioVal) && <p className="text-xs text-blue-500 mt-0.5">https:// will be added automatically</p>}
          </div>
        </div>
        <Controller
          name="summary"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              label="Professional Summary"
              value={field.value ?? ''}
              onChange={field.onChange}
              className="mb-4"
            />
          )}
        />
        <Button type="submit" loading={saving}>Save Info</Button>
      </form>

      {/* Experience */}
      <Section title="Work Experience" expanded={expandedSections.experience} onToggle={() => toggleSection('experience')}>
        {profile?.experiences.map((exp) => (
          <ExperienceItem key={exp.id} exp={exp} profileId={profile.id}
            onUpdate={(id: string, data: any) => updateExperience(id, data).then(() => getProfile().then(setProfile)).catch(() => addToast('Error', 'error'))}
            onDelete={(id: string) => deleteExperience(id).then(() => getProfile().then(setProfile)).catch(() => addToast('Error', 'error'))}
          />
        ))}
        <Button variant="secondary" size="sm" onClick={() => {
          if (!profile) return addToast('Save your profile info first', 'info');
          setExpModalOpen(true);
        }}>
          <Plus size={14} /> Add Experience
        </Button>
      </Section>

      <AddExpModal
        open={expModalOpen}
        onClose={() => setExpModalOpen(false)}
        onAdd={(data) => addExperience(data).then(() => getProfile().then(setProfile)).catch(() => addToast('Error adding experience', 'error'))}
      />

      {/* Education */}
      <Section title="Education" expanded={expandedSections.education} onToggle={() => toggleSection('education')}>
        {profile?.educations.map((edu) => (
          <EducationItem key={edu.id} edu={edu}
            onUpdate={(id: string, data: any) => updateEducation(id, data).then(() => getProfile().then(setProfile)).catch(() => addToast('Error', 'error'))}
            onDelete={(id: string) => deleteEducation(id).then(() => getProfile().then(setProfile)).catch(() => addToast('Error', 'error'))}
          />
        ))}
        <Button variant="secondary" size="sm" onClick={() => {
          if (!profile) return addToast('Save your profile info first', 'info');
          setEduModalOpen(true);
        }}>
          <Plus size={14} /> Add Education
        </Button>
      </Section>

      <AddEduModal
        open={eduModalOpen}
        onClose={() => setEduModalOpen(false)}
        onAdd={(data) => addEducation(data).then(() => getProfile().then(setProfile)).catch(() => addToast('Error adding education', 'error'))}
      />

      {/* Skills */}
      <Section title="Skills" expanded={expandedSections.skills} onToggle={() => toggleSection('skills')}>
        <div className="flex flex-wrap gap-2 mb-3">
          {profile?.skills.map((skill) => (
            <div key={skill.id} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
              {skill.name}
              <button onClick={() => deleteSkill(skill.id).then(() => getProfile().then(setProfile)).catch(() => {})} className="hover:text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <SkillAdder onAdd={(name) => {
          if (!profile) return addToast('Save your profile info first', 'info');
          addSkill({ name, level: 'INTERMEDIATE' }).then(() => getProfile().then(setProfile)).catch(() => addToast('Error', 'error'));
        }} />
      </Section>

      {/* Certifications */}
      <Section title="Certifications" expanded={expandedSections.certs} onToggle={() => toggleSection('certs')}>
        {profile?.certifications.map((cert) => (
          <CertItem key={cert.id} cert={cert}
            onUpdate={(id: string, data: Partial<Certification>) => updateCertification(id, data).then(() => getProfile().then(setProfile)).catch(() => addToast('Error', 'error'))}
            onDelete={(id: string) => deleteCertification(id).then(() => getProfile().then(setProfile)).catch(() => {})}
          />
        ))}
        <Button variant="secondary" size="sm" onClick={() => {
          if (!profile) return addToast('Save your profile info first', 'info');
          setCertModalOpen(true);
        }}>
          <Plus size={14} /> Add Certification
        </Button>
      </Section>

      <AddCertModal
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        onAdd={(data) => addCertification(data).then(() => getProfile().then(setProfile)).catch(() => addToast('Error adding certification', 'error'))}
      />

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm mb-4 p-6">
        <h2 className="font-semibold text-red-600 mb-1 flex items-center gap-2"><AlertTriangle size={16} /> Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data — resumes, job applications, profile information, and more. This cannot be undone.</p>
        <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>Delete my account</Button>
      </div>

      {/* Delete confirmation modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete account?" size="sm">
        <p className="text-sm text-gray-600 mb-6">This will permanently delete your account and all data including your profile, resumes, and job applications. <strong>This cannot be undone.</strong></p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteAccount} loading={deleting}>Yes, delete my account</Button>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm mb-4">
      <button className="w-full flex items-center justify-between px-6 py-4 font-semibold text-gray-900" onClick={onToggle}>
        {title}
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {expanded && <div className="px-6 pb-6 space-y-3">{children}</div>}
    </div>
  );
}

function ExperienceItem({ exp, onUpdate, onDelete }: any) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div><p className="text-sm font-medium">{exp.title}</p><p className="text-xs text-gray-500">{exp.company}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="text-gray-400 hover:text-blue-500"><Pencil size={15} /></button>
          <button onClick={() => onDelete(exp.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
        </div>
      </div>
      <EditExpModal open={editOpen} onClose={() => setEditOpen(false)} exp={exp}
        onSave={(data) => { onUpdate(exp.id, data); setEditOpen(false); }} />
    </div>
  );
}

function EducationItem({ edu, onUpdate, onDelete }: any) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="border rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div><p className="text-sm font-medium">{edu.institution}</p><p className="text-xs text-gray-500">{edu.degree}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="text-gray-400 hover:text-blue-500"><Pencil size={15} /></button>
          <button onClick={() => onDelete(edu.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
        </div>
      </div>
      <EditEduModal open={editOpen} onClose={() => setEditOpen(false)} edu={edu}
        onSave={(data) => { onUpdate(edu.id, data); setEditOpen(false); }} />
    </div>
  );
}

function CertItem({ cert, onUpdate, onDelete }: any) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="text-sm font-medium">{cert.name}</p>
        <p className="text-xs text-gray-500">{cert.issuer}</p>
        {cert.issueDate && <p className="text-xs text-gray-400">{new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}{cert.expiryDate ? ` – ${new Date(cert.expiryDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setEditOpen(true)} className="text-gray-400 hover:text-blue-500"><Pencil size={15} /></button>
        <button onClick={() => onDelete(cert.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
      </div>
      <EditCertModal open={editOpen} onClose={() => setEditOpen(false)} cert={cert}
        onSave={(data) => { onUpdate(cert.id, data); setEditOpen(false); }} />
    </div>
  );
}

function SkillAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (value.trim()) { onAdd(value.trim()); setValue(''); } } }}
        placeholder="Type a skill and press Enter"
        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button type="button" size="sm" onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}>
        <Plus size={14} />
      </Button>
    </div>
  );
}

const MONTHS = [
  { value: '', label: 'Month' },
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const YEARS = [{ value: '', label: 'Year' }, ...Array.from({ length: 60 }, (_, i) => {
  const y = new Date().getFullYear() + 5 - i;
  return { value: String(y), label: String(y) };
})];

function AddCertModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (data: Omit<Certification, 'id'>) => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    name: string; issuer: string;
    issueMonth: string; issueYear: string;
    expiryMonth: string; expiryYear: string;
    credentialUrl: string;
  }>();

  const onSubmit = (data: any) => {
    const issueDate = data.issueYear && data.issueMonth ? `${data.issueYear}-${data.issueMonth}-01` : null;
    const expiryDate = data.expiryYear && data.expiryMonth ? `${data.expiryYear}-${data.expiryMonth}-01` : null;
    onAdd({ name: data.name, issuer: data.issuer, issueDate, expiryDate, credentialUrl: data.credentialUrl || null });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add license or certification" size="lg">
      <p className="text-xs text-gray-500 mb-5">* Indicates required</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Name*" placeholder="Ex: Microsoft certified network associate security"
          {...register('name', { required: 'Required' })} error={errors.name?.message} />
        <Input label="Issuing organization*" placeholder="Ex: Microsoft"
          {...register('issuer', { required: 'Required' })} error={errors.issuer?.message} />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Issue date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('issueMonth')} />
            <Select label="Year" options={YEARS} {...register('issueYear')} />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Expiration date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('expiryMonth')} />
            <Select label="Year" options={YEARS} {...register('expiryYear')} />
          </div>
        </div>
        <Input label="Credential URL" {...register('credentialUrl')} />
        <div className="flex justify-end pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddEduModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (data: Omit<Education, 'id'>) => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    institution: string; degree: string; fieldOfStudy: string; gpa: string;
    startMonth: string; startYear: string; endMonth: string; endYear: string;
  }>();

  const onSubmit = (data: any) => {
    const startDate = data.startYear && data.startMonth ? `${data.startYear}-${data.startMonth}-01` : new Date().toISOString();
    const endDate = data.endYear && data.endMonth ? `${data.endYear}-${data.endMonth}-01` : null;
    onAdd({ institution: data.institution, degree: data.degree || '', fieldOfStudy: data.fieldOfStudy || null, gpa: data.gpa || null, startDate, endDate, order: 0 });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add education" size="lg">
      <p className="text-xs text-gray-500 mb-5">* Indicates required</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="School*" placeholder="Ex: Boston University"
          {...register('institution', { required: 'Required' })} error={errors.institution?.message} />
        <Input label="Degree" placeholder="Ex: Bachelor of Science" {...register('degree')} />
        <Input label="Field of study" placeholder="Ex: Business" {...register('fieldOfStudy')} />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Start date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('startMonth')} />
            <Select label="Year" options={YEARS} {...register('startYear')} />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">End date (or expected)</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('endMonth')} />
            <Select label="Year" options={YEARS} {...register('endYear')} />
          </div>
        </div>
        <Input label="Grade" {...register('gpa')} />
        <div className="flex justify-end pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddExpModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (data: Omit<Experience, 'id'>) => void }) {
  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<{
    title: string; company: string; location: string; description: string;
    isCurrent: boolean; startMonth: string; startYear: string;
  }>({ defaultValues: { isCurrent: false, description: '' } });

  const isCurrent = watch('isCurrent');

  const onSubmit = (data: any) => {
    const startDate = data.startYear && data.startMonth
      ? `${data.startYear}-${data.startMonth}-01`
      : new Date().toISOString();
    onAdd({ title: data.title, company: data.company, location: data.location || null, isCurrent: data.isCurrent, startDate, endDate: null, description: data.description || '', order: 0 });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add experience" size="lg">
      <p className="text-xs text-gray-500 mb-5">* Indicates required</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Title*" placeholder="Ex: Retail Sales Manager"
          {...register('title', { required: 'Required' })} error={errors.title?.message} />
        <Input label="Company or organization*" placeholder="Ex: Microsoft"
          {...register('company', { required: 'Required' })} error={errors.company?.message} />
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" {...register('isCurrent')} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-gray-700">I am currently working in this role</span>
        </label>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Start date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month*" options={MONTHS} {...register('startMonth', { required: !isCurrent })} />
            <Select label="Year*" options={YEARS} {...register('startYear', { required: !isCurrent })} />
          </div>
        </div>
        <Input label="Location" placeholder="Ex: London, United Kingdom" {...register('location')} />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor label="Description" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditExpModal({ open, onClose, exp, onSave }: { open: boolean; onClose: () => void; exp: any; onSave: (data: any) => void }) {
  const { register, handleSubmit, reset, watch, control } = useForm({
    defaultValues: {
      title: exp.title, company: exp.company, location: exp.location ?? '',
      isCurrent: exp.isCurrent,
      startMonth: exp.startDate?.slice(5, 7) ?? '',
      startYear: exp.startDate?.slice(0, 4) ?? '',
      endMonth: exp.endDate?.slice(5, 7) ?? '',
      endYear: exp.endDate?.slice(0, 4) ?? '',
      description: exp.description ?? '',
    },
  });

  useEffect(() => {
    if (open) reset({
      title: exp.title, company: exp.company, location: exp.location ?? '',
      isCurrent: exp.isCurrent,
      startMonth: exp.startDate?.slice(5, 7) ?? '',
      startYear: exp.startDate?.slice(0, 4) ?? '',
      endMonth: exp.endDate?.slice(5, 7) ?? '',
      endYear: exp.endDate?.slice(0, 4) ?? '',
      description: exp.description ?? '',
    });
  }, [open]);

  const isCurrent = watch('isCurrent');

  const onSubmit = (data: any) => {
    const startDate = data.startYear && data.startMonth ? `${data.startYear}-${data.startMonth}-01` : exp.startDate;
    const endDate = data.isCurrent ? null : (data.endYear && data.endMonth ? `${data.endYear}-${data.endMonth}-01` : null);
    onSave({ title: data.title, company: data.company, location: data.location || null, isCurrent: data.isCurrent, startDate, endDate, description: data.description });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit experience" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Title*" {...register('title', { required: true })} />
        <Input label="Company or organization*" {...register('company', { required: true })} />
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" {...register('isCurrent')} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-gray-700">I am currently working in this role</span>
        </label>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Start date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('startMonth')} />
            <Select label="Year" options={YEARS} {...register('startYear')} />
          </div>
        </div>
        {!isCurrent && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">End date</p>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Month" options={MONTHS} {...register('endMonth')} />
              <Select label="Year" options={YEARS} {...register('endYear')} />
            </div>
          </div>
        )}
        <Input label="Location" {...register('location')} />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor label="Description" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditEduModal({ open, onClose, edu, onSave }: { open: boolean; onClose: () => void; edu: any; onSave: (data: any) => void }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      institution: edu.institution, degree: edu.degree ?? '', fieldOfStudy: edu.fieldOfStudy ?? '', gpa: edu.gpa ?? '',
      startMonth: edu.startDate?.slice(5, 7) ?? '',
      startYear: edu.startDate?.slice(0, 4) ?? '',
      endMonth: edu.endDate?.slice(5, 7) ?? '',
      endYear: edu.endDate?.slice(0, 4) ?? '',
    },
  });

  useEffect(() => {
    if (open) reset({
      institution: edu.institution, degree: edu.degree ?? '', fieldOfStudy: edu.fieldOfStudy ?? '', gpa: edu.gpa ?? '',
      startMonth: edu.startDate?.slice(5, 7) ?? '',
      startYear: edu.startDate?.slice(0, 4) ?? '',
      endMonth: edu.endDate?.slice(5, 7) ?? '',
      endYear: edu.endDate?.slice(0, 4) ?? '',
    });
  }, [open]);

  const onSubmit = (data: any) => {
    const startDate = data.startYear && data.startMonth ? `${data.startYear}-${data.startMonth}-01` : edu.startDate;
    const endDate = data.endYear && data.endMonth ? `${data.endYear}-${data.endMonth}-01` : null;
    onSave({ institution: data.institution, degree: data.degree, fieldOfStudy: data.fieldOfStudy || null, gpa: data.gpa || null, startDate, endDate });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit education" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="School*" {...register('institution', { required: true })} />
        <Input label="Degree" {...register('degree')} />
        <Input label="Field of study" {...register('fieldOfStudy')} />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Start date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('startMonth')} />
            <Select label="Year" options={YEARS} {...register('startYear')} />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">End date (or expected)</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('endMonth')} />
            <Select label="Year" options={YEARS} {...register('endYear')} />
          </div>
        </div>
        <Input label="Grade" {...register('gpa')} />
        <div className="flex justify-end pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditCertModal({ open, onClose, cert, onSave }: { open: boolean; onClose: () => void; cert: any; onSave: (data: any) => void }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: cert.name, issuer: cert.issuer, credentialUrl: cert.credentialUrl ?? '',
      issueMonth: cert.issueDate?.slice(5, 7) ?? '',
      issueYear: cert.issueDate?.slice(0, 4) ?? '',
      expiryMonth: cert.expiryDate?.slice(5, 7) ?? '',
      expiryYear: cert.expiryDate?.slice(0, 4) ?? '',
    },
  });

  useEffect(() => {
    if (open) reset({
      name: cert.name, issuer: cert.issuer, credentialUrl: cert.credentialUrl ?? '',
      issueMonth: cert.issueDate?.slice(5, 7) ?? '',
      issueYear: cert.issueDate?.slice(0, 4) ?? '',
      expiryMonth: cert.expiryDate?.slice(5, 7) ?? '',
      expiryYear: cert.expiryDate?.slice(0, 4) ?? '',
    });
  }, [open]);

  const onSubmit = (data: any) => {
    const issueDate = data.issueYear && data.issueMonth ? `${data.issueYear}-${data.issueMonth}-01` : null;
    const expiryDate = data.expiryYear && data.expiryMonth ? `${data.expiryYear}-${data.expiryMonth}-01` : null;
    onSave({ name: data.name, issuer: data.issuer, issueDate, expiryDate, credentialUrl: data.credentialUrl || null });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit license or certification" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input label="Name*" {...register('name', { required: true })} />
        <Input label="Issuing organization*" {...register('issuer', { required: true })} />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Issue date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('issueMonth')} />
            <Select label="Year" options={YEARS} {...register('issueYear')} />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Expiration date</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" options={MONTHS} {...register('expiryMonth')} />
            <Select label="Year" options={YEARS} {...register('expiryYear')} />
          </div>
        </div>
        <Input label="Credential URL" {...register('credentialUrl')} />
        <div className="flex justify-end pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
