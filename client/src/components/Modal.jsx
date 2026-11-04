import { useEffect } from 'react';

export function Modal({ open, title, description, onClose, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`card w-full ${width} my-8 p-6`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-2 py-1" aria-label="Close dialog">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
