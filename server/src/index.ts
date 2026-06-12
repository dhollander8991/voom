import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { createArticleRepository } from './repositories/articleRepository.js';
import { createNewsApiClient } from './clients/newsApiClient.js';
import { createAuthorClient } from './clients/authorClient.js';
import { createNewsPoller } from './services/poller.js';
import { createApp } from './app.js';

function main(): void {
  const config = loadConfig();

  const database = openDatabase({ databasePath: config.databasePath });
  const articleRepository = createArticleRepository(database);
  const newsApiClient = createNewsApiClient({ apiKey: config.newsApiKey });
  const authorClient = createAuthorClient({ apiKey: config.claudeApiKey });
  if (!config.claudeApiKey) {
    console.warn('[server] CLAUDE_API_KEY not set — author summaries are disabled.');
  }

  const poller = createNewsPoller({
    newsApiClient,
    articleRepository,
    pollIntervalMinutes: config.pollIntervalMinutes,
  });
  poller.start();

  const app = createApp({ articleRepository, authorClient });
  app.listen(config.port, () => {
    console.log(`[server] VOOM news API listening on http://localhost:${config.port}`);
    console.log(`[server] polling NewsAPI every ${config.pollIntervalMinutes} minute(s)`);
  });
}

main();
