import { and, asc, desc, like, or, sql, type SQL } from 'drizzle-orm';
import type { AppDatabase } from '../db.js';
import type { Article, PaginatedArticles, SortOrder } from '@voom/shared';
import { articles } from '../schema.js';

interface FindLatestOptions {
  query?: string;
  page?: number;
  pageSize?: number;
  sort?: SortOrder;
}

/** Domain API over the articles table. Returned by {@link createArticleRepository}. */
export interface ArticleRepository {
  upsertMany(incoming: Article[]): void;
  findLatest(options?: FindLatestOptions): PaginatedArticles;
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

/**
 * Builds the search WHERE clause shared by the page query and the count query.
 * Each word must appear in at least one searched column (OR within a word), and
 * every word must match (AND across words). SQLite's LIKE is case-insensitive
 * for ASCII, which is the behavior we want. Returns undefined for no filter.
 */
function buildSearchCondition(query?: string): SQL | undefined {
  const words = (query ?? '')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return undefined;
  }

  const wordConditions = words.map((word) => {
    const pattern = `%${word}%`;
    return or(
      like(articles.title, pattern),
      like(articles.description, pattern),
      like(articles.content, pattern),
    ) as SQL;
  });

  return and(...wordConditions);
}

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
     * Returns one page of the most recent articles (newest first), plus the
     * total matching count so the client can render pagination. When `query` is
     * provided, results are filtered with a case-insensitive multi-word AND
     * search across title, description, and content.
     */
    findLatest({
      query,
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      sort = 'newest',
    }: FindLatestOptions = {}): PaginatedArticles {
      const safePage = Math.max(1, Math.floor(page));
      const safePageSize = Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE);
      const where = buildSearchCondition(query);
      const orderBy = sort === 'oldest' ? asc(articles.publishedAt) : desc(articles.publishedAt);

      // Total across all pages — needed to compute totalPages. Counted with the
      // same WHERE so the count matches what the page query filters.
      const totalRow = database
        .select({ value: sql<number>`count(*)` })
        .from(articles)
        .where(where)
        .get();
      const total = totalRow?.value ?? 0;

      const rows = database
        .select()
        .from(articles)
        .where(where)
        .orderBy(orderBy)
        .limit(safePageSize)
        .offset((safePage - 1) * safePageSize)
        .all();

      return {
        articles: rows.map(rowToArticle),
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      };
    },
  };
}
