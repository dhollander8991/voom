import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchAuthor } from '../lib/api';
import type { AuthorInfo } from '../types';

export interface UseAuthorOptions {
  /** Author name to look up, or null when the modal is closed. */
  name: string | null;
}

/**
 * Loads author info when `name` is set (i.e. the modal is open). The query is
 * disabled while closed, so nothing is fetched until an author is clicked. A
 * successful lookup with no Wikipedia match resolves to null, which the modal
 * renders as its "no info" fallback.
 */
export function useAuthor({ name }: UseAuthorOptions): UseQueryResult<AuthorInfo | null> {
  return useQuery({
    queryKey: ['author', name],
    queryFn: () => fetchAuthor(name as string),
    enabled: name !== null,
  });
}
