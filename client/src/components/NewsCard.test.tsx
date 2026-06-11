import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/render';
import { NewsCard } from './NewsCard';
import type { Article } from '../types';

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

  it('calls onAuthorClick with the author name when the author is clicked', async () => {
    const onAuthorClick = vi.fn();
    render(<NewsCard article={buildArticle()} onAuthorClick={onAuthorClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jane Doe' }));

    expect(onAuthorClick).toHaveBeenCalledWith('Jane Doe');
  });
});
