import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch before importing logger
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal('fetch', mockFetch);

// Mock __DEV__ global
vi.stubGlobal('__DEV__', true);

import { logger } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logger.clearLogs();
  });

  it('debug logs are added to buffer in dev mode', () => {
    logger.debug('test debug', { key: 'value' });
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry?.level).toBe('debug');
    expect(entry?.message).toBe('test debug');
    expect(entry?.context).toEqual({ key: 'value' });
  });

  it('info logs are added to buffer', () => {
    logger.info('test info');
    const logs = logger.getLogs();
    expect(logs[0]?.level).toBe('info');
    expect(logs[0]?.message).toBe('test info');
  });

  it('warn logs are added to buffer', () => {
    logger.warn('test warn', { reason: 'network' });
    const logs = logger.getLogs();
    expect(logs[0]?.level).toBe('warn');
    expect(logs[0]?.context?.reason).toBe('network');
  });

  it('error logs are added to buffer', () => {
    logger.error('test error', { code: 500 });
    const logs = logger.getLogs();
    expect(logs[0]?.level).toBe('error');
    expect(logs[0]?.context?.code).toBe(500);
  });

  it('all log entries have a timestamp', () => {
    logger.info('timestamped');
    const logs = logger.getLogs();
    expect(logs[0]?.timestamp).toBeTruthy();
    expect(new Date(logs[0]?.timestamp ?? '').getTime()).not.toBeNaN();
  });

  it('buffer does not exceed MAX_BUFFER (100)', () => {
    for (let i = 0; i < 110; i++) {
      logger.info(`message ${i}`);
    }
    const logs = logger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(100);
  });

  it('clearLogs empties the buffer', () => {
    logger.info('one');
    logger.info('two');
    logger.clearLogs();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('getLogs returns a copy, not the internal array', () => {
    logger.info('original');
    const logs = logger.getLogs();
    logs.push({ level: 'debug', message: 'injected', timestamp: '' });
    expect(logger.getLogs()).toHaveLength(1); // internal unchanged
  });
});
