import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import './index.css';
import { App } from './App';

// Single accent color: a confident teal used across interactive elements.
const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
});

// News only refreshes when the backend poller runs (~30 min), so a generous
// staleTime avoids needless refetches; one retry keeps the error UX snappy.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <App />
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);
