const Star = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" strokeLinejoin="round" />
  </svg>
);

export function RatingDisplay({ value, showEmpty = false }) {
  if (!value && !showEmpty) return <span className="text-sm text-slate-400">No rating yet</span>;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" title={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} />
      ))}
      <span className="ml-1 text-sm font-medium text-slate-600">{value}/5</span>
    </span>
  );
}

export function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating out of five">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className={`rounded p-0.5 transition ${value >= n ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'}`}
        >
          <Star filled={value >= n} />
        </button>
      ))}
    </div>
  );
}
