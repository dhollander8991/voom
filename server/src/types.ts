/**
 * A normalized news article. This shape is the contract between the backend
 * and the frontend — the client mirrors it exactly in its own `types.ts`.
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

/**
 * Author information for the author modal: a short, Claude-generated summary of
 * who the author is.
 */
export interface AuthorInfo {
  name: string;
  summary: string;
}
