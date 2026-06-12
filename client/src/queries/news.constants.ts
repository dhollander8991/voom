import type { SortOrder } from '@voom/shared';

/**
 * React Query key factories — the single source of truth for cache keys, so the
 * hooks (and any future invalidation) can't drift on key shape.
 */
export const newsKeys = {
  list: ({ query, page, sort }: { query: string; page: number; sort: SortOrder }) =>
    ['news', query, page, sort] as const,
};

export const authorKeys = {
  detail: (name: string | null) => ['author', name] as const,
};
