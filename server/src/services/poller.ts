import cron from 'node-cron';
import type { NewsApiClient } from '../clients/newsApiClient.js';
import type { ArticleRepository } from '../repositories/articleRepository.js';

interface NewsPollerOptions {
  newsApiClient: NewsApiClient;
  articleRepository: ArticleRepository;
  pollIntervalMinutes: number;
}

/** News ingestion controller. Returned by {@link createNewsPoller}. */
interface NewsPoller {
  /** Fetches one batch from NewsAPI and persists it. */
  pollOnce(): Promise<void>;
  /** Runs an initial poll, then schedules recurring polls. */
  start(): void;
  stop(): void;
}

/**
 * Creates the news poller: it pulls the latest drone coverage from NewsAPI and
 * upserts it into the repository, once immediately and then on a cron schedule,
 * so the database is warm on the first request after startup.
 */
export function createNewsPoller({
  newsApiClient,
  articleRepository,
  pollIntervalMinutes,
}: NewsPollerOptions): NewsPoller {
  let scheduledTask: cron.ScheduledTask | null = null;

  async function pollOnce(): Promise<void> {
    // Errors are logged, not thrown, so a single failed poll never takes the
    // process down.
    try {
      const articles = await newsApiClient.fetchEverything();
      articleRepository.upsertMany(articles);
      console.log(`[poller] ingested ${articles.length} articles at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[poller] poll failed:', error);
    }
  }

  return {
    pollOnce,
    start(): void {
      void pollOnce();

      const cronExpression = `*/${pollIntervalMinutes} * * * *`;
      scheduledTask = cron.schedule(cronExpression, () => {
        void pollOnce();
      });
    },
    stop(): void {
      scheduledTask?.stop();
      scheduledTask = null;
    },
  };
}
