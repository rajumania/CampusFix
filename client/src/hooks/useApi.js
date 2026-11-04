import { useCallback, useEffect, useRef, useState } from 'react';
import { getMessage } from '../services/api.js';

/**
 * Runs an async loader, tracks loading/error, and exposes refresh().
 * `key` is a stable string (usually the JSON of the query params) so the effect
 * re-runs exactly when the request would actually change.
 */
export function useApi(loader, key = '', { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async () => {
      if (!enabled) return undefined;
      setLoading(true);
      setError(null);
      try {
        const result = await loader();
        if (mounted.current) setData(result);
        return result;
      } catch (err) {
        if (mounted.current) setError(getMessage(err));
        return undefined;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    // loader is recreated each render; `key` is the declared dependency instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, enabled]
  );

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, refresh: run };
}
