import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../test/render';
import { AuthorModal } from './AuthorModal';
import { fetchAuthor } from '../lib/api';
import type { AuthorInfo } from '../types';

vi.mock('../lib/api', () => ({
  fetchAuthor: vi.fn(),
}));

const mockedFetchAuthor = vi.mocked(fetchAuthor);

const AUTHOR: AuthorInfo = {
  name: 'Jane Doe',
  summary: 'Jane Doe is an aviation journalist.',
};

describe('AuthorModal', () => {
  beforeEach(() => {
    mockedFetchAuthor.mockReset();
  });

  it('shows skeletons while the author is loading', () => {
    // A pending promise keeps the modal in its loading state.
    mockedFetchAuthor.mockReturnValue(new Promise(() => {}));
    // The Modal renders into a portal on document.body, not into `container`.
    render(<AuthorModal authorName="Jane Doe" onClose={vi.fn()} />);

    expect(document.querySelector('.mantine-Skeleton-root')).toBeTruthy();
  });

  it('renders the summary on success', async () => {
    mockedFetchAuthor.mockResolvedValue(AUTHOR);
    render(<AuthorModal authorName="Jane Doe" onClose={vi.fn()} />);

    expect(await screen.findByText('Jane Doe is an aviation journalist.')).toBeInTheDocument();
  });

  it('shows a fallback message when no author info is available', async () => {
    mockedFetchAuthor.mockResolvedValue(null);
    render(<AuthorModal authorName="Nobody" onClose={vi.fn()} />);

    expect(await screen.findByText('No author information available.')).toBeInTheDocument();
  });

  it('does not fetch when closed (authorName is null)', () => {
    render(<AuthorModal authorName={null} onClose={vi.fn()} />);
    expect(mockedFetchAuthor).not.toHaveBeenCalled();
  });
});
