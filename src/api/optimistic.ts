/**
 * src/api/optimistic.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Optimistic update utilities.
 *
 * Pattern:
 *  1. Apply optimistic state change immediately
 *  2. Perform async API call
 *  3. On success: confirm / replace optimistic state with server response
 *  4. On failure: rollback to previous state
 *
 * Usage:
 *   const result = await optimisticUpdate({
 *     apply:    () => store.toggleFavorite(id),
 *     rollback: () => store.toggleFavorite(id),  // inverse
 *     commit:   () => api.post('/favorites', { entityId: id }),
 *   });
 */

export interface OptimisticUpdateOptions<T> {
  /** Apply the optimistic change immediately (no async) */
  apply: () => void;
  /** Undo the optimistic change on failure */
  rollback: () => void;
  /** The real async API call */
  commit: () => Promise<T>;
  /** Optional: apply server response instead of leaving optimistic state */
  confirm?: (data: T) => void;
  /** Optional: called on any error (after rollback) */
  onError?: (err: unknown) => void;
}

/**
 * Runs an optimistic update with automatic rollback on failure.
 * Returns the server response data on success, or throws on failure.
 */
export async function optimisticUpdate<T>({
  apply,
  rollback,
  commit,
  confirm,
  onError,
}: OptimisticUpdateOptions<T>): Promise<T> {
  // 1. Optimistically apply
  apply();

  try {
    // 2. Commit to server
    const data = await commit();

    // 3. Confirm with server data if handler provided
    if (confirm) confirm(data);

    return data;
  } catch (err) {
    // 4. Rollback
    rollback();
    onError?.(err);
    throw err;
  }
}

/**
 * Optimistically toggle a boolean flag on an item in an array.
 * Returns the rolled-back array on error.
 *
 * @param list      Current array
 * @param id        ID of the item to update
 * @param field     Boolean field name to toggle
 */
export function optimisticToggle<T extends { id: string }>(
  list: T[],
  id: string,
  field: keyof T,
): T[] {
  return list.map((item) =>
    item.id === id ? { ...item, [field]: !item[field] } : item,
  );
}

/**
 * Optimistically add an item to an array (prepend).
 */
export function optimisticAdd<T>(list: T[], item: T): T[] {
  return [item, ...list];
}

/**
 * Optimistically remove an item from an array.
 */
export function optimisticRemove<T extends { id: string }>(
  list: T[],
  id: string,
): T[] {
  return list.filter((item) => item.id !== id);
}

/**
 * Optimistically update one item in an array by ID.
 */
export function optimisticPatch<T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
