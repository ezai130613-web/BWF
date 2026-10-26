import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, errorMessage } from '@/lib/api';

/**
 * Loads `path` whenever the screen gains focus (so returning from a "record"
 * form shows the new row), with pull-to-refresh and a retryable error.
 */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(path);
  useEffect(() => {
    latest.current = path;
  }, [path]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!path) return;
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await api.get<T>(path);
        if (latest.current === path) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (latest.current === path) setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [path],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return { data, error, loading: loading && !data, refreshing, refresh: () => load('refresh') };
}
