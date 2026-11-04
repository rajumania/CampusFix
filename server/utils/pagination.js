import ApiError from './ApiError.js';

const MAX_LIMIT = 100;

/**
 * Reads `page`/`limit` from the query string and rejects anything non-numeric,
 * because `skip: NaN` is silently ignored by MongoDB and would hide bugs.
 */
export function getPagination(query = {}) {
  const pageRaw = query.page ?? '1';
  const limitRaw = query.limit ?? '10';

  const page = Number(pageRaw);
  const limit = Number(limitRaw);

  if (!Number.isInteger(page) || page < 1) {
    throw ApiError.badRequest('`page` must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw ApiError.badRequest('`limit` must be a positive integer');
  }

  const safeLimit = Math.min(limit, MAX_LIMIT);
  return { page, limit: safeLimit, skip: (page - 1) * safeLimit };
}

export function buildPageMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}

// User-supplied text goes into a RegExp, so metacharacters must be neutralised.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Turns "2026-01-01" into the [start, end) window used for date filters. */
export function parseDateRange(query = {}) {
  const range = {};
  if (query.dateFrom) {
    const from = new Date(`${query.dateFrom}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime())) throw ApiError.badRequest('Invalid `dateFrom`');
    range.$gte = from;
  }
  if (query.dateTo) {
    const to = new Date(`${query.dateTo}T23:59:59.999Z`);
    if (Number.isNaN(to.getTime())) throw ApiError.badRequest('Invalid `dateTo`');
    range.$lte = to;
  }
  return Object.keys(range).length ? range : null;
}
