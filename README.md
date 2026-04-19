# ReList (HAWKIFY-style Marketplace)

Full-stack marketplace app for second-hand goods.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MySQL 8

## Key Features
- JWT auth (register/login via email or mobile)
- User profile and password updates
- Listings create/read/update/delete
- Search and city filtering
- Nearby listing suggestions (lat/lng based)
- Multi-image upload with watermarking (`R4R`)
- Favorites
- Direct and listing-based chat
- Unread chat notifications
- Admin moderation for users and listings

## Monorepo Structure
- `frontend/` - React app
- `backend/` - Express API
- `mobile/` - React Native (Expo) app
- `backend/sql/schema.sql` - schema + seed data
- `backend/sql/migration_v2.sql`, `backend/sql/migration_v3.sql` - migrations for older DBs

## Prerequisites
- Node.js 18+
- npm 9+
- MySQL 8 (or Docker)

## Local Setup
1. Install dependencies from repo root:
   ```bash
   npm install
   ```
2. Start MySQL (Docker option):
   ```bash
   docker compose up -d
   ```
3. Create env files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp mobile/.env.example mobile/.env
   ```
   Set `VITE_MOBILE_APP_URL` in `frontend/.env` to enable the navbar "Download Mobile App" button.
4. Update `backend/.env` DB values to match your MySQL instance.
   - If using this repo's `docker-compose.yml`, use `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USER=root`, `DB_PASSWORD=password`, `DB_NAME=hawkify_clone`.
5. Initialize database:
   ```bash
   mysql -uroot -ppassword < backend/sql/schema.sql
   ```
   For existing older setups, you can also run:
   ```bash
   mysql -uroot -ppassword < backend/sql/migration_v2.sql
   mysql -uroot -ppassword < backend/sql/migration_v3.sql
   ```
6. Run backend:
   ```bash
   npm run dev:backend
   ```
7. Run frontend (new terminal):
   ```bash
   npm run dev:frontend
   ```
8. Run mobile app (new terminal):
   ```bash
   npm run dev:mobile
   ```
   Then press `a` for Android emulator, `i` for iOS simulator, or scan the QR in Expo Go.
   If using a physical phone, set `EXPO_PUBLIC_API_BASE` in `mobile/.env` to your computer LAN URL (example: `http://192.168.0.104:4000/api`), not `localhost`.

Frontend default: `http://localhost:5173`  
Backend default: `http://localhost:4000`

## Scripts (Root)
- `npm run dev:backend` - run backend in watch mode
- `npm run dev:frontend` - run frontend with Vite dev server
- `npm run dev:mobile` - run Expo dev server for the React Native app

## API Docs
- Swagger UI: `http://localhost:4000/api-docs`
- Health check: `http://localhost:4000/health`

## Important Notes
- Uploaded files are stored in `backend/uploads/` and served from `/uploads/*`.
- A seeded admin user is included in `schema.sql`:
  - Email: `admin@r4r.local`
  - Password: `Admin@123`
