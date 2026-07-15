// React is imported lazily inside useStore to keep this module framework-agnostic
// when used in non-React contexts (e.g. plain TypeScript tests).
let _useSyncExternalStore: typeof import('react').useSyncExternalStore | null = null;

function getSyncExternalStore() {
  if (!_useSyncExternalStore) {
    // Dynamically require react so tests that don't run in a browser/JSDOM
    // environment can still import this module without crashing.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _useSyncExternalStore = require('react').useSyncExternalStore;
    } catch {
      return null;
    }
  }
  return _useSyncExternalStore;
}

export class Store<T> {
  private state: T;
  private listeners = new Set<(state: T) => void>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(nextState: Partial<T> | ((state: T) => Partial<T>)): void {
    const updates = typeof nextState === 'function' ? nextState(this.state) : nextState;
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((listener) => listener(this.state));
  }

  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * React hook — returns a live snapshot of the store state and re-renders
   * the component whenever the state changes.  Uses React 18's
   * `useSyncExternalStore` under the hood for tear-free concurrent reads.
   *
   * Usage (inside a React component or another custom hook):
   *   const state = myStore.useStore();
   */
  useStore(): T {
    const useSyncExternal = getSyncExternalStore();
    if (!useSyncExternal) {
      throw new Error(
        '[Store] useStore() can only be called inside a React component tree. ' +
        'Make sure React is installed and you are not calling this from plain TypeScript.'
      );
    }
    // We need stable function references for useSyncExternalStore.
    // Binding to `this` each render is fine — the identity of the returned
    // snapshot object controls whether a re-render is triggered.
    return useSyncExternal(
      (onStoreChange: () => void) => this.subscribe(onStoreChange),
      () => this.getState(),
      () => this.getState(),
    );
  }
}
