# Design Document — UniRide Production Readiness

## Overview

هذا المستند يصف التصميم التقني لعشرين متطلباً لتحسين جاهزية مشروع UniRide للإنتاج. المتطلبات مقسّمة إلى فئتين:

- **الفئة الأولى (REQ-1 → REQ-10):** تحسينات سريعة تُنجز في أسبوع واحد.
- **الفئة الثانية (REQ-11 → REQ-20):** تحسينات متوسطة تُنجز في شهر إلى شهرين.

---

## Architecture

```
monorepo (pnpm workspaces)
├── apps/admin          → Next.js 16 + Refine + MUI
├── apps/mobile         → Expo 54 + React Native
├── packages/core       → Zod schemas, state machine, shared utilities
└── supabase/
    ├── functions/      → Deno Edge Functions
    └── migrations/     → SQL migrations (source of truth)
```

التغييرات في هذا الـ spec لا تُغيّر البنية العامة — بل تُضيف طبقات أمان، مراقبة، وجودة فوق البنية الحالية.

---

## Components and Interfaces

---

# الفئة الأولى — تحسينات سريعة

---

## REQ-1: Strict TypeScript

### الملفات المتأثرة

- `apps/admin/tsconfig.json`
- `apps/mobile/tsconfig.json`
- `packages/core/tsconfig.json` (جديد إذا لم يكن موجوداً)
- `apps/admin/package.json`
- `apps/mobile/package.json`
- `packages/core/package.json`

### التصميم

يُضاف الخياران التاليان صراحةً في `compilerOptions` لكل `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**`noUncheckedIndexedAccess`:** يجعل نتيجة `arr[i]` من النوع `T | undefined` بدلاً من `T`، مما يُجبر المطوّر على التحقق قبل الاستخدام.

**`exactOptionalPropertyTypes`:** يمنع تعيين `undefined` صراحةً لخاصية اختيارية — يجب حذف الخاصية بدلاً من تعيينها `undefined`.

### script typecheck

يُضاف في `package.json` لكل workspace:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

يُتيح تشغيل `pnpm -r typecheck` من الـ root لفحص الثلاثة workspaces دفعةً واحدة.

### معالجة الأخطاء الحالية

بعد تفعيل الخيارين، قد تظهر أخطاء في الكود الحالي (مثل `arr[0]` بدون فحص). يجب إصلاحها بإضافة optional chaining أو فحص صريح:

```typescript
// قبل
const first = arr[0].id;

// بعد
const first = arr[0]?.id;
```

---

## REQ-2: Error Boundary

### الملفات المتأثرة

- `apps/mobile/src/components/ErrorBoundary.tsx` (جديد)
- `apps/mobile/app/_layout.tsx` (تعديل)

### التصميم

`ErrorBoundary` هو React class component لأن `getDerivedStateFromError` و`componentDidCatch` لا يعملان في function components.

```typescript
interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(error.message, {
      componentStack: info.componentStack ?? '',
    });
  }

  handleRetry = () => {
    if (this.state.retryCount >= 3) return;
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };
}
```

**حد المحاولات:** 3 محاولات متتالية. بعدها يُعطَّل زر "إعادة المحاولة" وتظهر رسالة تطلب إعادة تشغيل التطبيق.

**Fallback آمن:** إذا رمى الـ fallback UI نفسه خطأً، يُعرض نص ثابت مُشفَّر في الكود بدون أي بيانات ديناميكية.

**التكامل في `_layout.tsx`:**

```tsx
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Stack />
    </ErrorBoundary>
  );
}
```

---

## REQ-3: Conventional Commits + Commitlint

### الملفات المتأثرة

- `commitlint.config.js` (جديد في root)
- `.husky/_/commit-msg` (تعديل)
- `package.json` (root — devDependencies)

### التصميم

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
```

**الأنواع المقبولة:** `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `revert`.

**تعديل `.husky/_/commit-msg`:**

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/h"

npx --no -- commitlint --edit "$1"
```

**التثبيت:**

```bash
pnpm add -D -w @commitlint/cli @commitlint/config-conventional
```

الـ flag `-w` يُثبّت في workspace root. لا يُعدَّل أي hook آخر (`pre-commit`, `pre-push`).

---

## REQ-4: CODEOWNERS

### الملفات المتأثرة

- `.github/CODEOWNERS` (جديد)

### التصميم

