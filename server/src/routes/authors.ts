import { Router } from 'express';
import type { AuthorClient } from '../clients/authorClient.js';

interface AuthorsRouterOptions {
  authorClient: AuthorClient;
}

/**
 * GET /api/authors?name=<author>
 * Resolves a Claude-generated author summary -> { author: AuthorInfo | null }.
 * 400 when name is missing. A successful lookup that finds nothing is a valid
 * result, so it returns 200 with `author: null` rather than a 404.
 */
export function createAuthorsRouter({ authorClient }: AuthorsRouterOptions): Router {
  const router = Router();

  router.get('/', async (request, response, next) => {
    const name = typeof request.query.name === 'string' ? request.query.name.trim() : '';
    if (!name) {
      response.status(400).json({ message: 'Query parameter "name" is required.' });
      return;
    }

    try {
      const author = await authorClient.fetchSummary({ name });
      response.json({ author });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
