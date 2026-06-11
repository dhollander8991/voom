import { createHash } from 'node:crypto';

/**
 * Derives a stable, deterministic id from an article url. The same url always
 * hashes to the same id, which lets the repository dedupe across polls.
 */
export function hashUrl(url: string): string {
  return createHash('sha1').update(url).digest('hex');
}
