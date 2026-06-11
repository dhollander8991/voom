import type { Article, AuthorInfo } from '../types';

interface NewsResponse {
  articles: Article[];
  total: number;
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
 * Fetches the latest news articles, optionally filtered by a search query.
 * Throws on non-2xx responses so callers can render an error state.
 */
export async function fetchNews(query?: string): Promise<Article[]> {
  const url = new URL(buildUrl('/api/news'), window.location.origin);
  if (query && query.trim().length > 0) {
    url.searchParams.set('q', query.trim());
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to load news (status ${response.status})`);
  }

  const data = (await response.json()) as NewsResponse;
  return data.articles;
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
