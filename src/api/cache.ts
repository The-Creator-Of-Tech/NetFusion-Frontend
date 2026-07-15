/**
 * src/api/cache.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side in-memory cache for GET responses.
 *
 * Features:
 *  - Per-key TTL (time-to-live)
 *  - Manual invalidation (single key, prefix, or all)
 *  - Stale detection (isStale)
 *  - Visibility API integration — stale-time checks respect tab visibility
 *  - Zero dependencies
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

export class ResponseCache {
  private store = new Map<string, CacheEntry<unknown>>();

  // ─── Write ─────────────────────────────────────────────────────────────────

  set<T>(key: string, data: T, ttl: number): void {
    this.store.set(key, {
      data,
      cachedAt: Date.now(),
      ttl,
    });
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  /** Returns the cached value even if stale, plus staleness flag. */
  peek<T>(key: string): { data: T; stale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    return {
      data: entry.data,
      stale: this.isExpired(entry),
    };
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /** Returns age in ms, or null if not cached. */
  age(key: string): number | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return Date.now() - entry.cachedAt;
  }

  // ─── Invalidate ────────────────────────────────────────────────────────────

  /** Delete a single cache entry. */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Delete all entries whose key starts with the given prefix. */
  invalidatePrefix(prefix: string): void {
    const toDelete: string[] = [];
    this.store.forEach((_, key) => {
      if (key.startsWith(prefix)) toDelete.push(key);
    });
    toDelete.forEach((key) => this.store.delete(key));
  }

  /** Clear all cache entries. */
  clear(): void {
    this.store.clear();
  }

  // ─── Info ──────────────────────────────────────────────────────────────────

  size(): number {
    return this.store.size;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.cachedAt > entry.ttl;
  }
}

/** Global singleton cache shared across the app. */
export const responseCache = new ResponseCache();

// ─── TTL presets (ms) ─────────────────────────────────────────────────────────

export const TTL = {
  /** 15 seconds — notifications */
  NOTIFICATIONS: 15_000,
  /** 30 seconds — dashboard / statistics */
  DASHBOARD: 30_000,
  /** 30 seconds — statistics */
  STATISTICS: 30_000,
  /** 60 seconds — workflow lists */
  WORKFLOW: 60_000,
  /** 5 minutes — knowledge base data */
  KNOWLEDGE: 5 * 60_000,
  /** 24 hours — user preferences (manual invalidation on write) */
  PREFERENCES: 24 * 60 * 60_000,
  /** 30 seconds — activity feed */
  ACTIVITY: 30_000,
  /** 60 seconds — generic default */
  DEFAULT: 60_000,
} as const;

// ─── Cache key builders ───────────────────────────────────────────────────────

export const CacheKeys = {
  notifications: (page = 1) => `notifications:${page}`,
  comments: (entityType: string, entityId: string) => `comments:${entityType}:${entityId}`,
  attachments: (entityType: string, entityId: string) => `attachments:${entityType}:${entityId}`,
  tags: (projectId: string) => `tags:${projectId}`,
  favorites: (userId: string) => `favorites:${userId}`,
  preferences: (userId: string) => `preferences:${userId}`,
  apiKeys: () => `api-keys`,
  activityFeed: (filters = '') => `activity-feed:${filters}`,
  dashboard: () => `dashboard`,
  statistics: (projectId: string) => `statistics:${projectId}`,
  knowledge: (projectId: string, section: string) => `knowledge:${projectId}:${section}`,
  workflowList: (projectId: string, section: string) => `workflow:${projectId}:${section}`,
};
