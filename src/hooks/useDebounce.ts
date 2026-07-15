/**
 * hooks/useDebounce.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that debounces a value.
 * Search inputs should use this to avoid sending a request on every keystroke.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchInput, 400);
 *   useEffect(() => { if (debouncedSearch) fetchResults(debouncedSearch); }, [debouncedSearch]);
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
