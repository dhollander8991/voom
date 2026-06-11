import { Router } from 'express';

/** GET /api/health -> { status: "ok" }. Liveness probe. */
export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json({ status: 'ok' });
  });

  return router;
}
