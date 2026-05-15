/**
 * OpenTelemetry helpers for Deno Edge Functions.
 * No-op when OTEL_EXPORTER_OTLP_ENDPOINT is not configured.
 */

export interface Span {
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: { code: 'OK' | 'ERROR'; message?: string }): void;
  recordException(error: Error): void;
  end(): void;
}

interface Tracer {
  startSpan(name: string): Span;
}

// No-op implementations
const noopSpan: Span = {
  setAttribute: () => {},
  setStatus: () => {},
  recordException: () => {},
  end: () => {},
};

const noopTracer: Tracer = {
  startSpan: () => noopSpan,
};

export function initOtel(serviceName: string): Tracer {
  const endpoint = Deno.env.get('OTEL_EXPORTER_OTLP_ENDPOINT');
  if (!endpoint) return noopTracer;

  // When endpoint is configured, return a basic tracer that sends to OTLP
  // Full SDK integration requires @opentelemetry/sdk-trace-base for Deno
  return {
    startSpan: (name: string): Span => {
      const startTime = Date.now();
      const attributes: Record<string, string | number | boolean> = {
        'service.name': serviceName,
        'span.name': name,
      };
      let statusCode: 'OK' | 'ERROR' = 'OK';
      let statusMessage: string | undefined;
      let exception: Error | undefined;

      return {
        setAttribute: (key, value) => {
          attributes[key] = value;
        },
        setStatus: (status) => {
          statusCode = status.code;
          statusMessage = status.message;
        },
        recordException: (error) => {
          exception = error;
        },
        end: () => {
          const duration = Date.now() - startTime;
          // Fire-and-forget export to OTLP
          const payload = {
            resourceSpans: [
              {
                resource: {
                  attributes: [{ key: 'service.name', value: { stringValue: serviceName } }],
                },
                scopeSpans: [
                  {
                    spans: [
                      {
                        name,
                        startTimeUnixNano: String(startTime * 1_000_000),
                        endTimeUnixNano: String((startTime + duration) * 1_000_000),
                        attributes: Object.entries(attributes).map(([k, v]) => ({
                          key: k,
                          value: typeof v === 'string' ? { stringValue: v } : { intValue: v },
                        })),
                        status: {
                          code: statusCode === 'ERROR' ? 2 : 1,
                          message: statusMessage ?? exception?.message ?? '',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          };
          fetch(`${endpoint}/v1/traces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(() => {}); // Silent
        },
      };
    },
  };
}

export async function startSpan<T>(
  tracer: Tracer,
  name: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan(name);
  try {
    const result = await fn(span);
    span.setStatus({ code: 'OK' });
    return result;
  } catch (err) {
    span.setStatus({ code: 'ERROR', message: err instanceof Error ? err.message : String(err) });
    if (err instanceof Error) span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
