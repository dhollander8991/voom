import { useEffect, useRef, useState } from 'react';
import { Container, Group, Pagination, SegmentedControl, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Header } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { AuthorModal } from './components/AuthorModal';
import { useNews } from './queries/news.queries';
import { buildNewsSearch, parseNewsParams } from './lib/urlState';
import type { SortOrder } from '@voom/shared';
import classes from './App.module.css';

const SEARCH_DEBOUNCE_MS = 350;

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
];

/** Single-page VOOM Drone News app: header search drives a debounced, paginated,
 * sortable feed; state is reflected in the URL so views are shareable; clicking
 * an author opens a Claude-backed modal. */
export function App() {
  // Seed state from the URL once, so a shared link opens the same view.
  const [initial] = useState(() => parseNewsParams(window.location.search));
  const [searchValue, setSearchValue] = useState(initial.query);
  const [debouncedSearch] = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(initial.page);
  const [sort, setSort] = useState<SortOrder>(initial.sort);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  // Changing the search or sort returns to page 1 — but not on the first mount,
  // so a shared URL's page is preserved.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, sort]);

  // Keep the URL in sync with the applied (debounced) state so the current
  // view is shareable/bookmarkable. replaceState avoids spamming history.
  useEffect(() => {
    const search = buildNewsSearch({ query: debouncedSearch, page, sort });
    window.history.replaceState(null, '', `${window.location.pathname}${search}`);
  }, [debouncedSearch, page, sort]);

  const { data, isPending, isError, refetch } = useNews({ query: debouncedSearch, page, sort });
  const articles = data?.articles ?? [];
  const totalPages = data?.totalPages ?? 1;
  const showPagination = !isPending && !isError && totalPages > 1;

  return (
    <div className={classes.app}>
      <Header searchValue={searchValue} onSearchChange={setSearchValue} />

      <Container size="lg" component="main" className={classes.main}>
        <Group justify="flex-end" mb="md">
          <SegmentedControl
            size="sm"
            value={sort}
            onChange={(value) => setSort(value as SortOrder)}
            data={SORT_OPTIONS}
            aria-label="Sort articles"
          />
        </Group>

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