```
# .github/CODEOWNERS

# Admin frontend
apps/admin/                    @uniride/admin-frontend

# Mobile app
apps/mobile/                   @uniride/mobile

# Backend & Edge Functions
supabase/                      @uniride/backend

# Core shared library
packages/core/                 @uniride/core-lib

# CI/CD & Migrations (DevOps/lead)
.github/workflows/             @uniride/devops
supabase/migrations/           @uniride/devops
```

GitHub يقرأ هذا الملف تلقائياً ويُضيف المراجعين المطلوبين عند فتح Pull Request يُعدّل ملفات تحت أي مسار مُعرَّف.

---

## REQ-5: Secure Storage

### الملفات المتأثرة

- `apps/mobile/src/lib/secureStorage.ts` (جديد)
- `apps/mobile/src/hooks/useStore.ts` (تعديل)
- `apps/mobile/src/lib/offlineCache.ts` (تعديل جزئي — الجزء الكامل في REQ-14)

### التصميم

#### SecureStorage Adapter

يُنشأ adapter يتوافق مع واجهة `StateStorage` الخاصة بـ Zustand، مع fallback إلى AsyncStorage عند عدم توفر SecureStore:

```typescript
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    await SecureStore.setItemAsync('__test__', '1');
    await SecureStore.deleteItemAsync('__test__');
    return true;
  } catch {
    return false;
  }
}

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (await isSecureStoreAvailable()) {
      return SecureStore.getItemAsync(key);
    }
    logger.warn('SecureStore unavailable, falling back to AsyncStorage', { key });
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (await isSecureStoreAvailable()) {
      return SecureStore.setItemAsync(key, value);
    }
    logger.warn('SecureStore unavailable, falling back to AsyncStorage', { key });
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (await isSecureStoreAvailable()) {
      return SecureStore.deleteItemAsync(key);
    }
    return AsyncStorage.removeItem(key);
  },
};
```

#### تعديل useStore.ts

يُستبدل `createJSONStorage(() => AsyncStorage)` بـ `createJSONStorage(() => secureStorage)` في:

- `useAuthStore` (مفتاح `auth-storage`)
- `useBookingStore` (مفتاح `booking-storage`)

**يبقى AsyncStorage** في:

- `useTripStore` (مفتاح `trip-storage`)
- `useI18nStore` (مفتاح `i18n-storage`)
- `GPS_QUEUE_KEY` في `useTrips.ts`

#### تنظيف عند Logout

يُضاف في دالة `logout` أو في `_layout.tsx` عند تسجيل الخروج:

```typescript
await SecureStore.deleteItemAsync('auth-storage');
await SecureStore.deleteItemAsync('booking-storage');
await SecureStore.deleteItemAsync('@uniride_active_subscription');
```

---

## REQ-6: NetInfo

### الملفات المتأثرة

- `apps/mobile/src/hooks/useNetworkStatus.ts` (إعادة كتابة كاملة)

### التصميم

يُستبدل polling بـ `@react-native-community/netinfo` الذي يستمع لأحداث النظام مباشرةً:

```typescript
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

function evaluateState(state: NetInfoState): boolean {
  if (!state.isConnected) return false;
  if (state.isInternetReachable === false) return false;
  // null = indeterminate → نفترض online لتجنب false offline
  return true;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // فحص أولي عند mount
    NetInfo.fetch().then((state) => setIsOnline(evaluateState(state)));

    // الاستماع للتغييرات
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(evaluateState(state));
    });

    return unsubscribe;
  }, []);

  return { isOnline };
}
```

**منطق التقييم:**

- `isConnected === false` → offline
- `isConnected === true && isInternetReachable === true` → online
- `isConnected === true && isInternetReachable === false` → offline
- `isInternetReachable === null` → online (indeterminate)

لا يوجد `setInterval` ولا `AppState.addEventListener` ولا `supabase.rpc('ping')` في هذا الـ hook.

---

## REQ-7: Push Token Cleanup

### الملفات المتأثرة

- `supabase/functions/send-notification/index.ts` (تعديل)

### التصميم

بعد إرسال الاستجابة للمستدعي، تُشغَّل دالة `cleanupInvalidTokens` بشكل غير متزامن:

