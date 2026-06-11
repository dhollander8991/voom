import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import type { ArticleRepository } from './repositories/ArticleRepository.js';
import type { AuthorClient } from './clients/AuthorClient.js';
import { createNewsRouter } from './routes/news.js';
import { createAuthorsRouter } from './routes/authors.js';
import { createHealthRouter } from './routes/health.js';

export interface CreateAppOptions {
  articleRepository: ArticleRepository;
  authorClient: AuthorClient;
}

/**
 * Builds the Express app with all routes wired to injected dependencies. Kept
 * free of process concerns (no listen, no db opening) so tests can exercise it
 * with in-memory repositories and mocked clients via supertest.
 */
export function createApp({ articleRepository, authorClient }: CreateAppOptions): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/health', createHealthRouter());
  app.use('/api/news', createNewsRouter({ articleRepository }));
  app.use('/api/authors', createAuthorsRouter({ authorClient }));

  // Centralized error handler so route handlers can simply call next(error).
  app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    console.error('[api] unhandled error:', error);
    response.status(500).json({ message: 'Internal server error.' });
  });

  return app;
}
