/**
 * Outbound HTTP for data adapters: timeouts, a TTL cache with
 * stale-on-error fallback, in-flight de-duplication, and a concurrency cap
 * so a cold start doesn't fire hundreds of requests at once.
 *
 * The cache is per server instance (in memory). That's fine at this scale;
 * swap TtlCache for a shared store if instance count grows.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} from ${url}`);
    this.name = 'HttpError';
  }
}

const USER_AGENT = 'SportzBarTV/1.0 (+https://github.com/tjhoward2/sportz-bar-tv)';

export async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!res.ok) throw new HttpError(res.status, url);
  return res.json();
}

interface Entry<T> {
  value: T;
  fetchedAt: number;
}

export interface CacheResult<T> {
  value: T;
  fetchedAt: number;
  /** True when the refresh failed and an older value was served. */
  stale: boolean;
  error?: string;
}

export interface CacheOptions {
  ttlMs: number;
  /** How long a value may be served after a failed refresh. */
  maxStaleMs: number;
  /**
   * Serve an expired value immediately and refresh in the background.
   * For slow-changing data (future days); not for live scores.
   */
  staleWhileRevalidate?: boolean;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inFlight = new Map<string, Promise<CacheResult<T>>>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async get(key: string, load: () => Promise<T>, opts: CacheOptions): Promise<CacheResult<T>> {
    const entry = this.entries.get(key);
    const age = entry ? this.now() - entry.fetchedAt : Infinity;

    if (entry && age < opts.ttlMs) {
      return { value: entry.value, fetchedAt: entry.fetchedAt, stale: false };
    }
    if (entry && opts.staleWhileRevalidate && age < opts.maxStaleMs) {
      void this.refresh(key, load, opts).catch(() => undefined);
      return { value: entry.value, fetchedAt: entry.fetchedAt, stale: false };
    }
    return this.refresh(key, load, opts);
  }

  private refresh(
    key: string,
    load: () => Promise<T>,
    opts: CacheOptions,
  ): Promise<CacheResult<T>> {
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = (async (): Promise<CacheResult<T>> => {
      try {
        const value = await load();
        const fetchedAt = this.now();
        this.entries.set(key, { value, fetchedAt });
        return { value, fetchedAt, stale: false };
      } catch (err) {
        const entry = this.entries.get(key);
        const message = err instanceof Error ? err.message : String(err);
        if (entry && this.now() - entry.fetchedAt < opts.maxStaleMs) {
          return { value: entry.value, fetchedAt: entry.fetchedAt, stale: true, error: message };
        }
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }
}

/** Runs `fn` over `items` with at most `limit` in flight; keeps order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i] as T) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
