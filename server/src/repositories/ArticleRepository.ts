import { and, desc, like, or, sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db.js';
import type { Article } from '../types.js';
import { articles } from '../schema.js';

export interface FindLatestOptions {
  query?: string;
  limit?: number;
}

/** Domain API over the articles table. Returned by {@link createArticleRepository}. */
export interface ArticleRepository {
  upsertMany(incoming: Article[]): void;
  findLatest(options?: FindLatestOptions): Article[];
}

const DEFAULT_LIMIT = 100;

/** Strips the storage-only `fetchedAt` column off a row to yield a plain
 * Article. Drizzle already maps snake_case columns to camelCase fields. */
function rowToArticle(row: typeof articles.$inferSelect): Article {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    url: row.url,
    imageUrl: row.imageUrl,
    sourceName: row.sourceName,
    author: row.author,
    publishedAt: row.publishedAt,
  };
}

/**
 * Creates the article repository over an existing Drizzle handle. Injectable:
 * tests pass an in-memory database, and it owns no connection lifecycle of its
 * own.
 */
export function createArticleRepository(database: AppDatabase): ArticleRepository {
  return {
    /**
     * Inserts or updates the given articles, deduping on url. An article seen
     * again (same url) refreshes its mutable fields rather than creating a
     * duplicate row. Runs as a single statement; the id is never overwritten so
     * an article's stable handle survives updates.
     */
    upsertMany(incoming: Article[]): void {
      if (incoming.length === 0) {
        return;
      }

      const fetchedAt = new Date().toISOString();
      const rows = incoming.map((article) => ({ ...article, fetchedAt }));

      database
        .insert(articles)
        .values(rows)
        .onConflictDoUpdate({
          target: articles.url,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            content: sql`excluded.content`,
            imageUrl: sql`excluded.image_url`,
            sourceName: sql`excluded.source_name`,
            author: sql`excluded.author`,
            publishedAt: sql`excluded.published_at`,
            fetchedAt: sql`excluded.fetched_at`,
          },
        })
        .run();
    },

    /**
     * Returns the most recent articles, newest first. When `query` is provided,
     * results are filtered with a case-insensitive LIKE across title,
     * description, and content; multiple words are AND-combined so every word
     * must appear somewhere in those fields.
     */
    findLatest({ query, limit = DEFAULT_LIMIT }: FindLatestOptions = {}): Article[] {
      const words = (query ?? '')
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);

      // Each word must appear in at least one searched column (OR within a
      // word), and every word must match (AND across words). SQLite's LIKE is
      // case-insensitive for ASCII, which is the behavior we want.
      const wordConditions: SQL[] = words.map((word) => {
        const pattern = `%${word}%`;
        return or(
          like(articles.title, pattern),
          like(articles.description, pattern),
          like(articles.content, pattern),
        ) as SQL;
      });

      const rows = database
        .select()
        .from(articles)
        .where(wordConditions.length > 0 ? and(...wordConditions) : undefined)
        .orderBy(desc(articles.publishedAt))
        .limit(limit)
        .all();

      return rows.map(rowToArticle);
    },
  };
}
