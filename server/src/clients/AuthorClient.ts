import Anthropic from '@anthropic-ai/sdk';
import type { AuthorInfo } from '../types.js';

const MODEL = 'claude-haiku-4-5';
// Web search adds tool-use blocks before the final answer, so allow more room.
const MAX_TOKENS = 2048;
// Bound search cost/latency per lookup.
const MAX_WEB_SEARCHES = 3;

const SYSTEM_PROMPT = `You profile the byline on a news article. A byline may be an individual (journalist, writer, columnist, public figure) OR a news organization or publication (e.g. "ABC News", "Reuters", "BBC News").

Use web search to look the byline up and validate it. The goal is to confirm whether it is a real, identifiable journalist/writer or a real news organization/publication — not just whether you already know the name.

- If web search confirms the byline is a real news-related person or outlet, set "found" to true and write "summary" as a concise 4-5 sentence overview grounded in what you find: who or what it is, what they are known for, and notable work, focus areas, or affiliations.
- If the byline is a generic, non-identifying label (e.g. "Staff", "Editorial Team", "Newsroom", "Correspondent"), is clearly not news-related, or search turns up no evidence it is a real byline, set "found" to false and "summary" to an empty string.

Ground the summary in the search results. Do not invent details search did not support.`;

// Structured output schema — guarantees the model returns this exact JSON shape
// with no markdown fences or surrounding prose (which it would otherwise add).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    summary: { type: 'string' },
  },
  required: ['found', 'summary'],
  additionalProperties: false,
} as const;

interface AuthorSummaryResult {
  found: boolean;
  summary: string;
}

export interface AuthorClientOptions {
  apiKey: string;
  /** Injectable for tests; defaults to a real Anthropic client. */
  anthropicClient?: Anthropic;
}

export interface FetchSummaryOptions {
  name: string;
}

/** Resolves author info via Claude. Returned by {@link createAuthorClient}. */
export interface AuthorClient {
  fetchSummary(options: FetchSummaryOptions): Promise<AuthorInfo | null>;
}

/** Extracts the final text block's content. With web search the response also
 * contains tool-use blocks; the structured JSON answer is the last text block. */
function extractText(message: Anthropic.Message): string | null {
  const textBlocks = message.content.filter((block) => block.type === 'text');
  const lastTextBlock = textBlocks.at(-1);
  return lastTextBlock && lastTextBlock.type === 'text' ? lastTextBlock.text : null;
}

/**
 * Creates a client that asks Claude to summarize a news author. Returns null
 * when Claude has no reliable information about the person (the model reports
 * `found: false`), which the UI renders as its empty/"no info" state.
 */
export function createAuthorClient({ apiKey, anthropicClient }: AuthorClientOptions): AuthorClient {
  const client = anthropicClient ?? new Anthropic({ apiKey });

  return {
    async fetchSummary({ name }: FetchSummaryOptions): Promise<AuthorInfo | null> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        // Server-side web search lets Claude verify lesser-known bylines instead
        // of relying only on training knowledge.
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_WEB_SEARCHES }],
        output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
        messages: [{ role: 'user', content: `Byline: ${name}` }],
      });

      const text = extractText(message);
      if (!text) {
        return null;
      }

      let result: AuthorSummaryResult;
      try {
        result = JSON.parse(text) as AuthorSummaryResult;
      } catch {
        // A non-JSON reply (e.g. a refusal) is treated as "no info available".
        return null;
      }

      if (!result.found || !result.summary?.trim()) {
        return null;
      }

      return { name, summary: result.summary.trim() };
    },
  };
}
