export function Spinner({ size = 'md', label = 'Loading' }) {
  const dim = { sm: 'h-4 w-4 border-2', md: 'h-7 w-7 border-2', lg: 'h-10 w-10 border-[3px]' }[size];
  return (
    <span className="inline-flex items-center gap-2 text-slate-500" role="status" aria-live="polite">
      <span className={`${dim} animate-spin rounded-full border-brand-600 border-t-transparent`} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card h-14 animate-pulse bg-slate-50" />
      ))}
    </div>
  );
}
