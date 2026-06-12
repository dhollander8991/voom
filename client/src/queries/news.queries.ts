import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiQuery } from '../lib/api';
import { authorKeys, newsKeys } from './news.constants';
import type { AuthorInfo, PaginatedArticles, SortOrder } from '@voom/shared';

interface UseNewsOptions {
  query: string;
  page: number;
  sort: SortOrder;
}

/**
 * Loads one page of news for the given query and sort. React Query keys the
 * cache on (query, page, sort), so revisiting a view is instant, and
 * `keepPreviousData` keeps the current grid visible while the next page/search
 * loads instead of flashing skeletons.
 */
export function useNews({ query, page, sort }: UseNewsOptions): UseQueryResult<PaginatedArticles> {
  return useQuery({
    queryKey: newsKeys.list({ query, page, sort }),
    queryFn: () =>
      apiQuery<PaginatedArticles>('/api/news', {
        q: query.trim() || undefined,
        page,
        // Omit the default so shared URLs/keys stay clean.
        sort: sort === 'newest' ? undefined : sort,
      }),
    placeholderData: keepPreviousData,
  });
}

/** The /api/authors envelope. */
interface AuthorResponse {
  author: AuthorInfo | null;
}

interface UseAuthorOptions {
  /** Author name to look up, or null when the modal is closed. */
  name: string | null;
}

/**
 * Loads author info when `name` is set (i.e. the modal is open). The query is
 * disabled while closed, so nothing is fetched until an author is clicked. A
 * successful lookup with no match resolves to null, which the modal renders as
 * its "no info" fallback.
 */
export function useAuthor({ name }: UseAuthorOptions): UseQueryResult<AuthorInfo | null> {
  return useQuery({
    queryKey: authorKeys.detail(name),
    queryFn: async () => {
      const { author } = await apiQuery<AuthorResponse>('/api/authors', { name: name ?? '' });
      return author;
    },
    enabled: name !== null,
  });
}
