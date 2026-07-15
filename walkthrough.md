# Phase A6.8 — Shared Modules Integration & Frontend Request Optimization

## Walkthrough

---

### What was built

Phase A6.8 integrates all remaining Shared Modules and refactors the API layer for optimal frontend networking. No backend code was modified.

---

## 1. New Files Created

### Types
| File | Purpose |
|------|---------|
| `src/types/shared.ts` | All Phase A6.8 type definitions: Notification, Comment, Attachment, Tag, Favorite, UserPreferences, ApiKey, ActivityEntry, and supporting request/filter types |

### API Layer
| File | Purpose |
|------|---------|
| `src/api/cache.ts` | `ResponseCache` class — per-key TTL cache with invalidation, prefix sweep, stale-peek. `TTL` constants (15s notifications, 30s dashboard, 5min knowledge, 24h prefs). `CacheKeys` builders |
| `src/api/deduplicator.ts` | `RequestDeduplicator` — shares one in-flight Promise across concurrent callers for same key. AbortController integration, cancel, cancelAll |
| `src/api/optimistic.ts` | `optimisticUpdate()` — apply → commit → confirm/rollback pipeline. `optimisticAdd`, `optimisticRemove`, `optimisticPatch`, `optimisticToggle` helpers |
| `src/api/retry.ts` | `isRetryable()`, `backoffDelay()`, `withRetry()`. Retries: NetworkError, TimeoutError, 502/503/504. Never retries: 400/401/403/404/409/422 |

