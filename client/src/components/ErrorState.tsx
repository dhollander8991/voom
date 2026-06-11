import { Button, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import classes from './StateMessage.module.css';

export interface ErrorStateProps {
  onRetry: () => void;
}

/** Centered error state with a retry button. */
export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <Stack align="center" gap="sm" className={classes.container}>
      <IconAlertTriangle size={48} stroke={1.25} className={classes.icon} />
      <Text fw={600}>Something went wrong</Text>
      <Text c="dimmed" size="sm" ta="center">
        We couldn&apos;t load the news. Please try again.
      </Text>
      <Button variant="light" color="teal" onClick={onRetry} mt="xs">
        Retry
      </Button>
    </Stack>
  );
}