```typescript
async function cleanupInvalidTokens(
  supabaseAdmin: SupabaseClient,
  results: PromiseSettledResult<ExpoResponse>[],
  pushTokens: { token: string; user_id: string }[],
): Promise<void> {
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status !== 'fulfilled') continue;

    const expoResult = result.value;
    if (
      expoResult?.data?.status === 'error' &&
      expoResult?.data?.details?.error === 'DeviceNotRegistered'
    ) {
      const token = pushTokens[i]?.token;
      const userId = pushTokens[i]?.user_id;
      if (!token) continue;

      try {
        const { error } = await supabaseAdmin.from('push_tokens').delete().eq('token', token);

        if (error) {
          log('error', 'Failed to delete invalid push token', {
            reason: error.message,
            tokenPrefix: token.substring(0, 20),
          });
        } else {
          log('info', 'Deleted DeviceNotRegistered push token', {
            user_id: userId,
            tokenPrefix: token.substring(0, 20),
          });
        }
      } catch (err) {
        log('error', 'Exception deleting push token', {
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
```

**الاستدعاء بعد الاستجابة:**

```typescript
// أرسل الاستجابة أولاً
const response = jsonResponse({ success: true, sent, failed, results }, 200, resolvedOrigin);

// ثم نظّف بشكل غير متزامن (fire-and-forget)
cleanupInvalidTokens(supabaseAdmin, results, pushTokensWithUserId).catch(() => {});

return response;
```

يتطلب هذا تعديل `pushTokens` query لتشمل `user_id` أيضاً.

---

## REQ-8: HTTP Security Headers

### الملفات المتأثرة

- `apps/admin/next.config.ts` (تعديل)

### التصميم

```typescript
import type { NextConfig } from 'next';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseDomain = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : '';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `connect-src 'self' https://${supabaseDomain} wss://${supabaseDomain}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**ملاحظة:** `'unsafe-inline'` و`'unsafe-eval'` في `script-src` مطلوبان لـ Next.js/MUI في الوقت الحالي. يمكن تشديدهما لاحقاً بـ nonce-based CSP.

---

## REQ-9: Soft Delete

### الملفات المتأثرة

- `supabase/migrations/2026051201_soft_delete_trips_subscriptions.sql` (جديد)

### التصميم

```sql
-- 2026051201_soft_delete_trips_subscriptions.sql

-- 1. إضافة عمود deleted_at
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Partial indexes للأداء
CREATE INDEX IF NOT EXISTS idx_trips_not_deleted
  ON public.trips(id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_not_deleted
  ON public.subscriptions(id)
  WHERE deleted_at IS NULL;

-- 3. تحديث RLS policies لاستبعاد السجلات المحذوفة
-- (يُطبَّق على policies الموجودة بإضافة شرط deleted_at IS NULL)
```

**نمط الحذف الناعم في الكود:**

```typescript
// بدلاً من DELETE
await supabase.from('trips').update({ deleted_at: new Date().toISOString() }).eq('id', tripId);
```

**تحديث RLS:** كل policy تقرأ من `trips` أو `subscriptions` تحتاج إضافة `AND deleted_at IS NULL` في شرط `USING`.

---

## REQ-10: ADR Template

### الملفات المتأثرة

- `docs/adr/README.md` (جديد)
- `docs/adr/0000-template.md` (جديد)
- `docs/adr/0001-use-supabase-migrations-as-source-of-truth.md` (جديد)

### التصميم

**هيكل `0000-template.md`:**

```markdown
# ADR-NNNN: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Superseded By:** ADR-XXXX (if applicable)

## Context

[ما هي المشكلة أو الحاجة التي دفعت لهذا القرار؟]

## Decision

[ما هو القرار المتخذ؟]

## Consequences

[ما هي النتائج الإيجابية والسلبية لهذا القرار؟]

## Alternatives Considered

[ما هي البدائل التي تم النظر فيها ولماذا رُفضت؟]
```

**`README.md`** يشرح:

- عملية إنشاء ADR جديد
- اصطلاح التسمية: `NNNN-kebab-case-title.md`
- قائمة بالـ ADRs الموجودة

**`0001-use-supabase-migrations-as-source-of-truth.md`** يوثّق قرار استخدام Supabase Migrations كمصدر الحقيقة الوحيد لقاعدة البيانات وحذف Drizzle.

---

# الفئة الثانية — تحسينات متوسطة

---

## REQ-11: Sentry Integration

### الملفات المتأثرة

- `apps/mobile/src/lib/sentry.ts` (جديد)
- `apps/mobile/src/lib/logger.ts` (تعديل)
- `apps/admin/sentry.client.config.ts` (جديد)
- `apps/admin/sentry.server.config.ts` (جديد)
- `apps/admin/next.config.ts` (تعديل — withSentryConfig)

### التصميم

#### Mobile — `sentry.ts`

