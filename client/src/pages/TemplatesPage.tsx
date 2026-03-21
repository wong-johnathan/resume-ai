import { useState, useEffect } from 'react';
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

// Compute thumbnail scale so the iframe fills the card width on mobile,
// while preserving the original compact thumbnail on desktop.
// Accounts for: sidebar (240px at md+), max-w-5xl cap (1024px), px-6 padding (48px), gap-6 gaps (24px).
const MIN_THUMBNAIL_SCALE = 0.275; // original desktop value

function computeThumbnailScale() {
  const vw = window.innerWidth;
  const sidebarWidth = vw >= 768 ? 240 : 0;
  // max-w-5xl = 1024px; content area is capped at that width
  const innerWidth = Math.min(vw - sidebarWidth, 1024) - 48;
  const gap = 24;
  let cols = 1;
  if (vw >= 1280) cols = 5;
  else if (vw >= 1024) cols = 4;
  else if (vw >= 640) cols = 2;
  const cardWidth = (innerWidth - gap * (cols - 1)) / cols;
  // On mobile, fill the card; on desktop, never exceed the original compact scale
  return Math.max(cardWidth / IFRAME_WIDTH, MIN_THUMBNAIL_SCALE);
}

export function TemplatesPage() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [thumbnailScale, setThumbnailScale] = useState(computeThumbnailScale);
  useEffect(() => {
    const update = () => setThumbnailScale(computeThumbnailScale());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const [overlayScale, setOverlayScale] = useState(() =>
    window.innerWidth < 826 ? Math.min(1, (window.innerWidth - 32) / 794) : 1
  );
  useEffect(() => {
    const update = () =>
      setOverlayScale(window.innerWidth < 826 ? Math.min(1, (window.innerWidth - 32) / 794) : 1);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
              style={{ height: `${Math.round(IFRAME_HEIGHT * thumbnailScale)}px` }}
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
                  transform: `scale(${thumbnailScale})`,
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
              <span className="text-sm text-gray-400 ml-2 hidden sm:inline">— {previewTemplate.description}</span>
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
          <div
            className="flex-1 overflow-auto py-6"
            style={{ display: 'flex', justifyContent: overlayScale < 1 ? 'flex-start' : 'center', paddingLeft: overlayScale < 1 ? 0 : '1rem', paddingRight: overlayScale < 1 ? 0 : '1rem' }}
          >
            <div
              className="bg-white shadow-2xl rounded-sm"
              style={{ width: '794px', flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`/api/templates/${previewTemplate.id}/preview`}
                title={`${previewTemplate.name} full preview`}
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
