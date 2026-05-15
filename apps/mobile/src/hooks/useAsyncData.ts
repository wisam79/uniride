import { useState, useCallback, useRef, useEffect } from 'react';
import { retryWithBackoff } from '@uniride/core';

export function useAsyncData<T>(fetcher: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store latest fetcher in a ref so execute() is stable
  const fetcherRef = useRef(fetcher);
  const invocationIdRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const execute = useCallback(async () => {
    const currentInvocationId = ++invocationIdRef.current;
    
    setIsLoading(true);
    setError(null);
    try {
      // Use core retry utility for transient failures
      const result = await retryWithBackoff(() => fetcherRef.current(), {
        maxRetries: 2,
        baseDelayMs: 1000,
      });
      
      if (currentInvocationId === invocationIdRef.current) {
        setData(result);
      }
    } catch (err: unknown) {
      if (currentInvocationId === invocationIdRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (currentInvocationId === invocationIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    execute();
    return () => {
      // Prevent state updates if component unmounts
      invocationIdRef.current++;
    };
  }, [execute]);

  return { data, setData, isLoading, setIsLoading, error, setError, execute };
}
