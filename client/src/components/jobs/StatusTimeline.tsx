import { useState, useEffect } from 'react';
import { Pencil, Trash2, ArrowRight, Clock } from 'lucide-react';
import { JobStatusHistory } from '../../types';
import { updateStatusHistoryNote, deleteStatusHistoryEntry } from '../../api/jobs';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface Props {
  jobId: string;
  entries: JobStatusHistory[];
  onEntriesChange: (entries: JobStatusHistory[]) => void;
}

interface EntryRowProps {
  jobId: string;
  entry: JobStatusHistory;
  onUpdated: (updated: JobStatusHistory) => void;
  onDeleted: (id: string) => void;
}

function EntryRow({ jobId, entry, onUpdated, onDeleted }: EntryRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(entry.note ?? '');
  const [savingNote, setSavingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync local note value if parent entry changes
  useEffect(() => { setNoteValue(entry.note ?? ''); }, [entry.note]);

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const updated = await updateStatusHistoryNote(jobId, entry.id, noteValue.trim() || null);
      onUpdated({ ...entry, note: updated.note });
      setEditingNote(false);
    } finally { setSavingNote(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStatusHistoryEntry(jobId, entry.id);
      onDeleted(entry.id);
    } finally { setDeleting(false); }
  };

  const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">{entry.fromStatus}</span>
          <ArrowRight size={13} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900">{entry.toStatus}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            title="Edit note"
            onClick={() => { setEditingNote(true); setConfirmDelete(false); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <Pencil size={13} />
          </button>
          <button
            title="Delete entry"
            onClick={() => { setConfirmDelete(true); setEditingNote(false); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
        <Clock size={11} />
        {date} at {time}
      </div>

      {/* Existing note (read mode) */}
      {entry.note && !editingNote && (
        <p className="mt-2 text-xs text-gray-600 italic border-l-2 border-gray-200 pl-2">
          {entry.note}
        </p>
      )}

      {/* Note edit form */}
      {editingNote && (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={3}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Add a note about this change… (leave empty to clear)"
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditingNote(false); setNoteValue(entry.note ?? ''); } }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveNote} loading={savingNote}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => { setEditingNote(false); setNoteValue(entry.note ?? ''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
          <p className="text-xs text-red-700 mb-2">Remove this status change from history?</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleDelete} loading={deleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
              Confirm
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusTimeline({ jobId, entries, onEntriesChange }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-6">
        No status changes recorded yet. Status changes will appear here.
      </p>
    );
  }

  const handleUpdated = (updated: JobStatusHistory) => {
    onEntriesChange(entries.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleDeleted = (id: string) => {
    onEntriesChange(entries.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          jobId={jobId}
          entry={entry}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  );
}
