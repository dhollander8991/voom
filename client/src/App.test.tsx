import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from './test/render';
import { App } from './App';
import { fetchNews, fetchAuthor, type NewsPage } from './lib/api';
import type { Article } from './types';

vi.mock('./lib/api', () => ({
  fetchNews: vi.fn(),
  fetchAuthor: vi.fn(),
}));

const mockedFetchNews = vi.mocked(fetchNews);
const mockedFetchAuthor = vi.mocked(fetchAuthor);

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

function buildNewsPage(articles: Article[], overrides: Partial<NewsPage> = {}): NewsPage {
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
    mockedFetchNews.mockReset();
    mockedFetchAuthor.mockReset();
  });

  it('shows loading skeletons, then renders fetched articles', async () => {
    mockedFetchNews.mockResolvedValue(buildNewsPage([buildArticle()]));
    const { container } = render(<App />);

    // Skeletons render synchronously before the fetch resolves.
    expect(container.querySelector('.mantine-Skeleton-root')).toBeTruthy();

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();
  });

  it('shows the empty state when no articles are returned', async () => {
    mockedFetchNews.mockResolvedValue(buildNewsPage([]));
    render(<App />);

    expect(await screen.findByText('No articles found')).toBeInTheDocument();
  });

  it('shows the error state and can retry when the fetch fails', async () => {
    mockedFetchNews.mockRejectedValueOnce(new Error('network down'));
    render(<App />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();

    // Retry refetches; this time it succeeds.
    mockedFetchNews.mockResolvedValueOnce(buildNewsPage([buildArticle()]));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();
  });

  it('refetches with the search query after debounce', async () => {
    mockedFetchNews.mockImplementation(({ query } = {}) =>
      Promise.resolve(
        query === 'surveillance'
          ? buildNewsPage([buildArticle({ id: 'surv', title: 'Drone surveillance program' })])
          : buildNewsPage([buildArticle()]),
      ),
    );
    render(<App />);

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: /search drone news/i }), 'surveillance');

    await waitFor(() => {
      expect(mockedFetchNews).toHaveBeenCalledWith(expect.objectContaining({ query: 'surveillance', page: 1 }));
    });
    expect(await screen.findByText('Drone surveillance program')).toBeInTheDocument();
  });

  it('renders pagination and fetches the next page when a page is clicked', async () => {
    mockedFetchNews.mockResolvedValue(buildNewsPage([buildArticle()], { total: 60, totalPages: 3 }));
    render(<App />);

    expect(await screen.findByText('Drone delivers medical supplies')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(mockedFetchNews).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it('clears the search input when the clear button is clicked', async () => {
    mockedFetchNews.mockResolvedValue(buildNewsPage([buildArticle()]));
    render(<App />);

    const input = screen.getByRole('textbox', { name: /search drone news/i });
    await userEvent.type(input, 'drone');
    expect(input).toHaveValue('drone');

    await userEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(input).toHaveValue('');
  });

  it('opens the author modal when an author is clicked', async () => {
    mockedFetchNews.mockResolvedValue(buildNewsPage([buildArticle()]));
    mockedFetchAuthor.mockResolvedValue({
      name: 'Jane Doe',
      summary: 'Jane Doe is an aviation journalist.',
    });
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Jane Doe' }));

    expect(await screen.findByText('Jane Doe is an aviation journalist.')).toBeInTheDocument();
    expect(mockedFetchAuthor).toHaveBeenCalledWith('Jane Doe');
  });
});
