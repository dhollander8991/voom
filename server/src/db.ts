import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

/**
 * A Drizzle database handle bound to our schema. Derived from `drizzle()`'s
 * return type so it includes `$client` (the underlying better-sqlite3
 * connection, used to `.close()` in tests) — the `BetterSQLite3Database` class
 * alone does not expose it.
 */
export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

interface OpenDatabaseOptions {
  databasePath: string;
}

// Bootstrap DDL for the single articles table. This mirrors the typed Drizzle
// definition in schema.ts (which drives all queries) — keep the two in sync.
// `IF NOT EXISTS` makes it idempotent, so it's safe to run on every startup and
// on the fresh in-memory databases the tests use. The data is a disposable
// cache (re-fetchable from NewsAPI), so a single bootstrap beats migrations.
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS articles (
    id           text PRIMARY KEY NOT NULL,
    title        text NOT NULL,
    description  text,
    content      text,
    url          text NOT NULL UNIQUE,
    image_url    text,
    source_name  text NOT NULL,
    author       text,
    published_at text NOT NULL,
    fetched_at   text NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at);
`;

/**
 * Opens a SQLite database at the given path (creating parent directories as
 * needed) and ensures the schema exists. Pass ':memory:' for ephemeral,
 * test-isolated databases.
 */
export function openDatabase({ databasePath }: OpenDatabaseOptions): AppDatabase {
  if (databasePath !== ':memory:') {
    const directory = dirname(databasePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  const sqlite = new Database(databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(SCHEMA_SQL);

  return drizzle(sqlite, { schema });
}
