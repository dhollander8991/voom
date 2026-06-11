import type { Article, AuthorInfo } from '../types';

/** A page of news plus pagination metadata, mirroring the backend response. */
export interface NewsPage {
  articles: Article[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FetchNewsOptions {
  query?: string;
  page?: number;
}

interface AuthorResponse {
  author: AuthorInfo | null;
}

// When VITE_API_URL is unset we hit the relative /api path and let the Vite dev
// proxy forward to the backend. A deployed client sets VITE_API_URL explicitly.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/**
 * Fetches one page of news, optionally filtered by a search query. Returns the
 * page plus pagination metadata. Throws on non-2xx so callers can render an
 * error state.
 */
export async function fetchNews({ query, page = 1 }: FetchNewsOptions = {}): Promise<NewsPage> {
  const url = new URL(buildUrl('/api/news'), window.location.origin);
  if (query && query.trim().length > 0) {
    url.searchParams.set('q', query.trim());
  }
  url.searchParams.set('page', String(page));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to load news (status ${response.status})`);
  }

  return (await response.json()) as NewsPage;
}

/**
 * Fetches author information from the backend. Returns null when the lookup
 * found nothing (a 200 with `author: null`); throws on request failures.
 */
export async function fetchAuthor(name: string): Promise<AuthorInfo | null> {
  const url = new URL(buildUrl('/api/authors'), window.location.origin);
  url.searchParams.set('name', name);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to load author (status ${response.status})`);
  }

  const data = (await response.json()) as AuthorResponse;
  return data.author;
}
