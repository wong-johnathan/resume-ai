import { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TEMPLATE_OPTIONS } from '../../api/templates';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
}

export function ExportModal({ open, onClose, jobId }: ExportModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_OPTIONS[0]?.value ?? 'minimal');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) return;
    // Fetch preview on open and template change
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPreviewLoading(true);
      fetch(`/api/jobs/${jobId}/resume/preview?templateId=${selectedTemplate}`, {
        credentials: 'include',
        signal: controller.signal,
      })
        .then((r) => r.text())
        .then((html) => { setPreviewHtml(html); setPreviewLoading(false); })
        .catch((err) => { if (err.name !== 'AbortError') setPreviewLoading(false); });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [open, selectedTemplate, jobId]);

  const handleDownload = () => {
    window.open(`/api/jobs/${jobId}/resume/pdf?templateId=${selectedTemplate}`, '_blank');
  };

  return (
    <Modal open={open} onClose={onClose} title="Export Resume" size="xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="relative border rounded-lg overflow-hidden bg-gray-50" style={{ height: '400px' }}>
          {previewLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="text-sm text-gray-400">Loading preview…</div>
            </div>
          )}
          {previewHtml && (
            <iframe
              srcDoc={previewHtml}
              title="Resume Preview"
              sandbox="allow-same-origin"
              className="w-full h-full border-none"
              style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '167%', height: '167%' }}
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDownload}>
            <Download size={14} /> Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
