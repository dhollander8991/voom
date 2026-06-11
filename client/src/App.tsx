import { useState } from 'react';
import { Container, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Header } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { AuthorModal } from './components/AuthorModal';
import { useNews } from './hooks/useNews';
import classes from './App.module.css';

const SEARCH_DEBOUNCE_MS = 350;

/** Single-page VOOM Drone News app: header search drives a debounced news
 * feed; clicking an author opens a Wikipedia-backed modal. */
export function App() {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const { data: articles = [], isPending, isError, refetch } = useNews({ query: debouncedSearch });

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
