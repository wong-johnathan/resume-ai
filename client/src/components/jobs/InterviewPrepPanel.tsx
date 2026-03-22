import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import { InterviewCategorySelector } from './InterviewCategorySelector';
import { InterviewQuestionsView } from './InterviewQuestionsView';
import {
  getInterviewPrep,
  deleteInterviewPrep,
  generateCategories,
  generateQuestions,
} from '../../api/interviewPrep';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  jobId: string;
  hasDescription: boolean;
}

type Step = 'idle' | 'selecting' | 'done';

export function InterviewPrepPanel({ jobId, hasDescription }: Props) {
  const queryClient = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);

  const { data: existingPrep, isLoading } = useQuery({
    queryKey: ['interviewPrep', jobId],
    queryFn: () => getInterviewPrep(jobId),
  });

  const [step, setStep] = useState<Step>('idle');
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Sync step with loaded data
  useEffect(() => {
    if (existingPrep && existingPrep.categories?.length > 0) {
      setStep('done');
    }
  }, [existingPrep]);

  const handleStartPrep = async () => {
    setLoadingCategories(true);
    try {
      const { categories } = await generateCategories(jobId);
      setSuggestedCategories(categories);
      setStep('selecting');
    } catch {
      addToast('Failed to generate categories. Please try again.', 'error');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleGenerate = async (selections: Array<{ name: string; questionCount: number }>) => {
    setGeneratingQuestions(true);
    try {
      await generateQuestions(jobId, selections);
      await queryClient.invalidateQueries({ queryKey: ['interviewPrep', jobId] });
      setStep('done');
    } catch {
      addToast('Failed to generate questions. Please try again.', 'error');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await deleteInterviewPrep(jobId);
      queryClient.removeQueries({ queryKey: ['interviewPrep', jobId] });
      setSuggestedCategories([]);
      setStep('idle');
    } catch {
      addToast('Failed to reset interview prep.', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900">Interview Prep</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
        </div>
      ) : step === 'idle' ? (
        <div className="text-center py-4">
          {!hasDescription ? (
            <p className="text-sm text-gray-500">
              Add a job description to generate interview prep questions.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">
                Generate tailored interview questions based on this job and your profile.
              </p>
              <button
                onClick={handleStartPrep}
                disabled={loadingCategories}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingCategories ? 'Analyzing job…' : 'Prepare for Interview'}
              </button>
            </>
          )}
        </div>
      ) : step === 'selecting' ? (
        <InterviewCategorySelector
          categories={suggestedCategories}
          onGenerate={handleGenerate}
          generating={generatingQuestions}
        />
      ) : existingPrep ? (
        <InterviewQuestionsView
          jobId={jobId}
          categories={existingPrep.categories}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
        />
      ) : null}
    </div>
  );
}
