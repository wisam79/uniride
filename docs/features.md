# Features & User Roles

UniRide supports three distinct roles, each with custom workflows and permissions.

## 🎓 1. Student (الطالب)
- **Browse Routes:** Search and filter available drivers traveling from specific areas in Baghdad to specific universities (e.g., Baghdad University, Mustansiriya).
- **Gender Preferences:** Search for routes that match gender requirements (e.g., Female-only buses).
- **Subscribe to Plan:** Purchase monthly subscriptions for a specific route.
- **Daily Booking:** Request a trip on an active subscription.
- **Real-time Tracking:** View driver status (Online/Offline) and estimated fare/time.
- **Reviews:** Rate drivers at the end of a subscription or trip.

## 🚐 2. Driver (السائق)
- **Route Management:** Create daily routes specifying departure times (morning/evening), origin, destination, and vehicle type.
- **Capacity Management:** Set maximum seat capacity. The system automatically handles available seat counts and prevents overbooking.
- **Gender Preferences:** Drivers can restrict their routes to specific genders.
- **Passenger Management:** View active subscribers and accept/reject daily trip requests.
- **Earnings Dashboard:** Track daily and weekly earnings directly in the app.
- **Attendance:** Notify students via the app if they are absent on a given day.

## 🛡️ 3. Admin (المدير)
- **Activation Codes:** Generate, distribute, and revoke activation codes required for drivers or special student accounts.
- **Analytics:** Monitor total active routes, daily trips, and platform revenue.
- **Support & Mediation:** Resolve disputes and oversee the entire system.

## 🔑 Core Platform Features
- **WhatsApp OTP:** Passwordless login using WhatsApp for fast and secure verification of Iraqi phone numbers (`+964`).
- **Idempotency:** Prevents double-charging or duplicate subscriptions if a user taps a button twice.
- **Offline Sync & Caching:** Designed to handle intermittent internet connections efficiently.