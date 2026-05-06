# Local Development & Setup

Follow these instructions to set up the UniRide monorepo locally.

## 📋 Prerequisites
- Node.js (v20+)
- PNPM (v8+)
- PostgreSQL (Local or hosted, e.g., Supabase)
- Expo CLI

## 🛠️ Initial Setup

1. **Install Dependencies:**
   Run this command at the root of the project to install all workspace packages.
   ```bash
   pnpm install
   ```

2. **Environment Variables:**
   You will need to set up `.env` files for the API server and Mobile app.
   
   **Backend (`artifacts/api-server/.env`)**
   ```env
   PORT=3000
   SESSION_SECRET=your_super_secret_jwt_key
   WHATSAPP_TOKEN=your_meta_graph_api_token
   WHATSAPP_PHONE_ID=your_whatsapp_phone_number_id
   DATABASE_URL=postgresql://user:password@localhost:5432/uniride
   ```
   
   **Mobile (`artifacts/mobile/.env`)**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

3. **Database Setup:**
   Run Drizzle migrations to generate the schema in your Postgres database.
   ```bash
   cd lib/db
   pnpm run push
   ```

## 🚀 Running the Application

To run the entire stack concurrently, use the root scripts or run them in separate terminals.

**Start the API Server:**
```bash
cd artifacts/api-server
pnpm run dev
```

**Start the Mobile App:**
```bash
cd artifacts/mobile
pnpm run dev
```
*(Press `a` to open in Android emulator, `i` for iOS simulator, or scan the QR code with the Expo Go app).*

## 🧹 Code Quality
Run type-checking across the entire monorepo:
```bash
pnpm run typecheck
```