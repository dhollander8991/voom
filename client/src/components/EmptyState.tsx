import { Stack, Text } from '@mantine/core';
import { IconDrone } from '@tabler/icons-react';
import classes from './StateMessage.module.css';

interface EmptyStateProps {
  query: string;
}

/** Centered empty state shown when no articles match. */
export function EmptyState({ query }: EmptyStateProps) {
  return (
    <Stack align="center" gap="sm" className={classes.container}>
      <IconDrone size={48} stroke={1.25} className={classes.icon} />
      <Text fw={600}>No articles found</Text>
      <Text c="dimmed" size="sm" ta="center">
        {query.trim().length > 0
          ? `Nothing matched "${query.trim()}". Try a different search.`
          : 'No drone news available right now. Check back soon.'}
      </Text>
    </Stack>
  );
}
