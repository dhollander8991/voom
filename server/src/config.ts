import 'dotenv/config';

interface AppConfig {
  newsApiKey: string;
  claudeApiKey: string;
  port: number;
  pollIntervalMinutes: number;
  databasePath: string;
}

/**
 * Reads and validates configuration from the environment. Throws early on a
 * missing API key so the process fails loudly at startup rather than on the
 * first request.
 */
export function loadConfig(): AppConfig {
  const newsApiKey = process.env.NEWS_API_KEY ?? '';
  if (!newsApiKey) {
    throw new Error('NEWS_API_KEY is required. Copy server/.env.example to server/.env and set it.');
  }

  // Optional: when unset, the author-summary feature is disabled (the endpoint
  // returns { author: null }) but the rest of the app runs normally.
  const claudeApiKey = process.env.CLAUDE_API_KEY ?? '';

  return {
    newsApiKey,
    claudeApiKey,
    port: Number(process.env.PORT ?? 3001),
    // 15 min => ~96 calls/day, still under NewsAPI's 100/day free-tier cap.
    pollIntervalMinutes: Number(process.env.POLL_INTERVAL_MINUTES ?? 15),
    databasePath: process.env.DATABASE_PATH ?? './data/news.db',
  };
}
