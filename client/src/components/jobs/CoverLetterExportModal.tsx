import { Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface CoverLetterExportModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
}

export function CoverLetterExportModal({ open, onClose, jobId }: CoverLetterExportModalProps) {
  const handleDownload = () => {
    window.open(`/api/jobs/${jobId}/cover-letter/pdf`, '_blank');
  };

  return (
    <Modal open={open} onClose={onClose} title="Export Cover Letter">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Your cover letter will be exported as a professionally formatted PDF.
        </p>
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
