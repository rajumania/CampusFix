export function Pagination({ page, onPageChange }) {
  const { page: current = 1, totalPages = 1, total = 0, hasNextPage, hasPrevPage } = page || {};
  if (totalPages <= 1) return null;

  // Show a window of page numbers around the current page rather than every page.
  const window = [];
  for (let n = Math.max(1, current - 2); n <= Math.min(totalPages, current + 2); n += 1) window.push(n);

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-xs text-slate-500">
        Page {current} of {totalPages} · {total} record{total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5"
          disabled={!hasPrevPage}
          onClick={() => onPageChange(current - 1)}
        >
          Prev
        </button>
        {window.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            aria-current={n === current ? 'page' : undefined}
            className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
              n === current ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="btn-secondary px-3 py-1.5"
          disabled={!hasNextPage}
          onClick={() => onPageChange(current + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