### Stores
| File | Purpose |
|------|---------|
| `src/store/notificationsShared.ts` | Full notifications store: list, mark read, mark all read, delete, pagination, category+read filters, unread count, optimistic mutations, 15s background refresh cache |
| `src/store/comments.ts` | Comments keyed by entityType+entityId. Create/edit/delete with optimistic updates and rollback. Reply threading. Cache-first loading |
| `src/store/attachments.ts` | Attachments keyed by entity. Upload (FormData), download (blob), preview URL generation, delete with optimistic removal |
| `src/store/tags.ts` | Tags per project. Create, assign (optimistic usageCount++), unassign (usageCount--), delete with rollback, debounced search |
| `src/store/favorites.ts` | Favorites with toggle (add-if-not/remove-if-yes). Optimistic add/remove with rollback. `isFavorite`, `getFavoriteId`, `getByType` |
| `src/store/preferences.ts` | UserPreferences store. Loads from API, merges with `DEFAULT_PREFERENCES`. Instant local setters (theme/language/density/dashboard/ai/notifications). Saves to API, cache invalidated on write |
| `src/store/apiKeys.ts` | API keys CRUD. Create (secret shown once), rotate, revoke (optimistic), delete (optimistic), activity per key. `clearNewKeySecret()` call after user copies |
| `src/store/activityFeed.ts` | Activity feed: user/investigation/ai/workflow types. Filter by type, severity, project, search, date range. 30s TTL cache, background refresh |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useNotificationsShared.ts` | Auto-loads, 15s background refresh with Visibility API pause/resume |
| `src/hooks/useComments.ts` | Loads on entityType+entityId mount, AbortController on unmount/change |
| `src/hooks/useAttachments.ts` | Loads on entity mount, AbortController cleanup |
| `src/hooks/useTags.ts` | Auto-load, 400ms debounced search, create/assign/unassign/delete |
| `src/hooks/useFavorites.ts` | Loads on userId, toggle/add/remove/getByType/isFavorite |
| `src/hooks/usePreferences.ts` | Auto-load, convenience setters auto-persist to API |
| `src/hooks/useApiKeys.ts` | Auto-load, full lifecycle: create/rotate/revoke/delete/copySecret/activity |
| `src/hooks/useActivityFeed.ts` | 30s background refresh (Visibility API), 400ms debounced search, filter/page controls |
| `src/hooks/useDebounce.ts` | React value-debounce hook (value, delay) → debouncedValue |
| `src/hooks/useBackgroundRefresh.ts` | Reusable interval refresh that pauses on hidden tab, resumes + refreshes on focus |
| `src/hooks/useAbortController.ts` | AbortController that resets on dep change + aborts on unmount |

### Utilities
| File | Purpose |
|------|---------|
| `src/lib/debounce.ts` | Generic `debounce(fn, delay)` with `.cancel()` and `.flush()` |

### Verification
| File | Purpose |
|------|---------|
| `src/api/__tests__/verify_shared_modules.ts` | 225 tests, 0 failures. 18 sections covering all new modules |

---

## 2. Modified Files

| File | Change |
|------|--------|
| `src/api/endpoints.ts` | Added endpoint groups: `notifications`, `comments`, `attachments`, `tags`, `favorites`, `preferences`, `apiKeys`, `activityFeed` |

---

## 3. Request Optimization Summary

### Request Deduplication
All GET calls through the shared stores pass through `RequestDeduplicator`. If two components load the same resource simultaneously (e.g., tags for `proj-1`), only one HTTP request fires. Both receive the same Promise result.

### Client-Side Cache
`ResponseCache` stores GET responses in memory with per-resource TTLs:
- Notifications: 15 seconds
- Dashboard/Statistics: 30 seconds
- Knowledge: 5 minutes
- Workflow lists: 60 seconds
- User Preferences: 24 hours (invalidated on write)
- Activity Feed: 30 seconds

Cache is checked before every fetch. `forceRefresh=true` bypasses it. Mutations always call `responseCache.invalidate()` or `invalidatePrefix()`.

### Background Refresh
`useBackgroundRefresh` and the notification/activity hooks use `setInterval` + `document.visibilitychange`:
- Polling is paused when the tab is hidden
- Resumes with an immediate refresh when the tab becomes active again
- No wasted requests while the user is looking at a different tab

### Debounced Search
All search inputs use `useDebounce(value, 400)` or the `debounce()` utility. No HTTP request fires on every keystroke. The request is sent after 400ms of inactivity.

### Request Cancellation
- `useAbortController` provides a signal that aborts on unmount and dep changes
- Comment/attachment hooks abort their initial load request on unmount
- `RequestDeduplicator` propagates abort signals to the underlying fetch

### Optimistic Updates
Favorites, comments, tags (assign/unassign/delete), notifications (read/delete), and API keys (revoke/delete) all update the UI before the API responds. If the API fails, the previous state is automatically restored.

### Pagination Optimization
All paginated resources (notifications, activity feed) cache each page independently under `cacheKey:page`. Previously loaded pages are not re-fetched on navigation between pages.

### Parallel Requests
`Promise.allSettled` is used in all store `refresh()` methods (investigation, workflow, knowledge) to load independent resources concurrently.

### Retry Strategy
`ApiClient` (existing) retries on 502/503/504 and NetworkError/TimeoutError with exponential backoff. The new `retry.ts` module exposes the same policy for any custom fetch code. Non-transient errors (400/401/403/404/409/422) are never retried.

---

## 4. Missing Backend Endpoints (Not Implemented)

The following endpoints are referenced by the frontend but **do not have backend route handlers yet**. They need to be created in Next.js API routes:

| Endpoint | Used By |
|----------|---------|
| `GET /api/notifications` | `notificationsSharedStore.loadNotifications()` |
| `POST /api/notifications/:id/read` | `notificationsSharedStore.markRead()` |
| `POST /api/notifications/read-all` | `notificationsSharedStore.markAllRead()` |
| `DELETE /api/notifications/:id` | `notificationsSharedStore.deleteNotification()` |
| `GET /api/comments?entityType&entityId` | `commentsStore.loadComments()` |
| `POST /api/comments` | `commentsStore.createComment()` |
| `PATCH /api/comments/:id` | `commentsStore.updateComment()` |
| `DELETE /api/comments/:id` | `commentsStore.deleteComment()` |
| `GET /api/attachments?entityType&entityId` | `attachmentsStore.loadAttachments()` |
| `POST /api/attachments` (multipart) | `attachmentsStore.uploadAttachment()` |
| `GET /api/attachments/:id/download` | `attachmentsStore.downloadAttachment()` |
| `DELETE /api/attachments/:id` | `attachmentsStore.deleteAttachment()` |
| `GET /api/projects/:id/tags` | `tagsStore.loadTags()` |
| `POST /api/projects/:id/tags` | `tagsStore.createTag()` |
| `POST /api/projects/:id/tags/:tagId/assign` | `tagsStore.assignTag()` |
| `POST /api/projects/:id/tags/:tagId/unassign` | `tagsStore.unassignTag()` |
| `DELETE /api/projects/:id/tags/:tagId` | `tagsStore.deleteTag()` |
| `GET /api/favorites` | `favoritesStore.loadFavorites()` |
| `POST /api/favorites` | `favoritesStore.addFavorite()` |
| `DELETE /api/favorites/:id` | `favoritesStore.removeFavorite()` |
| `GET /api/user/preferences` | `preferencesStore.loadPreferences()` |
| `PATCH /api/user/preferences` | `preferencesStore.updatePreferences()` |
| `GET /api/user/api-keys` | `apiKeysStore.loadKeys()` |
| `POST /api/user/api-keys` | `apiKeysStore.createKey()` |
| `POST /api/user/api-keys/:id/rotate` | `apiKeysStore.rotateKey()` |
| `POST /api/user/api-keys/:id/revoke` | `apiKeysStore.revokeKey()` |
| `DELETE /api/user/api-keys/:id` | `apiKeysStore.deleteKey()` |
| `GET /api/user/api-keys/:id/activity` | `apiKeysStore.loadActivity()` |
| `GET /api/activity` | `activityFeedStore.loadFeed()` |

All stores are designed to handle 404/5xx gracefully — they set `error` state and fall back to empty/default data, so the UI does not crash when these endpoints are not yet available.

---

## 5. Verification Results

```
Tests  225 passed (225)
0 failures
```

All commands:
- `npm run check:ts` → 0 errors
- `npm run build` → build successful
- `vitest run src/api/__tests__/verify_shared_modules.ts` → 225/225 passed
