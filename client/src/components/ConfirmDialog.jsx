import { useEffect, useRef, useState } from 'react';
import { Spinner } from './Spinner.jsx';

/**
 * Blocking confirm used for destructive actions. The caller supplies the async
 * work so the dialog can keep its own pending state and disable both buttons.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  requireReason,
  reasonLabel = 'Reason',
  onCancel,
  onConfirm,
}) {
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setPending(false);
      setReason('');
      setTouched(false);
      return undefined;
    }
    cancelRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && !pending && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  const reasonMissing = Boolean(requireReason) && reason.trim().length < 3;

  const handleConfirm = async () => {
    setTouched(true);
    if (reasonMissing) return;
    setPending(true);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      onCancel();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="card w-full max-w-md p-6">
        <h2 id="confirm-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}

        {requireReason && (
          <div className="mt-4">
            <label className="label" htmlFor="confirm-reason">
              {reasonLabel}
            </label>
            <textarea
              id="confirm-reason"
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Recorded on the complaint audit trail"
            />
            {touched && reasonMissing && (
              <p className="mt-1 text-xs text-rose-600">Please give a reason of at least 3 characters.</p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Spinner size="sm" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
