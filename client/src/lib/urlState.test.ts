import { describe, expect, it } from 'vitest';
import { buildNewsSearch, parseNewsParams } from './urlState';

describe('parseNewsParams', () => {
  it('returns defaults for an empty search', () => {
    expect(parseNewsParams('')).toEqual({ query: '', page: 1, sort: 'newest' });
  });

  it('reads query, page, and sort', () => {
    expect(parseNewsParams('?q=delivery&page=3&sort=oldest')).toEqual({
      query: 'delivery',
      page: 3,
      sort: 'oldest',
    });
  });

  it('falls back to defaults for invalid values', () => {
    expect(parseNewsParams('?page=abc&sort=sideways')).toEqual({ query: '', page: 1, sort: 'newest' });
    expect(parseNewsParams('?page=-2').page).toBe(1);
    expect(parseNewsParams('?page=0').page).toBe(1);
  });
});

describe('buildNewsSearch', () => {
  it('omits everything at its default', () => {
    expect(buildNewsSearch({ query: '', page: 1, sort: 'newest' })).toBe('');
  });

  it('includes only non-default values', () => {
    expect(buildNewsSearch({ query: 'drone', page: 1, sort: 'newest' })).toBe('?q=drone');
    expect(buildNewsSearch({ query: '', page: 2, sort: 'newest' })).toBe('?page=2');
    expect(buildNewsSearch({ query: '', page: 1, sort: 'oldest' })).toBe('?sort=oldest');
  });

  it('round-trips with parseNewsParams', () => {
    const state = { query: 'drone delivery', page: 4, sort: 'oldest' as const };
    expect(parseNewsParams(buildNewsSearch(state))).toEqual(state);
  });
});
