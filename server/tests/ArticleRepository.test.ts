import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type AppDatabase } from '../src/db.js';
import { createArticleRepository, type ArticleRepository } from '../src/repositories/ArticleRepository.js';
import type { Article } from '../src/types.js';

function buildArticle(overrides: Partial<Article> = {}): Article {
  // Spread overrides last so an explicit `null` is respected (unlike `??`).
  return {
    id: 'id-1',
    title: 'Drone delivers package',
    description: 'A quadcopter delivery test',
    content: 'Full story about delivery drones',
    url: 'https://example.com/a',
    imageUrl: 'https://example.com/a.jpg',
    sourceName: 'Example News',
    author: 'Jane Doe',
    publishedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ArticleRepository', () => {
  let database: AppDatabase;
  let repository: ArticleRepository;

  beforeEach(() => {
    database = openDatabase({ databasePath: ':memory:' });
    repository = createArticleRepository(database);
  });

  afterEach(() => {
    database.$client.close();
  });

  it('inserts articles via upsertMany', () => {
    repository.upsertMany([buildArticle()]);

    const results = repository.findLatest();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'id-1', title: 'Drone delivers package' });
  });

  it('dedupes on url, updating the existing row instead of inserting', () => {
    repository.upsertMany([buildArticle({ title: 'Original title' })]);
    repository.upsertMany([buildArticle({ id: 'different-id', title: 'Updated title' })]);

    const results = repository.findLatest();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Updated title');
  });

  it('orders results by published_at descending', () => {
    repository.upsertMany([
      buildArticle({ id: 'old', url: 'https://example.com/old', publishedAt: '2026-01-01T00:00:00Z' }),
      buildArticle({ id: 'new', url: 'https://example.com/new', publishedAt: '2026-06-01T00:00:00Z' }),
      buildArticle({ id: 'mid', url: 'https://example.com/mid', publishedAt: '2026-03-01T00:00:00Z' }),
    ]);

    const orderedIds = repository.findLatest().map((article) => article.id);
    expect(orderedIds).toEqual(['new', 'mid', 'old']);
  });

  it('filters case-insensitively across title, description, and content', () => {
    repository.upsertMany([
      buildArticle({ id: 'in-title', url: 'https://example.com/1', title: 'QUADCOPTER news', description: null, content: null }),
      buildArticle({ id: 'in-desc', url: 'https://example.com/2', title: 'Other', description: 'About a Quadcopter', content: null }),
      buildArticle({ id: 'in-content', url: 'https://example.com/3', title: 'Other', description: null, content: 'mentions quadcopter here' }),
      buildArticle({ id: 'no-match', url: 'https://example.com/4', title: 'Unrelated', description: 'nothing', content: 'nothing' }),
    ]);

    const matchedIds = repository.findLatest({ query: 'quadcopter' }).map((article) => article.id).sort();
    expect(matchedIds).toEqual(['in-content', 'in-desc', 'in-title']);
  });

  it('AND-combines multiple query words', () => {
    repository.upsertMany([
      buildArticle({ id: 'both', url: 'https://example.com/both', title: 'Drone delivery launch', description: null, content: null }),
      buildArticle({ id: 'one', url: 'https://example.com/one', title: 'Drone surveillance', description: null, content: null }),
    ]);

    const matchedIds = repository.findLatest({ query: 'drone delivery' }).map((article) => article.id);
    expect(matchedIds).toEqual(['both']);
  });

  it('returns an empty array when nothing matches', () => {
    repository.upsertMany([buildArticle()]);
    expect(repository.findLatest({ query: 'helicopter' })).toEqual([]);
  });

  it('respects the limit', () => {
    repository.upsertMany(
      Array.from({ length: 5 }, (_unused, index) =>
        buildArticle({
          id: `id-${index}`,
          url: `https://example.com/${index}`,
          publishedAt: `2026-06-0${index + 1}T00:00:00Z`,
        }),
      ),
    );

    expect(repository.findLatest({ limit: 2 })).toHaveLength(2);
  });
});
