import { useCallback, useEffect, useRef, useState } from 'react';

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 30_000;

export function invalidateApiCache(keyOrPrefix: string) {
  for (const key of cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cache.delete(key);
    }
  }
}

export function readApiCache<T>(key: string, ttl = CACHE_TTL): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }
  return null;
}

export function writeApiCache<T>(key: string, data: T) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function useApiSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options?: { ttl?: number }
) {
  const [data, setData] = useState<T | null>(() => {
    if (!key) return null;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < (options?.ttl ?? CACHE_TTL)) {
      return cached.data as T;
    }
    return null;
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const keyRef = useRef(key);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(async () => {
    if (!keyRef.current) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetcherRef.current();
      cache.set(keyRef.current, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    keyRef.current = key;
    if (!key) {
      setData(null);
      return;
    }
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < (options?.ttl ?? CACHE_TTL)) {
      setData(cached.data as T);
      return;
    }
    void revalidate();
  }, [key, revalidate, options?.ttl]);

  const mutate = useCallback(async (updater: T | ((prev: T | null) => T)) => {
    const next = typeof updater === 'function'
      ? (updater as (prev: T | null) => T)(data)
      : updater;
    setData(next);
    if (keyRef.current) {
      cache.set(keyRef.current, { data: next, timestamp: Date.now() });
    }
  }, [data]);

  return { data, error, loading, revalidate, mutate };
}