```typescript
import * as Sentry from '@sentry/react-native';

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // لا تُرمى أخطاء إذا لم يُهيَّأ DSN

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    debug: __DEV__,
    enableInExpoDevelopment: true,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
  });
}

export { Sentry };
```

#### تعديل `logger.ts`

```typescript
import { Sentry } from './sentry';

error(message: string, context?: Record<string, unknown>) {
  // ... الكود الحالي ...
  // إضافة Sentry
  try {
    Sentry.captureException(new Error(message), { extra: context });
  } catch {
    // silent — لا نكسر الـ logger إذا فشل Sentry
  }
  this.reportError(entry); // الكود الحالي
}
```

#### Admin — `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Admin — `sentry.server.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**التثبيت:**

```bash
pnpm add @sentry/react-native --filter @uniride/mobile
pnpm add @sentry/nextjs --filter @uniride/admin
```

---

## REQ-12: OpenTelemetry

### الملفات المتأثرة

- `supabase/functions/_shared/otel.ts` (جديد)
- `supabase/functions/trip-engine/index.ts` (تعديل)
- `supabase/functions/send-notification/index.ts` (تعديل)

### التصميم

#### `_shared/otel.ts`

```typescript
// OpenTelemetry للـ Deno Edge Functions
// يستخدم OTLP HTTP exporter

let tracer: Tracer | null = null;

export function initOtel(serviceName: string): Tracer {
  const endpoint = Deno.env.get('OTEL_EXPORTER_OTLP_ENDPOINT');

  if (!endpoint) {
    // No-op mode — لا أخطاء، لا تأثير على الأداء
    return createNoopTracer();
  }

  // تهيئة OTLP exporter
  const exporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  const provider = new NodeTracerProvider({
    resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
  });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register();

  return provider.getTracer(serviceName);
}

export function startSpan(tracer: Tracer, name: string, fn: (span: Span) => Promise<unknown>) {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}
```

#### تكامل في `trip-engine/index.ts`

```typescript
import { initOtel, startSpan } from '../_shared/otel.ts';

const tracer = initOtel('trip-engine');

Deno.serve(async (req: Request) => {
  return startSpan(tracer, 'trip-engine.handle', async (span) => {
    span.setAttributes({
      'http.method': req.method,
      'http.url': req.url,
    });
    // ... الكود الحالي ...
  });
});
```

**نشر `traceparent`:** يُقرأ header `traceparent` من الطلب الوارد ويُمرَّر لـ child spans.

---

## REQ-13: Exponential Backoff with Jitter

### الملفات المتأثرة

- `packages/core/index.ts` (تعديل — إضافة exports)
- `packages/core/index.test.ts` (تعديل — إضافة اختبارات)

### التصميم

```typescript
export interface RetryOptions {
  maxRetries?: number; // default: 3
  baseDelayMs?: number; // default: 500
  maxDelayMs?: number; // default: 30000
  shouldRetry?: (error: unknown) => boolean; // default: () => true
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 30000,
    shouldRetry = () => true,
  } = options ?? {};

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!shouldRetry(err)) throw err;
      if (attempt === maxRetries) break;

      const jitter = Math.floor(Math.random() * baseDelayMs);
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + jitter, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

**خصائص مهمة:**

- لا يعتمد على React أو Expo أو Supabase — يعمل في Deno وNode وReact Native.
- `attempt` يبدأ من 0: التأخير الأول = `baseDelayMs * 1 + jitter`.
- عند `shouldRetry(err) === false` يُرمى الخطأ فوراً بدون تأخير.
- يُرمى خطأ المحاولة الأخيرة مباشرةً (لا wrapper).

### اختبارات property-based

```typescript
// packages/core/index.test.ts
// Property: إذا فشلت fn N مرة ثم نجحت، يُعاد القيمة
it('resolves after N failures then success', async () => {
  // fc.integer({ min: 0, max: 3 }) → عدد الفشل
  // تحقق: retryWithBackoff يُعيد القيمة الصحيحة
});
```

---

## REQ-14: Offline Data Encryption

### الملفات المتأثرة

- `apps/mobile/src/lib/offlineCache.ts` (إعادة كتابة كاملة)

### التصميم

يُرحَّل `OfflineCache` بالكامل من `AsyncStorage` إلى `expo-secure-store`:

```typescript
import * as SecureStore from 'expo-secure-store';
import { Subscription } from '@uniride/core';
import { logger } from './logger';

