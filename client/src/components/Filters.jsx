export function Select({ label, value, onChange, options, allLabel, id }) {
  return (
    <div className="min-w-40 flex-1 sm:flex-none">
      <label className="label" htmlFor={id || label.toLowerCase()}>
        {label}
      </label>
      <select id={id || label.toLowerCase()} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="w-full sm:max-w-xs">
      <label className="label" htmlFor="search">
        Search
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          id="search"
          className="input pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

/** Shared shell for the filter rows used by every complaint list. */
export function FilterBar({ children, onReset, showReset }) {
  return (
    <div className="card mb-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        {children}
        {showReset && (
          <button type="button" className="btn-ghost mb-0.5" onClick={onReset}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
