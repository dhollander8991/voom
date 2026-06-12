// When VITE_API_URL is unset we hit the relative /api path and let the Vite dev
// proxy forward to the backend. A deployed client sets VITE_API_URL explicitly.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/** Query-string params. `undefined` and `''` values are skipped. */
type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * The single typed GET against our backend: builds the query string (skipping
 * empty/undefined values), throws on a non-2xx response so callers can render
 * an error state, and parses the JSON body as `TResponse`.
 */
export async function apiQuery<TResponse>(path: string, params: QueryParams = {}): Promise<TResponse> {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`GET ${path} failed (status ${response.status})`);
  }

  return (await response.json()) as TResponse;
}
