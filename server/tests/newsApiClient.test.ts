import { describe, expect, it, vi } from 'vitest';
import { createNewsApiClient } from '../src/clients/newsApiClient.js';
import { hashUrl } from '../src/utils/hash.js';

interface RawArticleOverrides {
  url?: string | null;
  title?: string | null;
  urlToImage?: string | null;
  sourceName?: string | null;
}

function buildRawArticle(overrides: RawArticleOverrides = {}) {
  return {
    source: { id: null, name: overrides.sourceName === undefined ? 'Example News' : overrides.sourceName },
    author: 'Jane Doe',
    title: overrides.title ?? 'Drone story',
    description: 'A description',
    url: overrides.url === undefined ? 'https://example.com/a' : overrides.url,
    urlToImage: overrides.urlToImage === undefined ? 'https://example.com/a.jpg' : overrides.urlToImage,
    publishedAt: '2026-06-01T00:00:00Z',
    content: 'Full content',
  };
}

function mockFetchResponse(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe('NewsApiClient', () => {
  it('requests the everything endpoint with the expected params and key header', async () => {
    const fetchImplementation = mockFetchResponse({ status: 'ok', articles: [] });
    const client = createNewsApiClient({ apiKey: 'secret-key', fetchImplementation });

    await client.fetchEverything();

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = (fetchImplementation as ReturnType<typeof vi.fn>).mock.calls[0];

    const parsedUrl = new URL(calledUrl as string);
    expect(parsedUrl.origin + parsedUrl.pathname).toBe('https://newsapi.org/v2/everything');
    expect(parsedUrl.searchParams.get('q')).toBe('drone OR drones');
    expect(parsedUrl.searchParams.get('language')).toBe('en');
    expect(parsedUrl.searchParams.get('sortBy')).toBe('publishedAt');
    expect(parsedUrl.searchParams.get('pageSize')).toBe('100');
    expect((calledOptions as RequestInit).headers).toMatchObject({ 'X-Api-Key': 'secret-key' });
  });

  it('normalizes raw articles into the Article shape', async () => {
    const fetchImplementation = mockFetchResponse({
      status: 'ok',
      articles: [buildRawArticle()],
    });
    const client = createNewsApiClient({ apiKey: 'k', fetchImplementation });

    const [article] = await client.fetchEverything();

    expect(article).toEqual({
      id: hashUrl('https://example.com/a'),
      title: 'Drone story',
      description: 'A description',
      content: 'Full content',
      url: 'https://example.com/a',
      imageUrl: 'https://example.com/a.jpg',
      sourceName: 'Example News',
      author: 'Jane Doe',
      publishedAt: '2026-06-01T00:00:00Z',
    });
  });

  it('derives a stable id by hashing the url', async () => {
    const fetchImplementation = mockFetchResponse({
      status: 'ok',
      articles: [buildRawArticle({ url: 'https://example.com/stable' })],
    });
    const client = createNewsApiClient({ apiKey: 'k', fetchImplementation });

    const [article] = await client.fetchEverything();
    expect(article.id).toBe(hashUrl('https://example.com/stable'));
  });

  it('drops articles that have no url', async () => {
    const fetchImplementation = mockFetchResponse({
      status: 'ok',
      articles: [buildRawArticle({ url: null }), buildRawArticle({ url: 'https://example.com/keep' })],
    });
    const client = createNewsApiClient({ apiKey: 'k', fetchImplementation });

    const articles = await client.fetchEverything();
    expect(articles).toHaveLength(1);
    expect(articles[0].url).toBe('https://example.com/keep');
  });

  it('falls back gracefully for missing image and source', async () => {
    const fetchImplementation = mockFetchResponse({
      status: 'ok',
      articles: [buildRawArticle({ urlToImage: null, sourceName: null })],
    });
    const client = createNewsApiClient({ apiKey: 'k', fetchImplementation });

    const [article] = await client.fetchEverything();
    expect(article.imageUrl).toBeNull();
    expect(article.sourceName).toBe('Unknown source');
  });

  it('throws on a non-200 response', async () => {
    const fetchImplementation = mockFetchResponse({ status: 'error' }, 429);
    const client = createNewsApiClient({ apiKey: 'k', fetchImplementation });

    await expect(client.fetchEverything()).rejects.toThrow(/429/);
  });

  it('returns an empty array for a malformed payload', async () => {
    const fetchImplementation = mockFetchResponse({ status: 'error', message: 'rateLimited' });
    const client = createNewsApiClient({ apiKey: 'k', fetchImplementation });

    await expect(client.fetchEverything()).resolves.toEqual([]);
  });
});
