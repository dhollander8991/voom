import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { createArticleRepository } from './repositories/ArticleRepository.js';
import { createNewsApiClient } from './clients/NewsApiClient.js';
import { createAuthorClient } from './clients/AuthorClient.js';
import { createNewsPoller } from './services/poller.js';
import { createApp } from './app.js';

function main(): void {
  const config = loadConfig();

  const database = openDatabase({ databasePath: config.databasePath });
  const articleRepository = createArticleRepository(database);
  const newsApiClient = createNewsApiClient({ apiKey: config.newsApiKey });
  const authorClient = createAuthorClient({ apiKey: config.claudeApiKey });

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
