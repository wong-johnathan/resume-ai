import { useState } from 'react';
import { Button } from '../ui/Button';

interface CategorySelection {
  checked: boolean;
  count: number;
}

interface Props {
  categories: string[];
  onGenerate: (selections: Array<{ name: string; questionCount: number }>) => void;
  generating: boolean;
}

export function InterviewCategorySelector({ categories, onGenerate, generating }: Props) {
  const [selections, setSelections] = useState<Record<string, CategorySelection>>(() =>
    Object.fromEntries(categories.map((cat) => [cat, { checked: true, count: 5 }]))
  );

  const toggleCategory = (name: string) => {
    setSelections((prev) => ({
      ...prev,
      [name]: { ...prev[name], checked: !prev[name].checked },
    }));
  };

  const setCount = (name: string, count: number) => {
    setSelections((prev) => ({
      ...prev,
      [name]: { ...prev[name], count },
    }));
  };

  const anySelected = Object.values(selections).some((s) => s.checked);

  const handleGenerate = () => {
    const selected = Object.entries(selections)
      .filter(([, s]) => s.checked)
      .map(([name, s]) => ({ name, questionCount: s.count }));
    onGenerate(selected);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Select the categories you want to prep for and how many questions per category.
      </p>
      <div className="space-y-2">
        {categories.map((cat) => {
          const sel = selections[cat];
          return (
            <div key={cat} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <input
                type="checkbox"
                id={`cat-${cat}`}
                checked={sel.checked}
                onChange={() => toggleCategory(cat)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`cat-${cat}`} className="flex-1 text-sm font-medium text-gray-800 cursor-pointer">
                {cat}
              </label>
              {sel.checked && (
                <select
                  value={sel.count}
                  onChange={(e) => setCount(cat, Number(e.target.value))}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} questions
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      <Button
        onClick={handleGenerate}
        disabled={!anySelected}
        loading={generating}
        className="w-full mt-2"
      >
        {generating ? 'Generating questions…' : 'Generate Questions'}
      </Button>
    </div>
  );
}
