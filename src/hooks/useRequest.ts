import { useEffect, useRef } from 'react';
import { useApi, UseApiOptions } from './useApi';

export interface UseRequestOptions<T> extends UseApiOptions<T> {
  immediate?: boolean;
}

export function useRequest<T, Args extends any[] = any[]>(
  apiFunc: (...args: Args) => Promise<T>,
  args: Args,
  options: UseRequestOptions<T> = {}
) {
  const { immediate = true, ...apiOptions } = options;
  const { data, error, loading, execute, setData } = useApi<T, Args>(apiFunc, apiOptions);

  const serializedArgs = JSON.stringify(args);
  const argsRef = useRef<Args>(args);
  argsRef.current = args;

  useEffect(() => {
    if (immediate) {
      execute(...argsRef.current).catch(() => {
        // Suppress unhandled promise rejection in hook level
      });
    }
  }, [serializedArgs, immediate, execute]);

  return {
    data,
    error,
    loading,
    refresh: () => execute(...argsRef.current),
    setData,
  };
}
export type UseRequestReturn<T> = ReturnType<typeof useRequest<T>>;
