# UniRide (يونيرايد)

🎓 **UniRide** is a comprehensive platform designed to facilitate transportation for university students in Iraq. It connects students with verified drivers, managing subscriptions, daily routes, and payments with a focus on safety and reliability.

## 📚 Documentation
This repository contains detailed documentation to help you understand, run, and contribute to the project:

- [**System Architecture**](./docs/architecture.md) - Learn about the monorepo structure, database design, and tech stack.
- [**Features & User Roles**](./docs/features.md) - Detailed breakdown of what Students, Drivers, and Admins can do.
- [**Local Development & Setup**](./docs/development.md) - Step-by-step guide to setting up the environment and running the apps.
- [**Testing Strategy**](./docs/testing.md) - Overview of the extensive 10-layer testing system covering security, concurrency, and performance.

## 🚀 Tech Stack Overview

- **Mobile App:** Expo, React Native, Supabase SDK, React Context API.
- **Backend API:** Express.js, TypeScript, JSON Web Tokens (JWT), Meta Graph API (WhatsApp OTP).
- **Database:** PostgreSQL, Drizzle ORM, Row Level Security (RLS).
- **Workspace:** PNPM Monorepo.
- **Testing:** Vitest.

---
*Built to streamline student mobility across Iraqi Universities.*
