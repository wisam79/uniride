/**
 * Structured logger for UniRide mobile app.
 * - In dev: logs to console with level prefix
 * - In prod: silences debug, reports errors to backend
 * - Never uses console.log (per AGENTS.md — use console.warn)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown> | undefined;
}

const MAX_BUFFER = 100;

class Logger {
  private buffer: LogEntry[] = [];

  // Detect dev mode safely (works in both Expo and Node/test environments)
  private get isDev(): boolean {
    try {
      return typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
    } catch {
      return true;
    }
  }

  private push(entry: LogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER) this.buffer.shift();
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.isDev) return;
    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      ...(context !== undefined ? { context } : {}),
    };
    this.push(entry);
    console.warn(`[DEBUG] ${message}`, context ?? '');
  }

  info(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...(context !== undefined ? { context } : {}),
    };
    this.push(entry);
    if (this.isDev) console.warn(`[INFO] ${message}`, context ?? '');
  }

  warn(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...(context !== undefined ? { context } : {}),
    };
    this.push(entry);
    console.warn(`[WARN] ${message}`, context ?? '');
  }

  error(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...(context !== undefined ? { context } : {}),
    };
    this.push(entry);
    // Report to Sentry (fire-and-forget)
    try {
      const { captureException } = require('./sentry') as {
        captureException: (e: Error, ctx?: Record<string, unknown>) => void;
      };
      captureException(new Error(message), context);
    } catch {
      // Silent — never break the logger
    }
    console.warn(`[ERROR] ${message}`, context ?? '');
    this.reportError(entry);
  }

  private reportError(entry: LogEntry) {
    // Fire-and-forget — never throws, never blocks UI
    try {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!url) return;
      fetch(`${url}/functions/v1/log-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {
        // Silent — avoid infinite loop
      });
    } catch {
      // Silent
    }
  }

  /** Returns a snapshot of the in-memory log buffer (useful for debug screens) */
  getLogs(): LogEntry[] {
    return [...this.buffer];
  }

  clearLogs() {
    this.buffer = [];
  }
}

export const logger = new Logger();
