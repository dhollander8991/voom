import { Router } from 'express';
import type { ArticleRepository } from '../repositories/ArticleRepository.js';

export interface NewsRouterOptions {
  articleRepository: ArticleRepository;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * GET /api/news?q=<keywords>&page=<n>&pageSize=<n>
 * Returns one page of the latest stored articles plus pagination metadata
 * ({ articles, total, page, pageSize, totalPages }). The repository clamps page
 * (min 1) and pageSize (1..100).
 */
export function createNewsRouter({ articleRepository }: NewsRouterOptions): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q : undefined;
    const page = Number(request.query.page) || 1;
    const pageSize = Number(request.query.pageSize) || DEFAULT_PAGE_SIZE;

    const result = articleRepository.findLatest({ query, page, pageSize });
    response.json(result);
  });

  return router;
}
