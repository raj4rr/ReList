# ReList (HAWKIFY-style Marketplace)

Full-stack marketplace for second-hand goods.

## Stack
- Frontend: React + Vite + Tailwind + shadcn-style components
- Backend: Node.js + Express
- Database: MySQL

## Features (MVP)
- User registration/login with JWT
- Login via email or mobile
- Profile and password update
- Create and browse listings
- Listing search by text/city
- Nearby listing suggestions via location coordinates
- Upload listing images
- Auto-watermark uploaded images with `R4R`
- Save favorites
- Start chats and send messages
- Chat unread notifications
- Mark listing as sold (owner only)
- Edit listing
- My Listings page
- Admin panel for listing/user moderation
# Permission Commands
-sudo chown -R $(whoami) ~/.npm
## Project structure
- `/frontend` React app
- `/backend` Express API
- `/backend/sql/schema.sql` DB schema + seed categories

## Run locally
1. Start MySQL:
   - `docker compose up -d`
2. Copy env files:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env`
3. Install dependencies:
   - `npm install`
4. Initialize DB schema:
   - `mysql -uroot -ppassword < backend/sql/schema.sql`
   - If you already have an old DB and want to migrate:
     - `mysql -uroot -ppassword < backend/sql/migration_v2.sql`
     - `mysql -uroot -ppassword < backend/sql/migration_v3.sql`
5. Start backend:
   - `npm run dev:backend`
6. Start frontend (new terminal):
   - `npm run dev:frontend`

## API highlights
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/listings`
- `POST /api/listings` (multipart form-data)
- `GET /api/favorites`
- `POST /api/chats/start`
- `GET /api/chats/:chatId/messages`
- `POST /api/chats/:chatId/messages`

## Notes
- Uploaded images are stored in `backend/uploads` and served via `/uploads/*`.
- Default admin user:
  - Email: `admin@r4r.local`
  - Password: `Admin@123`
- This is an MVP baseline; production hardening should add refresh tokens, moderation tooling, caching, and full test coverage.
