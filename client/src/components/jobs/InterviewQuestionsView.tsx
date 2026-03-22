import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { InterviewCategory, InterviewFeedback, InterviewQuestion } from '../../types';
import { InterviewAnswerPanel } from './InterviewAnswerPanel';
import { addQuestion } from '../../api/interviewPrep';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  jobId: string;
  categories: InterviewCategory[];
  hasDescription: boolean;
}

export function InterviewQuestionsView({ jobId, categories: initialCategories, hasDescription }: Props) {
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

  const queryClient = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);

  // Add-question inline form state per category
  const [addingQuestionTo, setAddingQuestionTo] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Add-category inline form state
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatQuestion, setNewCatQuestion] = useState('');
  const [catNameError, setCatNameError] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        if (addingQuestionTo === name) {
          setAddingQuestionTo(null);
          setNewQuestion('');
        }
      } else {
        next.add(name);
      }
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

  const handleSampleResponseGenerated = (catName: string, qIndex: number, sampleResponse: string) => {
    patchQuestion(catName, qIndex, { sampleResponse });
  };

  const handleAddQuestion = async (catName: string) => {
    if (!newQuestion.trim()) return;
    setSubmittingQuestion(true);
    try {
      await addQuestion(jobId, catName, newQuestion.trim());
      await queryClient.invalidateQueries({ queryKey: ['interviewPrep', jobId] });
      setAddingQuestionTo(null);
      setNewQuestion('');
    } catch {
      addToast('Failed to add question. Please try again.', 'error');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleAddCategory = async () => {
    const trimmedName = newCatName.trim();
    const trimmedQ = newCatQuestion.trim();
    if (!trimmedName || !trimmedQ) return;

    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setCatNameError('A category with this name already exists');
      return;
    }
    setCatNameError('');
    setSubmittingCategory(true);
    try {
      await addQuestion(jobId, trimmedName, trimmedQ);
      await queryClient.invalidateQueries({ queryKey: ['interviewPrep', jobId] });
      setAddingCategory(false);
      setNewCatName('');
      setNewCatQuestion('');
    } catch {
      addToast('Failed to add category. Please try again.', 'error');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const answeredCount = categories.reduce(
    (sum, c) => sum + c.questions.filter((q) => !!q.feedback).length,
    0
  );
  const totalCount = categories.reduce((sum, c) => sum + c.questions.length, 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {answeredCount}/{totalCount} answered
      </p>

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
                    <div key={qIndex} className="px-4 py-3">
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
                          hasDescription={hasDescription}
                          onAnswerSaved={(feedback: InterviewFeedback, answer: string) =>
                            patchQuestion(cat.name, qIndex, { feedback, userAnswer: answer })
                          }
                          onCleared={() =>
                            patchQuestion(cat.name, qIndex, { feedback: undefined, userAnswer: undefined })
                          }
                          onSampleResponseGenerated={(sr: string) =>
                            handleSampleResponseGenerated(cat.name, qIndex, sr)
                          }
                        />
                      )}
                    </div>
                  );
                })}

                {/* Add question inline form */}
                {addingQuestionTo === cat.name ? (
                  <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                    <input
                      type="text"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Enter your question…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddQuestion(cat.name)}
                        disabled={!newQuestion.trim() || submittingQuestion}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submittingQuestion ? 'Adding…' : 'Add'}
                      </button>
                      <button
                        onClick={() => { setAddingQuestionTo(null); setNewQuestion(''); }}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingQuestionTo(cat.name)}
                    className="w-full flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add question
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add category inline form */}
      {addingCategory ? (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">New category</p>
          <div className="space-y-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => { setNewCatName(e.target.value); setCatNameError(''); }}
              placeholder="Category name…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {catNameError && (
              <p className="text-xs text-red-600">{catNameError}</p>
            )}
            <input
              type="text"
              value={newCatQuestion}
              onChange={(e) => setNewCatQuestion(e.target.value)}
              placeholder="First question…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim() || !newCatQuestion.trim() || submittingCategory}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submittingCategory ? 'Adding…' : 'Add'}
            </button>
            <button
              onClick={() => { setAddingCategory(false); setNewCatName(''); setNewCatQuestion(''); setCatNameError(''); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingCategory(true)}
          className="w-full flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add category
        </button>
      )}
    </div>
  );
}
