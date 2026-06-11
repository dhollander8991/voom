import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchNews, type NewsPage } from '../lib/api';

export interface UseNewsOptions {
  query: string;
  page: number;
}

/**
 * Loads one page of news for the given query. React Query keys the cache on
 * (query, page), so revisiting a page is instant, and `keepPreviousData` keeps
 * the current grid visible while the next page/search loads instead of flashing
 * skeletons.
 */
export function useNews({ query, page }: UseNewsOptions): UseQueryResult<NewsPage> {
  return useQuery({
    queryKey: ['news', query, page],
    queryFn: () => fetchNews({ query, page }),
    placeholderData: keepPreviousData,
  });
}
