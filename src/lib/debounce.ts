/**
 * lib/debounce.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic debounce utility. Used for search inputs.
 * Recommended delay: 300–500 ms.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFn = (...args: any[]) => void;

export interface DebouncedFn<T extends AnyFn> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(...args: Parameters<T>): void;
}

export function debounce<T extends AnyFn>(fn: T, delay: number): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = function (...args: Parameters<T>) {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...(lastArgs as Parameters<T>));
    }, delay);
  } as DebouncedFn<T>;

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  debounced.flush = (...args: Parameters<T>) => {
    debounced.cancel();
    const resolvedArgs: Parameters<T> = args.length > 0 ? args : (lastArgs ?? ([] as unknown as Parameters<T>));
    fn(...resolvedArgs);
  };

  return debounced;
}
