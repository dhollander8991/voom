import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchNews } from '../lib/api';
import type { Article } from '../types';

export interface UseNewsOptions {
  query: string;
}

/**
 * Loads news for the given query. React Query keys the cache on the query, so
 * switching back to a previous search is instant, and `keepPreviousData` keeps
 * the current grid visible while the next search loads instead of flashing
 * skeletons on every keystroke.
 */
export function useNews({ query }: UseNewsOptions): UseQueryResult<Article[]> {
  return useQuery({
    queryKey: ['news', query],
    queryFn: () => fetchNews(query),
    placeholderData: keepPreviousData,
  });
}