const CACHE_KEY = '@uniride_active_subscription';
const MAX_PAYLOAD_BYTES = 2048;

export const OfflineCache = {
  async saveActiveSubscription(subscription: Subscription | null): Promise<void> {
    try {
      if (!subscription) {
        await SecureStore.deleteItemAsync(CACHE_KEY);
        return;
      }

      const payload = JSON.stringify({
        data: subscription,
        cachedAt: new Date().toISOString(),
      });

      // فحص الحجم
      if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
        logger.warn('Subscription payload exceeds 2048 bytes, skipping cache');
        return;
      }

      await SecureStore.setItemAsync(CACHE_KEY, payload, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch (e) {
      logger.warn('Failed to save subscription to secure cache', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  async getActiveSubscription(): Promise<Subscription | null> {
    try {
      const raw = await SecureStore.getItemAsync(CACHE_KEY);
      if (!raw) return null;

      let payload: { data: Subscription; cachedAt: string };
      try {
        payload = JSON.parse(raw);
      } catch {
        // بيانات تالفة — احذفها
        await SecureStore.deleteItemAsync(CACHE_KEY);
        return null;
      }

      const sub: Subscription = payload.data;
      // فحص الانتهاء (محفوظ من الكود الأصلي)
      if (new Date(sub.end_date) < new Date()) {
        await SecureStore.deleteItemAsync(CACHE_KEY);
        return null;
      }

      return sub;
    } catch (e) {
      logger.warn('Failed to retrieve subscription from secure cache', {
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CACHE_KEY);
    } catch (e) {
      logger.warn('Failed to clear secure cache', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
};
```

**يعتمد على REQ-5** لأن `expo-secure-store` يجب أن يكون مثبتاً مسبقاً.

---

## REQ-15: Contract Testing (Pact)

### الملفات المتأثرة

- `apps/mobile/src/tests/pact/trip-engine.pact.test.ts` (جديد)
- `apps/mobile/src/tests/pact/send-notification.pact.test.ts` (جديد)
- `packages/core/pacts/` (مجلد جديد لملفات `.json`)

### التصميم

**Consumer Tests (Mobile → Edge Functions):**

```typescript
// trip-engine.pact.test.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'UniRide-Mobile',
  provider: 'trip-engine',
  dir: '../../../packages/core/pacts',
});

describe('trip-engine contract', () => {
  it('accepts valid TripUpdateRequest', async () => {
    await provider
      .addInteraction({
        states: [{ description: 'driver has an active trip' }],
        uponReceiving: 'a valid trip status update',
        withRequest: {
          method: 'POST',
          path: '/functions/v1/trip-engine',
          headers: { Authorization: MatchersV3.string('Bearer token') },
          body: {
            tripId: MatchersV3.uuid(),
            newStatus: MatchersV3.string('driver_waiting'),
            lat: MatchersV3.number(33.3),
            lng: MatchersV3.number(44.4),
          },
        },
        willRespondWith: {
          status: 200,
          body: { success: MatchersV3.boolean(true) },
        },
      })
      .executeTest(async (mockServer) => {
        // استدعاء الـ mock server والتحقق
      });
  });
});
```

**ملفات Pact JSON** تُحفظ في `packages/core/pacts/` وتُضاف للـ repository.

**CI Integration:** يُضاف في `.github/workflows/ci.yml` بعد unit tests:

```yaml
- name: Run Pact contract tests
  run: pnpm --filter @uniride/mobile test:pact
```

---

## REQ-16: Load Testing (k6)

### الملفات المتأثرة

- `tests/load/trip-engine.js` (جديد)
- `tests/load/activate-license.js` (جديد)

### التصميم

```javascript
// tests/load/trip-engine.js
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const responseTime = new Trend('response_time');

export const options = {
  vus: 50,
  duration: '60s',
  thresholds: {
    'http_req_duration{percentile:95}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const BASE_URL = __ENV.K6_BASE_URL;
  const TOKEN = __ENV.K6_SERVICE_ROLE_KEY;

  const res = http.post(
    `${BASE_URL}/functions/v1/trip-engine`,
    JSON.stringify({
      tripId: '00000000-0000-0000-0000-000000000001',
      newStatus: 'driver_waiting',
    }),
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  );

  responseTime.add(res.timings.duration);
  check(res, { 'status is 200 or 400': (r) => [200, 400, 429].includes(r.status) });
}
```

```javascript
// tests/load/activate-license.js
export const options = {
  vus: 20,
  duration: '60s',
  thresholds: {
    // يستثني rate_limit_exceeded من حساب الأخطاء
    'http_req_failed{exclude_rate_limit:true}': ['rate<0.01'],
  },
};
```

---

## REQ-17: Semantic Release

### الملفات المتأثرة

- `.releaserc.json` (جديد في root)
- `.github/workflows/release.yml` (جديد)

### التصميم

```json
// .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]"
      }
    ]
  ]
}
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**يعتمد على REQ-3** لأن Semantic Release يقرأ رسائل Conventional Commits.

**التثبيت:**

```bash
pnpm add -D -w semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/changelog \
  @semantic-release/git
```

---

## REQ-18: HMAC Webhook Verification

### الملفات المتأثرة

- `supabase/functions/zaincash-webhook/index.ts` (تعديل)

### التصميم

```typescript
async function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // مقارنة constant-time لمنع timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
```

**تدفق المعالجة في `zaincash-webhook`:**

```
POST /functions/v1/zaincash-webhook
  │
  ├─ هل X-ZainCash-Signature موجود؟
  │   └─ لا → 400 "Missing signature"
  │
  ├─ هل ZAINCASH_SECRET مُهيَّأ؟
  │   └─ لا → log warn + 503 "Webhook not configured"
  │
  ├─ احسب HMAC-SHA256(body, secret)
  │   └─ لا يتطابق → log warn (IP + prefix) + 401 "Invalid signature"
  │
  └─ يتطابق → تابع منطق الدفع الحالي
```

**يستخدم `crypto.subtle`** المدمج في Deno — لا حاجة لمكتبات خارجية.

---

## REQ-19: Optimistic UI Updates

### الملفات المتأثرة

- `apps/mobile/src/hooks/useTrips.ts` (تعديل `useDriverTrips` و`useSubscriptions`)

### التصميم

#### نمط Optimistic Update

```typescript
// في useDriverTrips
const updateTripStatus = useCallback(
  async (tripId: string, newStatus: TripStatus) => {
    // 1. تحقق من صحة الانتقال
    const currentTrip = trips.find((t) => t.id === tripId);
    if (!currentTrip) return;

    if (!canTransition(currentTrip.status, newStatus)) {
      setError('انتقال حالة غير صالح');
      return;
    }

    // 2. احفظ snapshot قبل التحديث
    const snapshot = [...trips];
    setIsPending(true);

    // 3. تحديث optimistic
    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, status: newStatus } : t)));

    // 4. timeout للـ rollback
    const timeoutId = setTimeout(() => {
      setTrips(snapshot);
      setIsPending(false);
      setError('انتهت مهلة الاستجابة');
    }, 30000);

    try {
      // 5. استدعاء الخادم
      const { error } = await supabase.functions.invoke('trip-engine', {
        body: { tripId, newStatus },
      });

      clearTimeout(timeoutId);

      if (error) {
        // 6a. فشل → rollback
        setTrips(snapshot);
        setError(error.message);
      } else {
        // 6b. نجاح → re-fetch كامل (لا merge مباشر)
        await fetchTrips();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setTrips(snapshot);
      setError(getErrorMessage(err));
    } finally {
      setIsPending(false);
    }
  },
  [trips, fetchTrips],
);
```

**معالجة Realtime أثناء `isPending`:**

```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
  if (isPendingRef.current) {
    // تجاهل الـ optimistic state وطبّق قيمة الخادم
    setIsPending(false);
  }
  fetchTrips();
})
```

**`isPendingRef`** يُستخدم بدلاً من `isPending` state داخل callback الـ Realtime لتجنب stale closure.

---

## REQ-20: pg_stat_statements

### الملفات المتأثرة

- `supabase/migrations/2026051202_pg_stat_statements.sql` (جديد)
- `apps/admin/src/app/analytics/page.tsx` (تعديل)

### التصميم

#### Migration

```sql
-- 2026051202_pg_stat_statements.sql

-- 1. تفعيل الامتداد
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. View للاستعلامات البطيئة
CREATE OR REPLACE VIEW public.slow_queries AS
SELECT
  query,
  calls,
  ROUND((mean_exec_time)::numeric, 2) AS mean_exec_time,
  ROUND((total_exec_time)::numeric, 2) AS total_exec_time,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 3. صلاحية القراءة للـ admin dashboard
GRANT SELECT ON public.slow_queries TO authenticated;
```

#### تعديل `analytics/page.tsx`

يُضاف قسم "Query Performance" في نهاية الصفحة:

```typescript
interface SlowQuery {
  query: string;
  calls: number;
  mean_exec_time: number;
  total_exec_time: number;
  rows: number;
}

// في الـ component:
const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
const [queryMonitoringAvailable, setQueryMonitoringAvailable] = useState(true);

const fetchSlowQueries = async () => {
  const { data, error } = await supabaseClient.from('slow_queries').select('*');

  if (error) {
    setQueryMonitoringAvailable(false);
    return;
  }
  setSlowQueries(data ?? []);
};
```

**عرض الجدول:** يُعرض `mean_exec_time` بـ ms مقرّباً لمنزلتين عشريتين. عند عدم توفر الامتداد تُعرض رسالة "Query monitoring not available".

---

## Data Models

### SecureStorage Adapter Interface

```typescript
interface SecureStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

### RetryOptions (packages/core)

```typescript
export interface RetryOptions {
  maxRetries?: number; // default: 3
  baseDelayMs?: number; // default: 500ms
  maxDelayMs?: number; // default: 30000ms
  shouldRetry?: (error: unknown) => boolean; // default: () => true
}
```

### SlowQuery (Admin Analytics)

```typescript
interface SlowQuery {
  query: string;
  calls: number;
  mean_exec_time: number; // ms, rounded to 2 decimal places
  total_exec_time: number; // ms
  rows: number;
}
```

### ErrorBoundary State

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number; // max 3
}
```

### OTel Span Attributes

```typescript
// Root span attributes for Edge Functions
interface EdgeFunctionSpanAttributes {
  'service.name': string; // 'trip-engine' | 'send-notification'
  'http.method': string;
  'http.url': string;
  'http.status_code': number;
}
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Retry resolves after N failures then success

_For any_ function `fn` that fails exactly N times (N ≤ maxRetries) then succeeds, `retryWithBackoff(fn, { maxRetries })` SHALL resolve with the success value.

**Validates: Requirements 13.8**

### Property 2: Retry throws last error after exhaustion

_For any_ function `fn` that always fails, `retryWithBackoff(fn, { maxRetries: N })` SHALL throw the exact error from the Nth+1 attempt (not a wrapper error).

**Validates: Requirements 13.4**

### Property 3: shouldRetry=false causes immediate throw

_For any_ error `e` where `shouldRetry(e) === false`, `retryWithBackoff(fn, { shouldRetry })` SHALL throw `e` immediately without any delay or additional retry.

**Validates: Requirements 13.5**

### Property 4: NetInfo online evaluation is deterministic

_For any_ `NetInfoState` value, `evaluateState(state)` SHALL return `false` if `isConnected === false`, `false` if `isInternetReachable === false`, and `true` otherwise (including `null`).

**Validates: Requirements 6.5, 6.6, 6.7, 6.8**

### Property 5: Optimistic rollback preserves snapshot

_For any_ trip list and any failed server call, after rollback the `trips` state SHALL be byte-for-byte identical to the snapshot captured immediately before the optimistic update.

**Validates: Requirements 19.4**

### Property 6: HMAC verification is constant-time

_For any_ two signatures of equal length, the comparison time SHALL not vary based on the position of the first differing character (constant-time comparison).

**Validates: Requirements 18.2**

### Property 7: SecureStore round-trip preserves data

_For any_ valid `Subscription` object, `saveActiveSubscription(sub)` followed by `getActiveSubscription()` SHALL return an object equivalent to `sub` (assuming `end_date` is in the future).

**Validates: Requirements 14.2, 14.3, 5.4**

### Property 8: Soft-delete excludes records from reads

_For any_ record with `deleted_at IS NOT NULL`, all RLS-filtered queries on `trips` and `subscriptions` SHALL NOT return that record.

**Validates: Requirements 9.7**

---

## Error Handling

### REQ-2 (Error Boundary)

- Fallback UI hardcoded — لا بيانات ديناميكية إذا رمى الـ fallback نفسه خطأً.
- بعد 3 محاولات: زر معطَّل + رسالة "أعد تشغيل التطبيق".

### REQ-5 (Secure Storage)

- إذا فشل SecureStore: `logger.warn` + fallback إلى AsyncStorage.
- لا يُرمى خطأ للمستخدم.

### REQ-7 (Push Token Cleanup)

- إذا فشل حذف token: `logger.error` + استمرار معالجة باقي الـ tokens.
- لا يُعيد الخطأ للمستدعي.

### REQ-11 (Sentry)

- إذا لم يُهيَّأ DSN: التطبيق يعمل بشكل طبيعي.
- `captureException` مُغلَّف بـ try/catch — لا يكسر الـ logger.

### REQ-12 (OpenTelemetry)

- إذا لم يُهيَّأ `OTEL_EXPORTER_OTLP_ENDPOINT`: no-op mode بدون أخطاء.

### REQ-13 (Backoff)

- يُرمى خطأ المحاولة الأخيرة مباشرةً (لا wrapper).
- `shouldRetry=false` → رمي فوري بدون تأخير.

### REQ-14 (Offline Cache)

- JSON تالف → حذف + إعادة `null`.
- حجم > 2048 bytes → `logger.warn` + تخطي التخزين.

### REQ-18 (HMAC)

- `ZAINCASH_SECRET` غائب → 503.
- Signature غائب → 400.
- Signature خاطئ → 401 + log.

### REQ-19 (Optimistic UI)

- فشل الخادم → rollback فوري.
- Timeout 30s → rollback + `isPending=false`.
- `canTransition=false` → لا تحديث، `isPending=false`، رسالة خطأ.

### REQ-20 (pg_stat_statements)

- الامتداد غير متوفر → رسالة "Query monitoring not available" بدون crash.

---

## Testing Strategy

### نهج الاختبار المزدوج

يُستخدم نهجان تكامليان:

1. **Unit/Example Tests:** للحالات المحددة والـ edge cases والتكامل بين المكوّنات.
2. **Property-Based Tests:** للخصائص الشاملة عبر مدخلات عشوائية (حيث ينطبق).

### مكتبة Property-Based Testing

**`fast-check`** للـ TypeScript/JavaScript (Node + React Native):

```bash
pnpm add -D -w fast-check
```

كل property test يُشغَّل بـ 100 iteration كحد أدنى.

### تصنيف الاختبارات لكل متطلب

| المتطلب                     | نوع الاختبار                       | الملف                         |
| --------------------------- | ---------------------------------- | ----------------------------- |
| REQ-1 (Strict TS)           | Smoke — `pnpm typecheck`           | CI                            |
| REQ-2 (Error Boundary)      | Example — render + catch           | `ErrorBoundary.test.tsx`      |
| REQ-3 (Commitlint)          | Smoke — `commitlint --from HEAD~1` | CI                            |
| REQ-4 (CODEOWNERS)          | Smoke — file exists                | CI                            |
| REQ-5 (Secure Storage)      | Property — round-trip              | `secureStorage.test.ts`       |
| REQ-6 (NetInfo)             | Property — evaluateState           | `useNetworkStatus.test.ts`    |
| REQ-7 (Push Cleanup)        | Example — mock Expo API            | `send-notification.test.ts`   |
| REQ-8 (Security Headers)    | Example — Next.js headers          | `next.config.test.ts`         |
| REQ-9 (Soft Delete)         | Integration — migration dry-run    | CI                            |
| REQ-10 (ADR)                | Smoke — files exist                | CI                            |
| REQ-11 (Sentry)             | Example — init without DSN         | `sentry.test.ts`              |
| REQ-12 (OTel)               | Example — no-op when no endpoint   | `otel.test.ts`                |
| REQ-13 (Backoff)            | **Property** — fast-check          | `packages/core/index.test.ts` |
| REQ-14 (Offline Cache)      | Property — round-trip              | `offlineCache.test.ts`        |
| REQ-15 (Pact)               | Contract — Pact framework          | `*.pact.test.ts`              |
| REQ-16 (k6)                 | Load — k6 scripts                  | `tests/load/`                 |
| REQ-17 (Semantic Release)   | Smoke — dry-run                    | CI                            |
| REQ-18 (HMAC)               | Property — HMAC verification       | `zaincash-webhook.test.ts`    |
| REQ-19 (Optimistic UI)      | Property — rollback invariant      | `useTrips.test.ts`            |
| REQ-20 (pg_stat_statements) | Integration — view exists          | CI                            |

### Property Test Tags

كل property test يُعلَّق بـ:

```typescript
// Feature: uniride-production-readiness, Property 1: retry resolves after N failures
it.prop([fc.integer({ min: 0, max: 3 })])('...', async (failCount) => { ... });
```

### Unit Test Balance

- Unit tests تُركّز على: حالات محددة، edge cases، نقاط التكامل.
- Property tests تُغطي: المدخلات العشوائية والخصائص الشاملة.
- لا تُكرَّر نفس الحالة في كلا النوعين.
