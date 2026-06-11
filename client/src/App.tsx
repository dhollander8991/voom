import { useEffect, useState } from 'react';
import { Container, Group, Pagination, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Header } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { AuthorModal } from './components/AuthorModal';
import { useNews } from './hooks/useNews';
import classes from './App.module.css';

const SEARCH_DEBOUNCE_MS = 350;

/** Single-page VOOM Drone News app: header search drives a debounced, paginated
 * news feed; clicking an author opens a Claude-backed modal. */
export function App() {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  // A new search should always start from page 1, not whatever page we were on.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isPending, isError, refetch } = useNews({ query: debouncedSearch, page });
  const articles = data?.articles ?? [];
  const totalPages = data?.totalPages ?? 1;
  const showPagination = !isPending && !isError && totalPages > 1;

  return (
    <div className={classes.app}>
      <Header searchValue={searchValue} onSearchChange={setSearchValue} />

      <Container size="lg" component="main" className={classes.main}>
        <NewsFeed
          articles={articles}
          isPending={isPending}
          isError={isError}
          query={debouncedSearch}
          onRetry={() => refetch()}
          onAuthorClick={setSelectedAuthor}
        />

        {showPagination ? (
          <Group justify="center" mt="xl">
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </Group>
        ) : null}
      </Container>

      <footer className={classes.footer}>
        <Container size="lg">
          <Text c="dimmed" size="sm" ta="center">
            Powered by NewsAPI · Built for VOOM
          </Text>
        </Container>
      </footer>

      <AuthorModal authorName={selectedAuthor} onClose={() => setSelectedAuthor(null)} />
    </div>
  );
}
