import { Router } from 'express';
import type { ArticleRepository } from '../repositories/articleRepository.js';

interface NewsRouterOptions {
  articleRepository: ArticleRepository;
}

/**
 * GET /api/news?q=<keywords>&page=<n>&pageSize=<n>&sort=newest|oldest
 * Returns one page of the latest stored articles plus pagination metadata
 * ({ articles, total, page, pageSize, totalPages }). The repository clamps page
 * (min 1) and pageSize (1..100); sort defaults to newest.
 */
export function createNewsRouter({ articleRepository }: NewsRouterOptions): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q : undefined;
    const page = Number(request.query.page) || 1;
    // pageSize omitted → the repository applies its default (and clamps both).
    const pageSize = Number(request.query.pageSize) || undefined;
    const sort = request.query.sort === 'oldest' ? 'oldest' : 'newest';

    const result = articleRepository.findLatest({ query, page, pageSize, sort });
    response.json(result);
  });

  return router;
}
