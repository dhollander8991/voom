import { defineConfig } from 'drizzle-kit';

// schema.ts is the single source of truth; `drizzle-kit generate` writes SQL
// migrations into ./drizzle, which db.ts applies at startup via the migrator.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
});
