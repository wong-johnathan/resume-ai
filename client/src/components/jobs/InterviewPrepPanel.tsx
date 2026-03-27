import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import { InterviewCategorySelector } from './InterviewCategorySelector';
import { InterviewQuestionsView } from './InterviewQuestionsView';
import {
  getInterviewPrep,
  generateCategories,
  generateQuestions,
} from '../../api/interviewPrep';
import { useAppStore } from '../../store/useAppStore';
import { useTour } from '../../hooks/useTour';
import { TakeTourButton } from '../tour/TakeTourButton';
import CreditCost from '../ui/CreditCost';

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

  useTour('job-prep', !isLoading); // auto-starts tour on first visit

  const [step, setStep] = useState<Step>('idle');
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

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
    } catch (err: any) {
      if (err?.response?.status === 402 && err.response.data?.error === 'insufficient_credits') {
        addToast(`Not enough credits. You need ${err.response.data.creditsRequired}, have ${err.response.data.creditsRemaining}.`, 'error');
      } else {
        addToast('Failed to generate categories. Please try again.', 'error');
      }
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
    } catch (err: any) {
      if (err?.response?.status === 402 && err.response.data?.error === 'insufficient_credits') {
        addToast(`Not enough credits. You need ${err.response.data.creditsRequired}, have ${err.response.data.creditsRemaining}.`, 'error');
      } else {
        addToast('Failed to generate questions. Please try again.', 'error');
      }
    } finally {
      setGeneratingQuestions(false);
    }
  };


  return (
    <div className="bg-white rounded-xl border shadow-sm p-5" data-tour="prep-panel">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900">Interview Prep</h2>
        <div className="ml-auto">
          <TakeTourButton tourId="job-prep" />
        </div>
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
              <div className="inline-flex items-center gap-2">
                <button
                  onClick={handleStartPrep}
                  disabled={loadingCategories}
                  data-tour="prepare-btn"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingCategories ? 'Analyzing job…' : 'Prepare for Interview'}
                </button>
                <CreditCost cost={5} tooltip />
              </div>
            </>
          )}
        </div>
      ) : step === 'selecting' ? (
        <div data-tour="category-selector">
          <InterviewCategorySelector
            categories={suggestedCategories}
            onGenerate={handleGenerate}
            generating={generatingQuestions}
          />
        </div>
      ) : existingPrep ? (
        <InterviewQuestionsView
          jobId={jobId}
          categories={existingPrep.categories}
          hasDescription={hasDescription}
        />
      ) : null}
    </div>
  );
}
