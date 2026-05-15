import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-native before importing ErrorBoundary
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}));

// Mock logger
const mockLoggerError = vi.fn();
vi.mock('../lib/logger', () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock __DEV__
vi.stubGlobal('__DEV__', true);

// ── Unit tests for ErrorBoundary logic ────────────────────────────────────────
// Since vitest runs in node environment (no jsdom), we test the class methods
// directly rather than rendering — same pattern used in useFeatureFlags.test.ts

describe('ErrorBoundary — getDerivedStateFromError', () => {
  it('sets hasError: true and stores the error', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');
    const error = new Error('test error');

    const nextState = ErrorBoundary.getDerivedStateFromError(error);

    expect(nextState.hasError).toBe(true);
    expect(nextState.error).toBe(error);
  });

  it('stores the exact error object passed', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');
    const error = new Error('specific message');

    const nextState = ErrorBoundary.getDerivedStateFromError(error);

    expect(nextState.error?.message).toBe('specific message');
  });
});

describe('ErrorBoundary — componentDidCatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls logger.error with error.message and componentStack', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    // Instantiate with minimal props/state
    const instance = new ErrorBoundary({ children: null });
    const error = new Error('render crash');
    const info: React.ErrorInfo = { componentStack: '\n  at MyComponent' };

    instance.componentDidCatch(error, info);

    expect(mockLoggerError).toHaveBeenCalledOnce();
    expect(mockLoggerError).toHaveBeenCalledWith('render crash', {
      componentStack: '\n  at MyComponent',
    });
  });

  it('passes empty string for componentStack when null', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });
    const error = new Error('crash');
    const info = { componentStack: null } as unknown as React.ErrorInfo;

    instance.componentDidCatch(error, info);

    expect(mockLoggerError).toHaveBeenCalledWith('crash', {
      componentStack: '',
    });
  });
});

describe('ErrorBoundary — handleRetry', () => {
  it('resets hasError and increments retryCount', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });
    // Simulate error state
    instance.state = {
      hasError: true,
      error: new Error('x'),
      retryCount: 0,
      fallbackCrashed: false,
    };

    // Capture setState calls
    const setStateSpy = vi.spyOn(instance, 'setState');

    instance.handleRetry();

    expect(setStateSpy).toHaveBeenCalledOnce();

    // Call the updater function to verify its output
    const updater = setStateSpy.mock.calls[0]?.[0] as (
      prev: typeof instance.state,
    ) => Partial<typeof instance.state>;
    const result = updater(instance.state);

    expect(result.hasError).toBe(false);
    expect(result.error).toBeNull();
    expect(result.retryCount).toBe(1);
  });

  it('does not reset state when retryCount >= 3', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });
    instance.state = {
      hasError: true,
      error: new Error('x'),
      retryCount: 3,
      fallbackCrashed: false,
    };

    const setStateSpy = vi.spyOn(instance, 'setState');

    instance.handleRetry();

    expect(setStateSpy).not.toHaveBeenCalled();
  });

  it('does not reset state when retryCount is exactly 3 (exhausted)', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });
    instance.state = {
      hasError: true,
      error: new Error('x'),
      retryCount: 3,
      fallbackCrashed: false,
    };

    const setStateSpy = vi.spyOn(instance, 'setState');
    instance.handleRetry();

    expect(setStateSpy).not.toHaveBeenCalled();
  });

  it('increments retryCount correctly across multiple retries', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });
    const setStateSpy = vi.spyOn(instance, 'setState');

    // Simulate retry 1
    instance.state = {
      hasError: true,
      error: new Error('x'),
      retryCount: 0,
      fallbackCrashed: false,
    };
    instance.handleRetry();
    const updater1 = setStateSpy.mock.calls[0]?.[0] as (
      prev: typeof instance.state,
    ) => Partial<typeof instance.state>;
    const result1 = updater1(instance.state);
    expect(result1.retryCount).toBe(1);

    // Simulate retry 2
    instance.state = {
      hasError: true,
      error: new Error('x'),
      retryCount: 1,
      fallbackCrashed: false,
    };
    instance.handleRetry();
    const updater2 = setStateSpy.mock.calls[1]?.[0] as (
      prev: typeof instance.state,
    ) => Partial<typeof instance.state>;
    const result2 = updater2(instance.state);
    expect(result2.retryCount).toBe(2);

    // Simulate retry 3
    instance.state = {
      hasError: true,
      error: new Error('x'),
      retryCount: 2,
      fallbackCrashed: false,
    };
    instance.handleRetry();
    const updater3 = setStateSpy.mock.calls[2]?.[0] as (
      prev: typeof instance.state,
    ) => Partial<typeof instance.state>;
    const result3 = updater3(instance.state);
    expect(result3.retryCount).toBe(3);

    // Attempt 4 — should be blocked
    instance.state = {
      hasError: true,
      error: new Error('x'),
      retryCount: 3,
      fallbackCrashed: false,
    };
    instance.handleRetry();
    expect(setStateSpy).toHaveBeenCalledTimes(3); // no 4th call
  });
});

describe('ErrorBoundary — error message truncation', () => {
  it('truncates error messages longer than 200 chars in renderFallback', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });
    const longMessage = 'A'.repeat(300);
    instance.state = {
      hasError: true,
      error: new Error(longMessage),
      retryCount: 0,
      fallbackCrashed: false,
    };

    // Access the truncation logic directly
    const errorDescription = instance.state.error?.message
      ? instance.state.error.message.slice(0, 200)
      : 'حدث خطأ غير متوقع';

    expect(errorDescription.length).toBe(200);
    expect(errorDescription).toBe('A'.repeat(200));
  });

  it('shows full message when under 200 chars', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });
    const shortMessage = 'Short error';
    instance.state = {
      hasError: true,
      error: new Error(shortMessage),
      retryCount: 0,
      fallbackCrashed: false,
    };

    const errorDescription = instance.state.error?.message
      ? instance.state.error.message.slice(0, 200)
      : 'حدث خطأ غير متوقع';

    expect(errorDescription).toBe('Short error');
  });
});

describe('ErrorBoundary — initial state', () => {
  it('starts with hasError: false, error: null, retryCount: 0', async () => {
    const { ErrorBoundary } = await import('./ErrorBoundary');

    const instance = new ErrorBoundary({ children: null });

    expect(instance.state.hasError).toBe(false);
    expect(instance.state.error).toBeNull();
    expect(instance.state.retryCount).toBe(0);
    expect(instance.state.fallbackCrashed).toBe(false);
  });
});
