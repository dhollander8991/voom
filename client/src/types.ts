/**
 * Shared domain types. These mirror the backend's `server/src/types.ts`
 * exactly — the two must stay in sync since they form the API contract.
 */

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

export interface AuthorInfo {
  name: string;
  summary: string;
}
