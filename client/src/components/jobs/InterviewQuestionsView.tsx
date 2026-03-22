import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { InterviewCategory, InterviewFeedback, InterviewQuestion } from '../../types';
import { InterviewAnswerPanel } from './InterviewAnswerPanel';

interface Props {
  jobId: string;
  categories: InterviewCategory[];
  onRegenerate: () => void;
  regenerating: boolean;
}

export function InterviewQuestionsView({ jobId, categories: initialCategories, onRegenerate, regenerating }: Props) {
  // Local copy so we can patch individual questions after feedback without a full refetch
  const [categories, setCategories] = useState<InterviewCategory[]>(initialCategories);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(initialCategories.map((c) => c.name))
  );
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCategories(initialCategories);
    setOpenCategories(new Set(initialCategories.map((c) => c.name)));
    setOpenQuestions(new Set());
  }, [initialCategories]);

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleQuestion = (key: string) => {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const patchQuestion = (catName: string, qIndex: number, patch: Partial<InterviewQuestion>) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.name === catName
          ? {
              ...cat,
              questions: cat.questions.map((q, i) =>
                i === qIndex ? { ...q, ...patch } : q
              ),
            }
          : cat
      )
    );
  };

  const answeredCount = categories.reduce(
    (sum, c) => sum + c.questions.filter((q) => !!q.feedback).length,
    0
  );
  const totalCount = categories.reduce((sum, c) => sum + c.questions.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {answeredCount}/{totalCount} answered
        </p>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
        >
          {regenerating ? 'Resetting…' : 'Regenerate'}
        </button>
      </div>

      {categories.map((cat) => {
        const isCatOpen = openCategories.has(cat.name);
        const catAnswered = cat.questions.filter((q) => !!q.feedback).length;
        return (
          <div key={cat.name} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat.name)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                  {catAnswered}/{cat.questions.length}
                </span>
              </div>
              {isCatOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {/* Questions list */}
            {isCatOpen && (
              <div className="divide-y divide-gray-100">
                {cat.questions.map((q, qIndex) => {
                  const qKey = `${cat.name}-${qIndex}`;
                  const isQOpen = openQuestions.has(qKey);
                  return (
                    <div key={q.question} className="px-4 py-3">
                      {/* Question row */}
                      <button
                        onClick={() => toggleQuestion(qKey)}
                        className="w-full flex items-start justify-between gap-3 text-left"
                      >
                        <span className="text-sm text-gray-700 leading-relaxed flex-1">
                          {qIndex + 1}. {q.question}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {q.feedback && (
                            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                              answered
                            </span>
                          )}
                          {isQOpen ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Answer panel */}
                      {isQOpen && (
                        <InterviewAnswerPanel
                          jobId={jobId}
                          categoryName={cat.name}
                          questionIndex={qIndex}
                          question={q}
                          onAnswerSaved={(feedback: InterviewFeedback, answer: string) =>
                            patchQuestion(cat.name, qIndex, { feedback, userAnswer: answer })
                          }
                          onCleared={() =>
                            patchQuestion(cat.name, qIndex, { feedback: undefined, userAnswer: undefined })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
