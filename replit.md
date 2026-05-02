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

- `users` — طلاب وسائقون (role: student|driver), JWT auth, subscription plans, online status, rating, gender, genderPreference, seatsCapacity
- `trips` — رحلات (status: waiting→accepted→pickup→inprogress→arrived→completed|cancelled), 85/15 commission, driverRating field
- `subscriptions` — اشتراكات شهرية (basic/standard/premium)
- `subscriptionCards` — بطاقات اشتراك (format: XXXX-XXXX-XXXX)
- `otpCodes` — رموز OTP للتحقق من الهاتف
- `routes` — خطوط السائقين الثابتة (fromArea, toUniversity, departureMorning, departureEvening, totalSeats, availableSeats, monthlyFare, genderPreference)
- `absences` — إشعارات غياب الطلاب للسائق

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
- `POST /api/ratings` — تقييم رحلة مكتملة (1-5 نجوم)
- `GET /api/ratings/driver/:driverId` — متوسط تقييم السائق
- `GET /api/routes` — خطوط السائقين المتاحة (يدعم filter بالجامعة)
- `GET /api/routes/my` — خطوط السائق الحالي
- `POST /api/routes` — إضافة خط جديد (سائق)
- `PATCH /api/routes/:id` — تحديث خط
- `DELETE /api/routes/:id` — حذف خط
- `POST /api/routes/:id/book` — حجز مقعد في خط → ينشئ اشتراك تلقائياً
- `POST /api/absences` — إشعار غياب من الطالب
- `GET /api/absences/driver` — غيابات طلاب السائق الحالي

## Mobile App Structure

```
app/
  index.tsx          — redirect to onboarding or tabs
  onboarding.tsx     — animated welcome + role select + register/login
  activate-card.tsx  — تفعيل بطاقة اشتراك
  (tabs)/
    index.tsx        — home: student books ride + routes filter, driver goes online + earnings
    trips.tsx        — active trip + history with filter tabs
    subscription.tsx — student plans / driver earnings dashboard
    profile.tsx      — user profile + settings + driver route management
    _layout.tsx      — tab bar with pending request badge
components/
  FeatherIcon.tsx         — SVG icons (web)
  FeatherIcon.native.tsx  — Feather icons (native)
  TripStatusCard.tsx      — trip progress stepper + phone call + ETA
  DriverCard.tsx          — expandable driver card with star ratings + plans
  SubscriptionCard.tsx    — subscription card component
  RatingModal.tsx         — 5-star rating modal
  LoadingSkeleton.tsx     — animated skeleton loading
  EarningsChart.tsx       — 7-day animated bar chart
  EmptyState.tsx          — reusable empty state (default export)
  UniversityPicker.tsx    — Iraqi university selector modal
  PriceBreakdown.tsx      — 85%/15% fare breakdown
  TripTimeline.tsx        — vertical timeline for trip detail
  AnimatedCounter.tsx     — animated number counter
  TripMap.tsx             — web SVG stub
  TripMap.native.tsx      — MapView (react-native-maps 1.18.0)
  RouteCard.tsx           — route card with seats, times, gender badge, book button
context/
  AppContext.tsx      — real API calls (JWT + polling every 8s) + routes state + absence notifications
hooks/
  useColors.ts       — theme color hook
  useLocation.ts     — GPS location hook
lib/
  api.ts             — fetch client with JWT Bearer headers
  universities.ts    — 40+ IRAQI_UNIVERSITIES, 30+ BAGHDAD_AREAS, formatIQD()
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
- DB table names: `routesTable`, `absencesTable`, etc. in @workspace/db/schema
- Design system: Primary #1A3C6E, Accent #FF6B35, Background #F5F7FA, RTL Arabic
- I18nManager.forceRTL(true) in _layout.tsx
- EmptyState is a DEFAULT export (not named export)
- Route booking auto-creates standard subscription (40 trips/month), deactivates previous
- Fares in IQD: formatIQD(80000) → "80k د.ع"

## Key Commands

```bash
pnpm --filter @workspace/db push-force   # push schema to DB
pnpm --filter @workspace/api-server run dev  # run API locally
pnpm --filter @workspace/mobile run dev  # run Expo
pnpm run typecheck                       # full TypeScript check
```

## Test Accounts (pre-seeded)

- Driver: أحمد محمد | 07701234567
- Driver: علي حسين العبيدي | 07809876543
- Driver: محمد صالح الجبوري | 07601112233
