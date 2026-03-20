import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FileUp, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { createProfile, addExperience, addEducation, addSkill, addCertification, parsePdf } from '../api/profile';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';

const setupSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().optional().or(z.literal('')),
  githubUrl: z.string().optional().or(z.literal('')),
  portfolioUrl: z.string().optional().or(z.literal('')),
  summary: z.string().nullable().optional(),
});

type SetupForm = z.infer<typeof setupSchema>;

export function SetupPage() {
  const { user } = useAuth();
  const { addToast } = useAppStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [pendingImport, setPendingImport] = useState<any | null>(null);

  const normalizeUrl = (url?: string) =>
    url && !/^https?:\/\//i.test(url) ? `https://${url}` : url;

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { email: user?.email ?? '' },
  });

  const linkedinVal = watch('linkedinUrl') ?? '';
  const githubVal = watch('githubUrl') ?? '';
  const portfolioVal = watch('portfolioUrl') ?? '';

  const onPdfUpload = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parsePdf(file);
      const { experiences, educations, skills, certifications, ...personalInfo } = parsed;
      reset({ email: user?.email ?? personalInfo.email, ...personalInfo });
      setPendingImport({ experiences, educations, skills, certifications });
      addToast('PDF parsed! Review your info and click "Complete Setup".', 'success');
    } catch {
      addToast('Failed to parse PDF. Make sure it is a valid resume PDF.', 'error');
    } finally {
      setParsing(false);
    }
  };

  const onSubmit = async (data: SetupForm) => {
    setSaving(true);
    try {
      const profile = await createProfile({
        ...data,
        linkedinUrl: normalizeUrl(data.linkedinUrl) || undefined,
        githubUrl: normalizeUrl(data.githubUrl) || undefined,
        portfolioUrl: normalizeUrl(data.portfolioUrl) || undefined,
      });
      if (pendingImport && profile) {
        const { experiences, educations, skills, certifications } = pendingImport;
        await Promise.all([
          ...experiences.map((e: any, i: number) => addExperience({ ...e, order: i })),
          ...educations.map((e: any, i: number) => addEducation({ ...e, order: i })),
          ...skills.map((s: any) => addSkill({ name: s.name, level: s.level || 'INTERMEDIATE' })),
          ...certifications.map((c: any) => addCertification(c)),
        ]);
      }
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/dashboard');
    } catch {
      addToast('Failed to save profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome! Let's set up your profile</h1>
        <p className="text-gray-500 mt-1">Fill in your details to get started. You can always update these later.</p>
      </div>

      {/* PDF Upload */}
      <label
        className={`flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl p-6 mb-4 cursor-pointer transition-colors ${parsing ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type === 'application/pdf') onPdfUpload(f); }}
      >
        <input type="file" accept="application/pdf" className="hidden" disabled={parsing} onChange={(e) => { const f = e.target.files?.[0]; if (f) { onPdfUpload(f); e.target.value = ''; } }} />
        {parsing ? <Loader2 size={24} className="text-blue-500 animate-spin" /> : <FileUp size={24} className="text-gray-400" />}
        <p className="text-sm font-medium text-gray-700">{parsing ? 'Parsing your resume…' : 'Upload resume PDF to auto-fill'}</p>
        {!parsing && <p className="text-xs text-gray-400">Click to browse or drag & drop · LinkedIn PDF works great</p>}
      </label>

      {pendingImport && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-800">
          <span className="font-medium">Detected from PDF:</span> {pendingImport.experiences.length} experiences · {pendingImport.educations.length} educations · {pendingImport.skills.length} skills · {pendingImport.certifications.length} certifications — will be imported when you complete setup.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input
              label="Last Name"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
            <Input
              label="Email (optional)"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Phone (optional)"
              {...register('phone')}
            />
            <Input
              label="Location (optional)"
              placeholder="City, State"
              {...register('location')}
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Online Presence <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="LinkedIn URL"
                placeholder="linkedin.com/in/…"
                {...register('linkedinUrl', { onBlur: (e) => setValue('linkedinUrl', normalizeUrl(e.target.value)) })}
              />
              {linkedinVal && !/^https?:\/\//i.test(linkedinVal) && <p className="text-xs text-blue-500 mt-0.5">https:// will be added automatically</p>}
            </div>
            <div>
              <Input
                label="GitHub URL"
                placeholder="github.com/…"
                {...register('githubUrl', { onBlur: (e) => setValue('githubUrl', normalizeUrl(e.target.value)) })}
              />
              {githubVal && !/^https?:\/\//i.test(githubVal) && <p className="text-xs text-blue-500 mt-0.5">https:// will be added automatically</p>}
            </div>
            <div className="col-span-2">
              <Input
                label="Portfolio URL"
                placeholder="yoursite.com"
                {...register('portfolioUrl', { onBlur: (e) => setValue('portfolioUrl', normalizeUrl(e.target.value)) })}
              />
              {portfolioVal && !/^https?:\/\//i.test(portfolioVal) && <p className="text-xs text-blue-500 mt-0.5">https:// will be added automatically</p>}
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-4">About You <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
          <Controller
            name="summary"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                label="Professional Summary"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.summary?.message}
              />
            )}
          />
          <p className="text-xs text-gray-400 mt-1">A brief description of yourself — your background, goals, and what makes you stand out.</p>
        </div>

        <Button type="submit" loading={saving} className="w-full">
          Complete Setup
        </Button>
      </form>
    </div>
  );
}
