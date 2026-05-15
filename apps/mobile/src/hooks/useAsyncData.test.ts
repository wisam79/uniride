import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAsyncData } from './useAsyncData';
import * as React from 'react';
import * as core from '@uniride/core';

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useState: vi.fn(),
    useEffect: vi.fn(),
    useCallback: vi.fn((fn) => fn),
    useRef: vi.fn((val) => ({ current: val })),
  };
});

// Mock core retry utility
vi.mock('@uniride/core', async () => {
  const actual = await vi.importActual('@uniride/core');
  return {
    ...actual,
    retryWithBackoff: vi.fn(),
  };
});

describe('useAsyncData', () => {
  let mockSetData: any;
  let mockSetIsLoading: any;
  let mockSetError: any;
  let capturedExecute: any;
  let capturedEffect: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetData = vi.fn();
    mockSetIsLoading = vi.fn();
    mockSetError = vi.fn();
    capturedExecute = null;
    capturedEffect = null;

    let stateIndex = 0;
    vi.mocked(React.useState).mockImplementation(((init: any) => {
      const idx = stateIndex++;
      if (idx === 0) return [init, mockSetData]; // data
      if (idx === 1) return [init, mockSetIsLoading]; // isLoading
      if (idx === 2) return [init, mockSetError]; // error
      return [init, vi.fn()];
    }) as any);

    vi.mocked(React.useCallback).mockImplementation((fn) => {
      capturedExecute = fn;
      return fn;
    });

    vi.mocked(React.useEffect).mockImplementation((cb, deps) => {
      // We only care about the effect that runs execute()
      if (deps && deps.length === 1 && deps[0] === capturedExecute) {
        capturedEffect = cb;
      }
    });
  });

  it('calls fetcher with retryWithBackoff and updates state on success', async () => {
    const mockData = { id: 1 };
    const mockFetcher = vi.fn().mockResolvedValue(mockData);
    vi.mocked(core.retryWithBackoff).mockResolvedValue(mockData);

    useAsyncData(mockFetcher, null);

    // Simulate the effect calling execute
    await capturedExecute();

    expect(core.retryWithBackoff).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({
      maxRetries: 2,
      baseDelayMs: 1000,
    }));
    
    expect(mockSetData).toHaveBeenCalledWith(mockData);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    expect(mockSetError).toHaveBeenCalledWith(null);
  });

  it('updates error state on failure', async () => {
    const error = new Error('Fetch failed');
    const mockFetcher = vi.fn();
    vi.mocked(core.retryWithBackoff).mockRejectedValue(error);

    useAsyncData(mockFetcher, null);

    await capturedExecute();

    expect(mockSetError).toHaveBeenCalledWith('Fetch failed');
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
  });
});
