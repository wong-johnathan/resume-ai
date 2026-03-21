import { useState } from 'react';
import { ZoomIn, X, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { getTemplatePdfUrl } from '../api/templates';

const templates = [
  { id: 'minimal',    name: 'Minimal',     description: 'Clean sans-serif design with generous whitespace.' },
  { id: 'compact',    name: 'Compact',     description: 'Dense layout that maximises content per page.' },
  { id: 'elegant',    name: 'Elegant',     description: 'Centered serif header with decorative horizontal rules.' },
  { id: 'tech',       name: 'Tech',        description: 'Dark code-inspired theme with monospace typography.' },
  { id: 'cleanpro',   name: 'Clean Pro',   description: 'Ultra-clean layout with right-aligned contact stack.' },
];

const IFRAME_WIDTH = 800;
const IFRAME_HEIGHT = 1000;
const PREVIEW_SCALE = 0.275;
const PREVIEW_H = Math.round(IFRAME_HEIGHT * PREVIEW_SCALE);

export function TemplatesPage() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  const previewTemplate = previewId ? templates.find((t) => t.id === previewId) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h1>
      <p className="text-gray-500 mb-8">Preview a template and download your resume as a PDF.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => setPreviewId(t.id)}
            className="cursor-pointer rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden group"
          >
            {/* Scaled iframe thumbnail */}
            <div
              className="relative overflow-hidden bg-gray-50"
              style={{ height: `${PREVIEW_H}px` }}
            >
              {!loadedIds.has(t.id) && (
                <div className="absolute inset-0 z-10 animate-pulse bg-gray-200" />
              )}
              <iframe
                src={`/api/templates/${t.id}/preview`}
                title={`${t.name} template preview`}
                scrolling="no"
                tabIndex={-1}
                onLoad={() => setLoadedIds((prev) => new Set([...prev, t.id]))}
                style={{
                  width: `${IFRAME_WIDTH}px`,
                  height: `${IFRAME_HEIGHT}px`,
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                  border: 'none',
                }}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              {/* Zoom button */}
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewId(t.id); }}
                className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm text-gray-600 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Full preview"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            <div className="px-4 py-3 border-t bg-white">
              <h3 className="font-semibold text-gray-900 text-sm">{t.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Full-screen preview overlay */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70" onClick={() => setPreviewId(null)}>
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="font-semibold text-gray-900">{previewTemplate.name}</span>
              <span className="text-sm text-gray-400 ml-2">— {previewTemplate.description}</span>
            </div>
            <div className="flex items-center gap-3">
              <a href={getTemplatePdfUrl(previewTemplate.id)} download>
                <Button>
                  <Download size={15} /> Download PDF
                </Button>
              </a>
              <button
                onClick={() => setPreviewId(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable preview */}
          <div className="flex-1 overflow-auto flex justify-center py-6 px-4">
            <div
              className="bg-white shadow-2xl rounded-sm"
              style={{ width: '794px', flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`/api/templates/${previewTemplate.id}/preview`}
                title={`${previewTemplate.name} full preview`}
                scrolling="no"
                onLoad={(e) => {
                  try {
                    const doc = e.currentTarget.contentDocument;
                    if (doc) e.currentTarget.style.height = doc.documentElement.scrollHeight + 'px';
                  } catch {}
                }}
                style={{
                  width: '794px',
                  height: '1122px',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
