import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { complaintApi } from '../services/endpoints.js';
import { useApi } from '../hooks/useApi.js';
import { PageHeader } from './StatCard.jsx';
import { FilterBar, SearchBox, Select } from './Filters.jsx';
import { ComplaintTable } from './ComplaintTable.jsx';
import { Pagination } from './Pagination.jsx';
import { EmptyState, ErrorState } from './States.jsx';
import { PageSkeleton } from './Spinner.jsx';
import { CATEGORIES, PRIORITIES, STATUSES } from '../utils/constants.js';

const STATUS_OPTIONS = Object.entries(STATUSES).map(([value, meta]) => ({ value, label: meta.label }));
const PRIORITY_OPTIONS = PRIORITIES;

/**
 * One list component for all three roles - the API already scopes rows by role,
 * so only the column set and the default filter differ between pages.
 */
export function ComplaintList({ variant, title, description, action, defaultStatus = '', baseQuery }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: '', priority: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);

  // Status lives in the URL only, so a deep link like
  // /admin/complaints?status=pending is pre-filtered without duplicated state.
  const status = searchParams.get('status') || defaultStatus;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const setFilter = (key) => (value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const setStatus = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const params = useMemo(() => {
    const query = { page, limit: 10, ...baseQuery };
    if (status) query.status = status;
    if (search) query.search = search;
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query[key] = value;
    });
    return query;
  }, [filters, page, baseQuery, status, search]);

  const { data, error, loading, refresh } = useApi(
    () => complaintApi.list(params),
    JSON.stringify(params)
  );

  const activeFilterCount =
    Object.values(filters).filter(Boolean).length + (search ? 1 : 0) + (status ? 1 : 0);

  const clearFilters = () => {
    setFilters({ category: '', priority: '', dateFrom: '', dateTo: '' });
    setSearchDraft('');
    setSearch('');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const complaints = data?.complaints || [];

  return (
    <>
      <PageHeader title={title} description={description} actions={action} />

      <FilterBar onReset={clearFilters} showReset={activeFilterCount > 0}>
        <SearchBox value={searchDraft} onChange={setSearchDraft} placeholder="Search title, description or location" />
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          allLabel="All statuses"
        />
        <Select
          label="Category"
          value={filters.category}
          onChange={setFilter('category')}
          options={CATEGORIES}
          allLabel="All categories"
        />
        <Select
          label="Priority"
          value={filters.priority}
          onChange={setFilter('priority')}
          options={PRIORITY_OPTIONS}
          allLabel="Any priority"
        />
        <div className="flex items-end gap-2">
          <div>
            <label className="label" htmlFor="dateFrom">
              From
            </label>
            <input
              id="dateFrom"
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom')(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="dateTo">
              To
            </label>
            <input
              id="dateTo"
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo')(e.target.value)}
            />
          </div>
        </div>
      </FilterBar>

      {loading ? (
        <PageSkeleton rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : complaints.length === 0 ? (
        <EmptyState
          title={activeFilterCount ? 'No complaints match these filters' : 'No complaints yet'}
          description={
            activeFilterCount
              ? 'Try widening the date range or clearing a filter.'
              : 'Nothing has been reported in this view so far.'
          }
          action={
            activeFilterCount ? (
              <button type="button" className="btn-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <ComplaintTable complaints={complaints} variant={variant} />
          <Pagination page={data.page} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
