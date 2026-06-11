import { SimpleGrid } from '@mantine/core';
import type { Article } from '../types';
import { NewsCard } from './NewsCard';
import { NewsCardSkeleton } from './NewsCardSkeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export interface NewsFeedProps {
  articles: Article[];
  isPending: boolean;
  isError: boolean;
  query: string;
  onRetry: () => void;
  onAuthorClick: (authorName: string) => void;
}

const SKELETON_COUNT = 6;

const GRID_COLUMNS = { base: 1, sm: 2, lg: 3 } as const;

/** Renders the news grid, switching between loading, error, empty, and
 * populated states. */
export function NewsFeed({ articles, isPending, isError, query, onRetry, onAuthorClick }: NewsFeedProps) {
  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (isPending) {
    return (
      <SimpleGrid cols={GRID_COLUMNS} spacing="lg">
        {Array.from({ length: SKELETON_COUNT }, (_unused, index) => (
          <NewsCardSkeleton key={index} />
        ))}
      </SimpleGrid>
    );
  }

  if (articles.length === 0) {
    return <EmptyState query={query} />;
  }

  return (
    <SimpleGrid cols={GRID_COLUMNS} spacing="lg">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} onAuthorClick={onAuthorClick} />
      ))}
    </SimpleGrid>
  );
}
