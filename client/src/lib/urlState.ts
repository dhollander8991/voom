import type { SortOrder } from '@voom/shared';

/** The feed state that's reflected in the URL so views are shareable. */
interface NewsUrlState {
  query: string;
  page: number;
  sort: SortOrder;
}

/**
 * Parses the feed state from a URL query string (e.g. `window.location.search`).
 * Invalid/missing values fall back to defaults, so a hand-edited or stale URL
 * never breaks the app.
 */
export function parseNewsParams(search: string): NewsUrlState {
  const params = new URLSearchParams(search);

  const query = params.get('q') ?? '';
  const parsedPage = Number(params.get('page'));
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;
  const sort: SortOrder = params.get('sort') === 'oldest' ? 'oldest' : 'newest';

  return { query, page, sort };
}

/**
 * Builds a URL query string from feed state, omitting defaults (no `q` when
 * empty, no `page` on page 1, no `sort` when newest) so shared URLs stay clean.
 * Returns '' when everything is at its default.
 */
export function buildNewsSearch({ query, page, sort }: NewsUrlState): string {
  const params = new URLSearchParams();
  if (query.trim().length > 0) {
    params.set('q', query.trim());
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  if (sort !== 'newest') {
    params.set('sort', sort);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}
