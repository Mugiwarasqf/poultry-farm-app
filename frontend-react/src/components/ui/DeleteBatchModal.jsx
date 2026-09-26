import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

/**
 * DeleteBatchModal
 * High-tier enterprise confirmation modal for permanently deleting a poultry batch.
 * Features:
 * - Backdrop blur + escape to close
 * - Clear warning callout showing affected data (birds, feed, vaccines)
 * - Name-matching verification to prevent accidental clicks
 * - Loading spinner & disabled state during execution
 */
export function DeleteBatchModal({ open, batch, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state whenever modal opens or batch changes
  useEffect(() => {
    if (open) {
      setConfirmText('');
      setIsDeleting(false);
      setError(null);
    }
  }, [open, batch]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open && !isDeleting) {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, isDeleting, onClose]);

  if (!open || !batch) return null;

  const batchName = batch.name || 'Untitled Batch';
  const isNameMatch = confirmText.trim().toLowerCase() === batchName.trim().toLowerCase();
  const birdCount = Number(batch.currentBirds ?? batch.birdCount ?? 0);

  const handleDelete = async () => {
    if (!isNameMatch || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(batch.batchId);
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err?.message || 'Failed to delete batch. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-batch-title"
    >
      {/* Blurred dark backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => !isDeleting && onClose()}
      />

      {/* Modal Dialog */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-stone-200/90 max-w-md w-full p-6 sm:p-7 space-y-5 animate-slide-up z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close button & Warning Icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 id="delete-batch-title" className="text-lg font-bold text-stone-950 font-heading">
                Delete Batch
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Permanent and irreversible action
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Callout Box */}
        <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            <span>You are about to delete "{batchName}"</span>
          </div>
          <p className="text-xs text-rose-800/90 leading-relaxed">
            This will permanently remove this batch along with:
          </p>
          <ul className="text-xs text-rose-800 space-y-1 list-disc list-inside font-medium pl-1">
            <li><strong>{birdCount.toLocaleString()} birds</strong> in this flock record</li>
            <li>All daily mortality, feed, and egg logs</li>
            <li>All scheduled & completed vaccination records</li>
          </ul>
        </div>

        {/* Name Verification Field */}
        <div className="space-y-2">
          <label htmlFor="batch-confirm-input" className="block text-xs font-semibold text-stone-700">
            Please type <span className="font-bold text-stone-950 select-all font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">{batchName}</span> to confirm:
          </label>
          <input
            id="batch-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
            placeholder={batchName}
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium"
            autoComplete="off"
            autoFocus
          />
        </div>

        {/* Error message if any */}
        {error && (
          <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs font-semibold text-rose-800">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isNameMatch || isDeleting}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer ${
              isNameMatch && !isDeleting
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/20'
                : 'bg-rose-300 cursor-not-allowed opacity-60'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Deleting batch…</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Permanently Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteBatchModal;
