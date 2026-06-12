import type { Article } from '@voom/shared';
import { hashUrl } from '../utils/hash.js';

const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/everything';

/** Shape of a single article as returned by NewsAPI's /v2/everything. */
interface NewsApiArticle {
  source: { id: string | null; name: string | null } | null;
  author: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  urlToImage: string | null;
  publishedAt: string | null;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults?: number;
  articles?: NewsApiArticle[];
}

interface NewsApiClientOptions {
  apiKey: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImplementation?: typeof fetch;
}

interface FetchEverythingOptions {
  /** NewsAPI query string. Defaults to drone coverage. */
  query?: string;
  pageSize?: number;
}

const DEFAULT_QUERY = 'drone OR drones';
const DEFAULT_PAGE_SIZE = 100;

/**
 * Maps a raw NewsAPI article onto our normalized {@link Article} shape, or
 * returns null when the record lacks a url (without one we cannot derive a
 * stable id or link to it).
 */
function normalizeArticle(raw: NewsApiArticle): Article | null {
  if (!raw.url) {
    return null;
  }

  return {
    id: hashUrl(raw.url),
    title: raw.title ?? 'Untitled',
    description: raw.description ?? null,
    content: raw.content ?? null,
    url: raw.url,
    imageUrl: raw.urlToImage ?? null,
    sourceName: raw.source?.name ?? 'Unknown source',
    author: raw.author ?? null,
    publishedAt: raw.publishedAt ?? new Date().toISOString(),
  };
}

/** Client over NewsAPI's /v2/everything endpoint. Returned by {@link createNewsApiClient}. */
export interface NewsApiClient {
  fetchEverything(options?: FetchEverythingOptions): Promise<Article[]>;
}

/**
 * Creates a thin client over NewsAPI's /v2/everything endpoint. Sends the key
 * via the `X-Api-Key` header (keeps it out of url logs) and returns normalized
 * articles.
 */
export function createNewsApiClient({
  apiKey,
  fetchImplementation = fetch,
}: NewsApiClientOptions): NewsApiClient {
  return {
    async fetchEverything({
      query = DEFAULT_QUERY,
      pageSize = DEFAULT_PAGE_SIZE,
    }: FetchEverythingOptions = {}): Promise<Article[]> {
      const url = new URL(NEWS_API_ENDPOINT);
      url.searchParams.set('q', query);
      url.searchParams.set('language', 'en');
      url.searchParams.set('sortBy', 'publishedAt');
      url.searchParams.set('pageSize', String(pageSize));

      const response = await fetchImplementation(url.toString(), {
        headers: { 'X-Api-Key': apiKey },
      });

      if (!response.ok) {
        throw new Error(`NewsAPI request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as NewsApiResponse;
      if (!Array.isArray(payload.articles)) {
        // A malformed or error payload (e.g. { status: 'error' }) should not
        // crash the poller; treat it as "no articles this round".
        return [];
      }

      return payload.articles
        .map(normalizeArticle)
        .filter((article): article is Article => article !== null);
    },
  };
}
