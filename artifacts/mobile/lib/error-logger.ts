interface ErrorEntry {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack: string | undefined;
  };
  context: string | undefined;
  count: number;
}

const MAX_ERRORS = 100;
const errorLog: ErrorEntry[] = [];

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function aggregateKey(entry: Omit<ErrorEntry, "id" | "timestamp" | "count">): string {
  return `${entry.error.name}:${entry.error.message}:${entry.context ?? "no_context"}`;
}

let remoteEndpoint: string | null = null;

export function setRemoteEndpoint(url: string): void {
  remoteEndpoint = url;
}

export function logError(
  error: Error | unknown,
  context?: string
): void {
  const normalized: Omit<ErrorEntry, "id" | "timestamp" | "count"> = {
    error: {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    context,
  };

  const key = aggregateKey(normalized);
  const existing = errorLog.find((e) => aggregateKey(e) === key);

  if (existing) {
    existing.count += 1;
    existing.timestamp = new Date().toISOString();
  } else {
    errorLog.unshift({
      ...normalized,
      id: generateId(),
      timestamp: new Date().toISOString(),
      count: 1,
    });

    if (errorLog.length > MAX_ERRORS) {
      errorLog.length = MAX_ERRORS;
    }
  }

  const entry = errorLog[0];
  console.error(
    `[ErrorLogger ${entry.timestamp}] ${entry.error.name}: ${entry.error.message}` +
      (context ? ` [Context: ${context}]` : "") +
      ` (Count: ${entry.count})`
  );

  if (remoteEndpoint) {
    void sendToRemote(entry);
  }
}

async function sendToRemote(entry: ErrorEntry): Promise<void> {
  try {
    await fetch(remoteEndpoint!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        error: entry.error,
        context: entry.context,
        count: entry.count,
      }),
    });
  } catch {
    // Silently fail — do not cause infinite error loop
  }
}

export function getRecentErrors(limit: number = 20): ReadonlyArray<Readonly<ErrorEntry>> {
  return errorLog.slice(0, limit);
}

export function getErrorCount(): number {
  return errorLog.length;
}

export function clearErrors(): void {
  errorLog.length = 0;
}

export type { ErrorEntry };