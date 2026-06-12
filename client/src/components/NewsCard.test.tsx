import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/render';
import { NewsCard } from './NewsCard';
import type { Article } from '@voom/shared';

afterEach(() => {
  vi.restoreAllMocks();
});

function buildArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'id-1',
    title: 'Drone delivers medical supplies',
    description: 'A delivery drone flew across the valley.',
    content: 'content',
    url: 'https://example.com/article',
    imageUrl: 'https://example.com/image.jpg',
    sourceName: 'Example News',
    author: 'Jane Doe',
    publishedAt: '2026-06-11T09:00:00Z',
    ...overrides,
  };
}

describe('NewsCard', () => {
  it('renders title, source, and a Read more link to the article', () => {
    render(<NewsCard article={buildArticle()} onAuthorClick={vi.fn()} />);

    expect(screen.getByText('Drone delivers medical supplies')).toBeInTheDocument();
    expect(screen.getByText('Example News')).toBeInTheDocument();

    const readMore = screen.getByRole('link', { name: /read more/i });
    expect(readMore).toHaveAttribute('href', 'https://example.com/article');
    expect(readMore).toHaveAttribute('target', '_blank');
  });

  it('renders an "Unknown author" label without breaking when author is null', () => {
    render(<NewsCard article={buildArticle({ author: null })} onAuthorClick={vi.fn()} />);

    expect(screen.getByText('Unknown author')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders without breaking when imageUrl is null', () => {
    render(<NewsCard article={buildArticle({ imageUrl: null })} onAuthorClick={vi.fn()} />);

    expect(screen.getByText('Drone delivers medical supplies')).toBeInTheDocument();
  });

  it('loads images with no referrer so hotlink protection does not block them', () => {
    const { container } = render(<NewsCard article={buildArticle()} onAuthorClick={vi.fn()} />);

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('opens the article in a new tab when the card is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<NewsCard article={buildArticle()} onAuthorClick={vi.fn()} />);

    await userEvent.click(screen.getByText('Drone delivers medical supplies'));

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/article',
      '_blank',
      expect.stringContaining('noopener'),
    );
  });

  it('clicking the author opens the modal without navigating to the article', async () => {
    const onAuthorClick = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<NewsCard article={buildArticle()} onAuthorClick={onAuthorClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jane Doe' }));

    expect(onAuthorClick).toHaveBeenCalledWith('Jane Doe');
    // stopPropagation: the author click must NOT trigger the card navigation.
    expect(openSpy).not.toHaveBeenCalled();
  });
});
