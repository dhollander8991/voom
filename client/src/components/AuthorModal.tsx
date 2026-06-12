import { Modal, Skeleton, Stack, Text } from '@mantine/core';
import { useAuthor } from '../queries/news.queries';
import classes from './AuthorModal.module.css';

interface AuthorModalProps {
  /** Author name to display and look up, or null when the modal is closed. */
  authorName: string | null;
  onClose: () => void;
}

/** Modal showing a short, Claude-generated summary of a clicked author. */
export function AuthorModal({ authorName, onClose }: AuthorModalProps) {
  const { data: author, isLoading, isError } = useAuthor({ name: authorName });
  const isOpen = authorName !== null;
  const isResolved = !isLoading && !isError;

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={authorName ?? ''}
      centered
      radius="md"
      styles={{ title: { fontWeight: 700 } }}
    >
      {isLoading ? (
        <Stack gap="sm">
          <Skeleton height={12} width="90%" />
          <Skeleton height={12} width="100%" />
          <Skeleton height={12} width="80%" />
          <Skeleton height={12} width="60%" />
        </Stack>
      ) : null}

      {isError ? (
        <Text c="dimmed">Could not load author information. Please try again later.</Text>
      ) : null}

      {isResolved && !author ? (
        <Text c="dimmed">No author information available.</Text>
      ) : null}

      {isResolved && author ? (
        <Text size="sm" className={classes.summary}>
          {author.summary}
        </Text>
      ) : null}
    </Modal>
  );
}
