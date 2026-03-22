import { useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Lightbulb } from 'lucide-react';
import { InterviewQuestion, InterviewFeedback } from '../../types';
import { submitAnswer, clearAnswer } from '../../api/interviewPrep';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  jobId: string;
  categoryName: string;
  questionIndex: number;
  question: InterviewQuestion;
  onAnswerSaved: (feedback: InterviewFeedback, answer: string) => void;
  onCleared: () => void;
}

export function InterviewAnswerPanel({
  jobId,
  categoryName,
  questionIndex,
  question,
  onAnswerSaved,
  onCleared,
}: Props) {
  const addToast = useAppStore((s) => s.addToast);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const hasFeedback = !!question.feedback;

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      const { feedback } = await submitAnswer({
        jobId,
        categoryName,
        questionIndex,
        question: question.question,
        answer: draft.trim(),
      });
      onAnswerSaved(feedback, draft.trim());
      setDraft('');
    } catch {
      addToast('Failed to evaluate answer. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearAnswer(jobId, categoryName, questionIndex);
      onCleared();
    } catch {
      addToast('Failed to clear answer.', 'error');
    } finally {
      setClearing(false);
    }
  };

  if (hasFeedback && question.feedback) {
    const { strengths, improvements, sampleResponse } = question.feedback;
    return (
      <div className="mt-3 space-y-3">
        {/* User's submitted answer */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Your answer</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.userAnswer}</p>
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">What you did well</span>
            </div>
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-green-800 flex gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {improvements.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Areas to strengthen</span>
            </div>
            <ul className="space-y-1">
              {improvements.map((s, i) => (
                <li key={i} className="text-sm text-amber-800 flex gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sample response */}
        {sampleResponse && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Stronger response</span>
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">{sampleResponse}</p>
          </div>
        )}

        {/* Try again */}
        <button
          onClick={handleClear}
          disabled={clearing}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {clearing ? 'Clearing…' : 'Try again'}
        </button>
      </div>
    );
  }

  // Input state (no feedback yet)
  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type your answer here…"
        rows={4}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
      />
      <button
        onClick={handleSubmit}
        disabled={!draft.trim() || submitting}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Getting feedback…' : 'Submit for Feedback'}
      </button>
    </div>
  );
}
