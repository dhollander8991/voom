import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from './test/render';
import { App } from './App';
import { apiQuery } from './lib/api';
import type { Article, PaginatedArticles } from '@voom/shared';

vi.mock('./lib/api', () => ({ apiQuery: vi.fn() }));

const mockedApiQuery = vi.mocked(apiQuery);

function buildArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'id-1',
    title: 'Drone delivers medical supplies',
    description: 'A delivery drone flew across the valley.',
    content: 'content',
    url: 'https://example.com/article',
    imageUrl: null,
    sourceName: 'Example News',
    author: 'Jane Doe',
    publishedAt: '2026-06-11T09:00:00Z',
    ...overrides,
  };
}

function buildNewsPage(articles: Article[], overrides: Partial<PaginatedArticles> = {}): PaginatedArticles {
  return {
    articles,
    total: articles.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    ...overrides,
  };
}

describe('App', () => {
  beforeEach(() => {
    mockedApiQuery.mockReset();
    // Reset the URL so deep-link state doesn't leak between tests.
    window.history.replaceState(null, '', '/');
  });

  it('shows loading skeletons, then renders fetched articles', async () => {
    mockedApiQuery.mockResolvedValue(buildNewsPage([buildArticle()]));
    const { container } = render(<App />);

    // Skeletons render synchronously before the fetch resolves.
    expect(container.querySelector('.mantine-Skeleton-root')).toBeTruthy();

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();
  });

  it('shows the empty state when no articles are returned', async () => {
    mockedApiQuery.mockResolvedValue(buildNewsPage([]));
    render(<App />);

    expect(await screen.findByText('No articles found')).toBeInTheDocument();
  });

  it('shows the error state and can retry when the fetch fails', async () => {
    mockedApiQuery.mockRejectedValueOnce(new Error('network down'));
    render(<App />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();

    // Retry refetches; this time it succeeds.
    mockedApiQuery.mockResolvedValueOnce(buildNewsPage([buildArticle()]));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();
  });

  it('refetches with the search query after debounce', async () => {
    mockedApiQuery.mockImplementation((_path, params = {}) =>
      Promise.resolve(
        params.q === 'surveillance'
          ? buildNewsPage([buildArticle({ id: 'surv', title: 'Drone surveillance program' })])
          : buildNewsPage([buildArticle()]),
      ),
    );
    render(<App />);

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: /search drone news/i }), 'surveillance');

    await waitFor(() => {
      expect(mockedApiQuery).toHaveBeenCalledWith('/api/news', expect.objectContaining({ q: 'surveillance', page: 1 }));
    });
    expect(await screen.findByText('Drone surveillance program')).toBeInTheDocument();
  });

  it('renders pagination and fetches the next page when a page is clicked', async () => {
    mockedApiQuery.mockResolvedValue(buildNewsPage([buildArticle()], { total: 60, totalPages: 3 }));
    render(<App />);

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(mockedApiQuery).toHaveBeenCalledWith('/api/news', expect.objectContaining({ page: 2 }));
    });
  });

  it('refetches with sort=oldest when the sort control changes', async () => {
    mockedApiQuery.mockResolvedValue(buildNewsPage([buildArticle()]));
    render(<App />);

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Oldest'));

    await waitFor(() => {
      expect(mockedApiQuery).toHaveBeenCalledWith('/api/news', expect.objectContaining({ sort: 'oldest' }));
    });
  });

  it('initializes feed state from the URL (deep link)', async () => {
    window.history.replaceState(null, '', '/?q=delivery&page=2');
    mockedApiQuery.mockResolvedValue(buildNewsPage([buildArticle()], { page: 2, total: 60, totalPages: 3 }));
    render(<App />);

    expect(screen.getByRole('textbox', { name: /search drone news/i })).toHaveValue('delivery');

    await waitFor(() => {
      expect(mockedApiQuery).toHaveBeenCalledWith('/api/news', expect.objectContaining({ q: 'delivery', page: 2 }));
    });
  });

  it('clears the search input when the clear button is clicked', async () => {
    mockedApiQuery.mockResolvedValue(buildNewsPage([buildArticle()]));
    render(<App />);

    const input = screen.getByRole('textbox', { name: /search drone news/i });
    await userEvent.type(input, 'drone');
    expect(input).toHaveValue('drone');

    await userEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(input).toHaveValue('');
  });

  it('opens the author modal when an author is clicked', async () => {
    mockedApiQuery.mockImplementation((path) =>
      Promise.resolve(
        path === '/api/authors'
          ? { author: { name: 'Jane Doe', summary: 'Jane Doe is an aviation journalist.' } }
          : buildNewsPage([buildArticle()]),
      ),
    );
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Jane Doe' }));

    expect(await screen.findByText('Jane Doe is an aviation journalist.')).toBeInTheDocument();
    expect(mockedApiQuery).toHaveBeenCalledWith('/api/authors', { name: 'Jane Doe' });
  });
});
