export function StatCard({ label, value, hint, tone = 'brand', icon }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="card flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value ?? 0}</p>
        {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
      </div>
      {icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
