import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { createAuthorClient } from '../src/clients/AuthorClient.js';

/** Builds a stub Anthropic client whose messages.create returns a single text
 * block containing `text`, plus the create spy for assertions. */
function buildAnthropicStub(text: string) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text }],
  });
  const anthropicClient = { messages: { create } } as unknown as Anthropic;
  return { anthropicClient, create };
}

describe('AuthorClient', () => {
  it('returns a summary when Claude reports the author was found', async () => {
    const { anthropicClient } = buildAnthropicStub(
      JSON.stringify({ found: true, summary: 'Jane Doe is an aviation journalist.' }),
    );
    const client = createAuthorClient({ apiKey: 'test', anthropicClient });

    const authorInfo = await client.fetchSummary({ name: 'Jane Doe' });

    expect(authorInfo).toEqual({ name: 'Jane Doe', summary: 'Jane Doe is an aviation journalist.' });
  });

  it('calls Claude with the configured model and the author name', async () => {
    const { anthropicClient, create } = buildAnthropicStub(
      JSON.stringify({ found: true, summary: 'A bio.' }),
    );
    const client = createAuthorClient({ apiKey: 'test', anthropicClient });

    await client.fetchSummary({ name: 'Jane Doe' });

    expect(create).toHaveBeenCalledTimes(1);
    const requestBody = create.mock.calls[0][0];
    expect(requestBody.model).toBe('claude-haiku-4-5');
    expect(JSON.stringify(requestBody.messages)).toContain('Jane Doe');
  });

  it('returns null when Claude reports the author was not found', async () => {
    const { anthropicClient } = buildAnthropicStub(JSON.stringify({ found: false, summary: '' }));
    const client = createAuthorClient({ apiKey: 'test', anthropicClient });

    await expect(client.fetchSummary({ name: 'Unknown Person' })).resolves.toBeNull();
  });

  it('returns null when found is true but the summary is blank', async () => {
    const { anthropicClient } = buildAnthropicStub(JSON.stringify({ found: true, summary: '   ' }));
    const client = createAuthorClient({ apiKey: 'test', anthropicClient });

    await expect(client.fetchSummary({ name: 'Jane Doe' })).resolves.toBeNull();
  });

  it('returns null when the response is not valid JSON (e.g. a refusal)', async () => {
    const { anthropicClient } = buildAnthropicStub('I cannot help with that.');
    const client = createAuthorClient({ apiKey: 'test', anthropicClient });

    await expect(client.fetchSummary({ name: 'Jane Doe' })).resolves.toBeNull();
  });
});
