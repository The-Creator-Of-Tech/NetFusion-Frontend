/**
 * src/api/deduplicator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Request deduplication layer.
 *
 * If multiple callers request the same URL simultaneously, only one HTTP
 * request is made — all callers share the same Promise.
 *
 * Usage:
 *   const data = await deduplicator.get('my-key', () => fetch(url));
 *
 * The deduplicator also supports AbortController cancellation per-caller:
 *   const data = await deduplicator.get('my-key', fetcher, signal);
 * If ALL callers for a key abort, the underlying request is cancelled too.
 */

type Fetcher<T> = (signal?: AbortSignal) => Promise<T>;

interface InFlight<T> {
  promise: Promise<T>;
  controller: AbortController;
  refCount: number;
}

export class RequestDeduplicator {
  private inflight = new Map<string, InFlight<unknown>>();

  /**
   * Executes `fetcher` at most once per key at a time.
   * Subsequent calls with the same key receive the same Promise.
   *
   * @param key     Deduplication key (e.g. the endpoint URL)
   * @param fetcher Factory that produces the Promise (receives a combined AbortSignal)
   * @param signal  Optional caller-specific abort signal
   */
  async get<T>(key: string, fetcher: Fetcher<T>, signal?: AbortSignal): Promise<T> {
    // If already in-flight, increment refcount and share promise
    const existing = this.inflight.get(key) as InFlight<T> | undefined;
    if (existing) {
      existing.refCount++;

      // If caller aborts, decrement refcount; cancel if no callers remain
      const onAbort = () => {
        existing.refCount--;
        if (existing.refCount <= 0) {
          existing.controller.abort();
          this.inflight.delete(key);
        }
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      try {
        return await existing.promise;
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }
    }

    // New request — create shared controller
    const controller = new AbortController();

    // If caller has a signal, propagate abort to controller
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          const entry = this.inflight.get(key);
          if (entry) {
            entry.refCount--;
            if (entry.refCount <= 0) {
              controller.abort();
              this.inflight.delete(key);
            }
          }
        },
        { once: true },
      );
    }

    const promise = fetcher(controller.signal).finally(() => {
      this.inflight.delete(key);
    }) as Promise<T>;

    this.inflight.set(key, {
      promise: promise as Promise<unknown>,
      controller,
      refCount: 1,
    });

    return promise;
  }

  /**
   * Returns true if a request for this key is currently in-flight.
   */
  isInFlight(key: string): boolean {
    return this.inflight.has(key);
  }

  /**
   * Cancel a specific in-flight request by key.
   */
  cancel(key: string): void {
    const entry = this.inflight.get(key);
    if (entry) {
      entry.controller.abort();
      this.inflight.delete(key);
    }
  }

  /**
   * Cancel all in-flight requests.
   */
  cancelAll(): void {
    this.inflight.forEach((entry) => {
      entry.controller.abort();
    });
    this.inflight.clear();
  }

  /**
   * Number of currently in-flight requests.
   */
  size(): number {
    return this.inflight.size;
  }
}

/** Global deduplicator singleton. */
export const deduplicator = new RequestDeduplicator();
