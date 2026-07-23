import { useSyncExternalStore } from 'react';

export class Store<T> {
  private state: T;
  private listeners = new Set<(state: T) => void>();

  constructor(initialState: T) {
    this.state = initialState;
    this.subscribe = this.subscribe.bind(this);
    this.getState = this.getState.bind(this);
  }

  getState(): T {
    return this.state;
  }

  setState(nextState: Partial<T> | ((state: T) => Partial<T>)): void {
    const updates = typeof nextState === 'function' ? nextState(this.state) : nextState;
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((listener) => listener(this.state));
  }

  subscribe(listener: (state?: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * React hook — returns a live snapshot of the store state and re-renders
   * the component whenever the state changes.
   */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useStore(): T {
    return useSyncExternalStore(
      this.subscribe,
      this.getState,
      this.getState,
    );
  }
}

export function useStore<T>(store: Store<T>): T {
  return store.useStore();
}
