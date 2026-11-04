import { getMessage } from '../services/api.js';

export function EmptyState({ title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <p className="font-semibold text-rose-800">Could not load this view</p>
      <p className="max-w-prose text-sm text-rose-700">
        {typeof error === 'string' ? error : getMessage(error)}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary">
          Try again
        </button>
      )}
    </div>
  );
}
