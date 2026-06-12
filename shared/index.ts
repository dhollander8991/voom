/**
 * Shared API-contract types used by BOTH the server and the client.
 * This is the single source of truth — change a shape here and both sides
 * update. Consumed type-only, so there's no runtime dependency.
 */

/** A normalized news article (the core server↔client contract). */
export interface Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  imageUrl: string | null;
  sourceName: string;
  author: string | null;
  publishedAt: string;
}

/** A short, Claude-generated summary of a news author. */
export interface AuthorInfo {
  name: string;
  summary: string;
}

/** Sort order for the news feed. */
export type SortOrder = 'newest' | 'oldest';

/** A page of articles plus pagination metadata (the `/api/news` response). */
export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
