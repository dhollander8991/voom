import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { openDatabase, type AppDatabase } from '../src/db.js';
import { createArticleRepository, type ArticleRepository } from '../src/repositories/ArticleRepository.js';
import type { AuthorClient } from '../src/clients/AuthorClient.js';
import { createApp } from '../src/app.js';
import type { Article, AuthorInfo } from '../src/types.js';

function buildArticle(overrides: Partial<Article> = {}): Article {
  // Spread overrides last so an explicit `null` is respected (unlike `??`).
  return {
    id: 'id-1',
    title: 'Drone delivery launch',
    description: 'A delivery drone',
    content: 'content',
    url: 'https://example.com/a',
    imageUrl: null,
    sourceName: 'Example News',
    author: 'Jane Doe',
    publishedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

/** A fake AuthorClient that resolves to the given result. The endpoints don't
 * care how the summary is produced, so the Claude SDK is never involved here. */
function stubAuthorClient(result: AuthorInfo | null = null): AuthorClient {
  return { fetchSummary: vi.fn().mockResolvedValue(result) };
}

describe('API endpoints', () => {
  let database: AppDatabase;
  let articleRepository: ArticleRepository;

  function buildApp(authorClient: AuthorClient = stubAuthorClient()): Express {
    return createApp({ articleRepository, authorClient });
  }

  beforeEach(() => {
    database = openDatabase({ databasePath: ':memory:' });
    articleRepository = createArticleRepository(database);
  });

  afterEach(() => {
    database.$client.close();
  });

  describe('GET /api/health', () => {
    it('reports ok', async () => {
      const response = await request(buildApp()).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/news', () => {
    it('returns all stored articles with a total', async () => {
      articleRepository.upsertMany([
        buildArticle({ id: 'a', url: 'https://example.com/a' }),
        buildArticle({ id: 'b', url: 'https://example.com/b' }),
      ]);

      const response = await request(buildApp()).get('/api/news');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(response.body.articles).toHaveLength(2);
    });

    it('filters by the q parameter', async () => {
      articleRepository.upsertMany([
        buildArticle({ id: 'a', url: 'https://example.com/a', title: 'Drone delivery', description: null, content: null }),
        buildArticle({ id: 'b', url: 'https://example.com/b', title: 'Drone surveillance', description: null, content: null }),
      ]);

      const response = await request(buildApp()).get('/api/news').query({ q: 'delivery' });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.articles[0].id).toBe('a');
    });

    it('returns an empty list when nothing matches', async () => {
      articleRepository.upsertMany([buildArticle()]);

      const response = await request(buildApp()).get('/api/news').query({ q: 'helicopter' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ articles: [], total: 0, totalPages: 1 });
    });

    it('paginates with page and pageSize', async () => {
      articleRepository.upsertMany(
        Array.from({ length: 25 }, (_unused, index) =>
          buildArticle({ id: `id-${index}`, url: `https://example.com/${index}` }),
        ),
      );

      const response = await request(buildApp()).get('/api/news').query({ page: 2, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.articles).toHaveLength(10);
      expect(response.body).toMatchObject({ total: 25, page: 2, pageSize: 10, totalPages: 3 });
    });
  });

  describe('GET /api/authors', () => {
    it('returns the author under an envelope when found', async () => {
      const app = buildApp(stubAuthorClient({ name: 'Jane Doe', summary: 'A journalist.' }));

      const response = await request(app).get('/api/authors').query({ name: 'Jane Doe' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ author: { name: 'Jane Doe', summary: 'A journalist.' } });
    });

    it('returns 200 with author: null when nothing is found', async () => {
      const app = buildApp(stubAuthorClient(null));

      const response = await request(app).get('/api/authors').query({ name: 'Nobody' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ author: null });
    });

    it('returns 400 when name is missing', async () => {
      const response = await request(buildApp()).get('/api/authors');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
