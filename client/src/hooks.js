import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async function, tracks loading/error, and ignores answers that arrive too late.
export function useFetch(fetcher, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const latest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => id === latest.current && setState({ data, loading: false, error: null }))
      .catch((error) => id === latest.current && setState({ data: null, loading: false, error }));
  }, deps);

  useEffect(() => {
    run();
    return () => {
      latest.current += 1;
    };
  }, [run]);

  return { ...state, reload: run };
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
