# ReList — Full-Stack Classifieds & Marketplace Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.x-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/express-4.x-lightgrey.svg)](https://expressjs.com/)
[![Expo](https://img.shields.io/badge/expo-51.x-black.svg)](https://expo.dev/)
[![MySQL](https://img.shields.io/badge/mysql-8.0-00758F.svg)](https://www.mysql.com/)

**ReList** is a modern, high-performance, full-stack second-hand marketplace application built for Web, Mobile, and REST API services. Inspired by platforms like OLX and HAWKIFY, it features multi-platform user authentication, geo-location listing search, multi-image upload with custom watermarking, real-time in-app messaging, favorites, and comprehensive admin moderation tools.

---

## 📋 Table of Contents

- [Features](#-features)
- [Monorepo Architecture](#-monorepo-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start & Local Setup](#-quick-start--local-setup)
- [Database Setup & Migrations](#-database-setup--migrations)
- [Environment Configuration](#-environment-configuration)
- [Available NPM Scripts](#-available-npm-scripts)
- [API Documentation](#-api-documentation)
- [Default Admin Credentials](#-default-admin-credentials)
- [Mobile App (Expo) Tips](#-mobile-app-expo-tips)

---

## ✨ Features

- **🔐 Authentication & User Profiles**
  - Register and log in securely via email or mobile number with JWT session management.
  - Manage user profiles, contact details, profile picture, and password updates.

- **🛍️ Listing Management**
  - Create, edit, feature, and delete listings.
  - Multi-image uploads (up to 10 images per listing, up to 10MB each) with automatic dynamic watermark branding (`R4R`).
  - Status tracking (Active, Sold, Inactive).

- **🔍 Search & Geo-Location Filtering**
  - Search listings by title/description keywords and category selection.
  - City-based filtering backed by comprehensive Indian city seed data (`cities` table).
  - Haversine distance-based nearby listing suggestions using latitude and longitude coordinates.

- **❤️ Favorites & Saving**
  - Save items to personal favorites list for quick access and price tracking.

- **💬 Real-Time Chat & Messaging**
  - Direct buyer-to-seller messaging tied to specific listings.
  - Unread message indicators and notification counters.

- **🛡️ Admin Moderation Dashboard**
  - Role-based user control (Manage, Block/Unblock users).
  - Listing moderation (Approve, Flag, Remove suspicious listings).

- **📱 Cross-Platform Mobile Experience**
  - React Native app built with Expo targeting iOS and Android devices.

---

## 🏗 Monorepo Architecture

```
ReList/
├── backend/            # Express.js REST API & MySQL Service
│   ├── sql/            # Database schemas, seeds, & migrations
│   │   ├── schema.sql              # Initial database schema & seed data
│   │   ├── india_cities_seed.sql   # Pre-loaded list of major Indian cities
│   │   ├── migration_v2.sql        # Migration script v2
│   │   └── migration_v3.sql        # Migration script v3
│   ├── src/
│   │   ├── routes/     # Auth, Listings, Chats, Favorites, Admin routes
│   │   ├── middleware/ # Authentication & File Upload middlewares
│   │   ├── utils/      # Watermarking, Password Hashing, Geolocation helpers
│   │   ├── db.js       # MySQL connection pool configuration
│   │   └── server.js   # Express app initialization & Swagger setup
│   └── uploads/        # Stored product and listing images
├── frontend/           # React + Vite Web Application
│   ├── src/            # Components, Views, Hooks, and Styling
│   ├── public/         # Static assets and icons
│   └── tailwind.config.js # Custom utility styles & responsive breakpoints
├── mobile/             # React Native (Expo) Mobile Application
│   ├── App.js          # Main mobile application entrypoint & navigation
│   └── app.json        # Expo app configuration
├── docker-compose.yml  # Local MySQL 8 database service container
└── package.json        # Root workspace configuration & execution scripts
```

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, MySQL 8 (`mysql2/promise`), JWT, Multer, Sharp (Image Watermarking), Swagger OpenAPI 3.0
- **Mobile**: React Native, Expo SDK 51
- **Database**: MySQL 8.0 (Docker / Local)

---

## ⚙️ Prerequisites

Before running the application, ensure you have installed:
- [Node.js](https://nodejs.org/) `>= 18.0.0`
- [npm](https://www.npmjs.com/) `>= 9.0.0`
- [Docker & Docker Compose](https://www.docker.com/) (Optional, recommended for MySQL) or local [MySQL 8](https://dev.mysql.com/downloads/mysql/) server
- [Expo Go App](https://expo.dev/client) (For testing mobile app on physical iOS/Android devices)

---

## 🚀 Quick Start & Local Setup

### 1. Clone & Install Dependencies

From the workspace root, run `npm install` to install all monorepo dependencies:
```bash
git clone https://github.com/raj4rr/ReList.git
cd ReList
npm install
```

### 2. Start Database Container (Docker)

Spin up a MySQL 8 container with preconfigured credentials:
```bash
docker compose up -d
```

---

## 🗄️ Database Setup & Migrations

Execute the schema script to initialize tables, seed default categories, and create the admin user:

```bash
# Initialize schema and seed base data
mysql -h 127.0.0.1 -u root -ppassword < backend/sql/schema.sql

# Seed major Indian cities
mysql -h 127.0.0.1 -u root -ppassword < backend/sql/india_cities_seed.sql
```

> **Note for Existing Databases:** If upgrading an older database instance, execute the migration scripts sequentially:
> ```bash
> mysql -h 127.0.0.1 -u root -ppassword < backend/sql/migration_v2.sql
> mysql -h 127.0.0.1 -u root -ppassword < backend/sql/migration_v3.sql
> ```

---

## 🔐 Environment Configuration

Create environment configuration files for each component:

### Backend (`backend/.env`)
```env
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173,https://olete.in
JWT_SECRET=your_super_secret_jwt_key
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=hawkify_clone
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE=http://localhost:4000/api
VITE_MOBILE_APP_URL=https://example.com/relist-app.apk
```

### Mobile (`mobile/.env`)
```env
# Use localhost for emulators, or your local LAN IP (e.g. http://192.168.1.100:4000/api) for physical devices
EXPO_PUBLIC_API_BASE=http://localhost:4000/api
```

---

## 🏃 Running the Application

Launch each workspace service using root NPM scripts:

| Workspace | Command | URL / Entrypoint |
| :--- | :--- | :--- |
| **Backend API** | `npm run dev:backend` | `http://localhost:4000` |
| **Frontend Web** | `npm run dev:frontend` | `http://localhost:5173` |
| **Mobile App** | `npm run dev:mobile` | Expo Metro Bundler |

---

## 📖 API Documentation

Interactive Swagger API documentation is served directly by the Express backend.

- **Swagger UI**: [http://localhost:4000/api-docs](http://localhost:4000/api-docs)
- **Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

### Key Endpoints Overview

| Route | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | User registration |
| `/api/auth/login` | `POST` | User authentication & JWT generation |
| `/api/auth/me` | `GET` | Fetch current authenticated user profile |
| `/api/listings` | `GET` / `POST` | Fetch filtered listings or create new listing |
| `/api/listings/:id` | `GET` / `PUT` / `DELETE` | View, update, or delete specific listing |
| `/api/favorites` | `GET` / `POST` / `DELETE` | View or toggle user favorite items |
| `/api/chats` | `GET` / `POST` | Fetch user conversations and send messages |
| `/api/admin/users` | `GET` / `PATCH` | Admin user moderation & status updates |
| `/api/admin/listings` | `GET` / `DELETE` | Admin listing review & deletion |

---

## 🔑 Default Admin Credentials

A default administrator account is included in `schema.sql`:

- **Email**: `admin@r4r.local`
- **Password**: `Admin@123`

---

## 📱 Mobile App (Expo) Notes

1. **Simulators / Emulators**:
   - Press `a` in the Expo terminal to open **Android Emulator**.
   - Press `i` in the Expo terminal to open **iOS Simulator**.
2. **Physical Devices (Expo Go)**:
   - Make sure your mobile device and host machine are on the same Wi-Fi network.
   - Set `EXPO_PUBLIC_API_BASE` in `mobile/.env` to your computer's local IP address (e.g., `http://192.168.x.x:4000/api`) instead of `localhost`.

