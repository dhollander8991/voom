import type { ReactElement, ReactNode } from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
import { createTheme, MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const theme = createTheme({ primaryColor: 'teal' });

function Providers({ children }: { children: ReactNode }) {
  // A fresh QueryClient per render keeps tests isolated (no cache bleed), and
  // retry:false makes rejected queries surface the error state immediately.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

/**
 * Renders a component wrapped in MantineProvider + a React Query provider. Every
 * component test must use this instead of RTL's bare render, or Mantine
 * components throw for lack of a provider and hooks throw for lack of a
 * QueryClient.
 */
export function render(ui: ReactElement) {
  return testingLibraryRender(ui, { wrapper: Providers });
}

// Re-export the query/util helpers explicitly. We intentionally do NOT re-export
// RTL's own `render`, so the wrapped `render` above is the one tests receive.
export { screen, waitFor, within, fireEvent, act, cleanup } from '@testing-library/react';
