import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The articles table — the typed source of truth for all queries in
 * {@link ArticleRepository}. The runtime DDL that actually creates this table
 * lives in `db.ts`; keep the two in sync (one table, so no migration tooling).
 *
 * Columns without `.notNull()` are nullable and infer as `string | null`,
 * matching the optional fields on the shared `Article` type.
 */
export const articles = sqliteTable(
  'articles',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    content: text('content'),
    url: text('url').notNull().unique(),
    imageUrl: text('image_url'),
    sourceName: text('source_name').notNull(),
    author: text('author'),
    publishedAt: text('published_at').notNull(),
    fetchedAt: text('fetched_at').notNull(),
  },
  (table) => [index('idx_articles_published_at').on(table.publishedAt)],
);
