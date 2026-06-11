import { Router } from 'express';
import type { ArticleRepository } from '../repositories/ArticleRepository.js';

export interface NewsRouterOptions {
  articleRepository: ArticleRepository;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

/**
 * GET /api/news?q=<keywords>&limit=<n>
 * Returns the latest stored articles, optionally filtered by keywords.
 */
export function createNewsRouter({ articleRepository }: NewsRouterOptions): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q : undefined;

    const requestedLimit = Number(request.query.limit);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const articles = articleRepository.findLatest({ query, limit });
    response.json({ articles, total: articles.length });
  });

  return router;
}
