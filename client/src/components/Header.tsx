import { Container, Group, Input, TextInput, Title } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import classes from './Header.module.css';

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/** App header: title on the left, debounced search on the right. */
export function Header({ searchValue, onSearchChange }: HeaderProps) {
  return (
    <header className={classes.header}>
      <Container size="lg" className={classes.inner}>
        <Group justify="space-between" align="center" wrap="nowrap" gap="md">
          <Title order={1} className={classes.title}>
            VOOM Drone News
          </Title>
          <TextInput
            className={classes.search}
            value={searchValue}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder="Search drone news"
            aria-label="Search drone news"
            leftSection={<IconSearch size={16} stroke={1.5} />}
            rightSectionPointerEvents="all"
            rightSection={
              searchValue ? (
                <Input.ClearButton aria-label="Clear search" onClick={() => onSearchChange('')} />
              ) : null
            }
          />
        </Group>
      </Container>
    </header>
  );
}
