import { Card, Skeleton, Stack } from '@mantine/core';

/** Placeholder card shown while news is loading. */
export function NewsCardSkeleton() {
  return (
    <Card withBorder padding="lg" radius="md">
      <Card.Section>
        <Skeleton height={180} radius={0} />
      </Card.Section>
      <Stack gap="sm" mt="md">
        <Skeleton height={20} width="40%" />
        <Skeleton height={14} />
        <Skeleton height={14} width="80%" />
        <Skeleton height={14} width="60%" />
      </Stack>
    </Card>
  );
}
