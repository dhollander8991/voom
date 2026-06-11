import { Anchor, Badge, Card, Group, Image, Text, UnstyledButton } from '@mantine/core';
import type { Article } from '../types';
import { formatRelativeTime } from '../lib/relativeTime';
import classes from './NewsCard.module.css';

export interface NewsCardProps {
  article: Article;
  onAuthorClick: (authorName: string) => void;
}

const IMAGE_FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
      <rect width="100%" height="100%" fill="#e9ecef"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="#868e96" font-family="sans-serif" font-size="18">VOOM</text>
    </svg>`,
  );

/** A single news article card. The whole card is clickable and opens the
 * article; the author button and "Read more" link stop propagation so they
 * keep their own behavior instead of navigating to the article. */
export function NewsCard({ article, onAuthorClick }: NewsCardProps) {
  const openArticle = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      className={classes.card}
      onClick={openArticle}
      // Keyboard access for the card link; nested controls (author/Read more)
      // are focusable on their own, so only act when the card itself is focused.
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          openArticle();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open article: ${article.title}`}
    >
      <Card.Section>
        <Image
          src={article.imageUrl}
          fallbackSrc={IMAGE_FALLBACK}
          height={180}
          alt=""
          className={classes.image}
          loading="lazy"
          decoding="async"
          // Many publishers serve a placeholder or 403 to cross-origin <img>
          // requests that carry a Referer; dropping it lets more images load.
          // Broken/cert-invalid URLs still fall through to fallbackSrc.
          referrerPolicy="no-referrer"
        />
      </Card.Section>

      <Badge variant="light" color="teal" className={classes.source}>
        {article.sourceName}
      </Badge>

      <Text fw={700} lineClamp={2} className={classes.title}>
        {article.title}
      </Text>

      {article.description ? (
        <Text c="dimmed" size="sm" lineClamp={3} className={classes.description}>
          {article.description}
        </Text>
      ) : null}

      <Group justify="space-between" align="center" className={classes.footer} wrap="nowrap">
        {article.author ? (
          <UnstyledButton
            className={classes.author}
            onClick={(event) => {
              // Don't let the author click bubble up to the card's navigation.
              event.stopPropagation();
              onAuthorClick(article.author as string);
            }}
          >
            {article.author}
          </UnstyledButton>
        ) : (
          <Text c="dimmed" size="sm">
            Unknown author
          </Text>
        )}

        <Text c="dimmed" size="xs" className={classes.date}>
          {formatRelativeTime({ isoTimestamp: article.publishedAt })}
        </Text>
      </Group>

      <Anchor
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        fw={600}
        className={classes.readMore}
        // The card already navigates on click; stop here so the link doesn't
        // also trigger the card handler and open a second tab.
        onClick={(event) => event.stopPropagation()}
      >
        Read more
      </Anchor>
    </Card>
  );
}
