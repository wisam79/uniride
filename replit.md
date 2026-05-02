# يونيرايد — UniRide Iraq

## Overview

تطبيق موبايل (Expo/React Native) لربط طلاب الجامعات بالسائقين في العراق عبر اشتراكات شهرية، مع واجهة خلفية Express + PostgreSQL كاملة.

## Stack

- **Monorepo**: pnpm workspaces
- **Mobile**: Expo ~54.0.27, React Native 0.81.5, expo-router ~6.0.17
- **API Server**: Express 5 + Drizzle ORM + PostgreSQL (JWT auth)
- **Database**: PostgreSQL (Replit managed), Drizzle ORM + drizzle-zod
- **Node.js**: 24 · TypeScript 5.9

## Architecture

```
artifacts/
  mobile/         — Expo app (Arabic RTL, student+driver UI)
  api-server/     — REST API (Express 5, JWT auth, esbuild)
lib/
  db/             — Drizzle schema + DB client
  api-spec/       — OpenAPI spec + codegen
```

## Database Schema

- `users` — طلاب وسائقون (role: student|driver), JWT auth, subscription plans, online status, rating
- `trips` — رحلات (status: waiting→accepted→pickup→inprogress→arrived→completed|cancelled), 85/15 commission, driverRating field
- `subscriptions` — اشتراكات شهرية (basic/standard/premium)

## API Routes

- `POST /api/auth/register` — تسجيل مستخدم جديد → JWT token
- `POST /api/auth/login` — تسجيل الدخول برقم الهاتف
- `GET /api/auth/me` — بيانات المستخدم الحالي
- `PATCH /api/auth/me` — تحديث الملف الشخصي
- `GET /api/drivers` — السائقون المتاحون (isOnline=true)
- `GET /api/drivers/all` — جميع السائقين
- `PATCH /api/drivers/online` — تغيير حالة التوفر
- `POST /api/trips` — طلب رحلة جديدة
- `GET /api/trips/active` — الرحلة النشطة الحالية
- `GET /api/trips/pending` — الطلبات المنتظرة (للسائق)
- `GET /api/trips/history` — سجل الرحلات
- `PATCH /api/trips/:id/status` — تحديث حالة الرحلة
- `DELETE /api/trips/:id` — إلغاء رحلة
- `GET /api/subscriptions/me` — اشتراك الطالب الحالي
- `GET /api/subscriptions/driver` — اشتراكات السائق
- `POST /api/subscriptions` — اشتراك جديد
- `DELETE /api/subscriptions/:id` — إلغاء اشتراك
- `POST /api/ratings` — تقييم رحلة مكتملة (1-5 نجوم) + تحديث متوسط تقييم السائق
- `GET /api/ratings/driver/:driverId` — متوسط تقييم السائق وعدد التقييمات

## Mobile App Structure

```
app/
  index.tsx          — redirect to onboarding or tabs
  onboarding.tsx     — animated welcome + role select + register/login (redesigned)
  (tabs)/
    index.tsx        — home: student books ride, driver goes online (major redesign)
    trips.tsx        — active trip + history with filter tabs + pull-to-refresh
    subscription.tsx — student plans / driver earnings dashboard
    profile.tsx      — user profile + settings + achievements
    _layout.tsx      — tab bar with pending request badge
components/
  FeatherIcon.tsx         — SVG icons (web)
  FeatherIcon.native.tsx  — Feather icons (native)
  TripStatusCard.tsx      — trip progress stepper + phone call + ETA + fare display
  DriverCard.tsx          — expandable driver card with star ratings + plans
  SubscriptionCard.tsx    — premium glassmorphism subscription card
  RatingModal.tsx         — 5-star rating modal with comment
  LoadingSkeleton.tsx     — animated skeleton loading (SkeletonBox, DriverCardSkeleton, TripItemSkeleton, StatBoxSkeleton)
  EarningsChart.tsx       — 7-day animated bar chart (react-native Animated, no SVG)
  EmptyState.tsx          — reusable empty state with icon + action button
  UniversityPicker.tsx    — Iraqi university selector modal with search
  PriceBreakdown.tsx      — 85%/15% fare breakdown with visual bar
  TripTimeline.tsx        — vertical timeline for trip detail view
  AnimatedCounter.tsx     — animated number counter with Arabic formatting
  TripMap.tsx             — web SVG stub
  TripMap.native.tsx      — MapView (react-native-maps 1.18.0)
context/
  AppContext.tsx      — real API calls (JWT + polling every 8s) + rateDriver + weeklyEarningsData + monthlyEarnings + isRefreshing + pollError
hooks/
  useColors.ts       — theme color hook
  useLocation.ts     — GPS location hook with expo-location + fallback to Baghdad
lib/
  api.ts             — fetch client with JWT Bearer headers
```

## Key Technical Notes

- Auth: JWT tokens (30d), stored in AsyncStorage, Bearer header on all API calls
- Polling: AppContext polls `/trips/active` + `/trips/pending` every 8 seconds
- Commission: 85% driver / 15% app (calculated on trip completion)
- Icons: FeatherIcon uses react-native-svg paths on web, @expo/vector-icons on native
- Maps: react-native-maps@1.18.0 (DO NOT upgrade, DO NOT add to app.json plugins)
- Platform files: TripMap.native.tsx (MapView), TripMap.tsx (web stub)
- API URL in mobile: `https://${EXPO_PUBLIC_DOMAIN}/api`
- DO NOT use console.log in server — use req.log or logger singleton
- DB table names: `tripsTable` and `usersTable` (not `trips`/`users`) in @workspace/db/schema
- Design system: Primary #1A3C6E, Accent #FF6B35, Background #F5F7FA, RTL Arabic

## Key Commands

```bash
pnpm --filter @workspace/db push-force   # push schema to DB
pnpm --filter @workspace/api-server run dev  # run API locally
pnpm --filter @workspace/mobile run dev  # run Expo
```

## Test Accounts (pre-seeded)

- Driver: أحمد محمد | 07701234567
- Driver: علي حسين العبيدي | 07809876543
- Driver: محمد صالح الجبوري | 07601112233
