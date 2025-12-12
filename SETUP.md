# Game Tracker Dashboard - Setup Instructions

## Prerequisites
- Node.js 18+ installed
- npm installed

## Database Setup Options

You have three options to run this application:

### Option 1: Docker PostgreSQL (Recommended - Easiest)
```powershell
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/

# Start PostgreSQL container
docker run --name game-tracker-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=game_tracker -p 5432:5432 -d postgres:15

# Database will be available at: postgresql://postgres:postgres@localhost:5432/game_tracker
```

### Option 2: Local PostgreSQL Installation
```powershell
# Download installer from https://www.postgresql.org/download/windows/
# Install PostgreSQL with password 'postgres'
# Create database 'game_tracker'
```

### Option 3: Free Cloud Database (Supabase/Neon)
```powershell
# Sign up at https://supabase.com or https://neon.tech
# Create a new PostgreSQL database
# Copy the connection string and update DATABASE_URL in .env
```

## Installation Steps

1. **Install Dependencies**
```powershell
cd c:\Users\szkub\OneDrive\Pulpit\SteamStats
npm install
```

2. **Setup Database** (after choosing one of the options above)
```powershell
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

3. **Configure Environment Variables**
Edit `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/game_tracker"
STEAM_API_KEY=""  # Optional: Get from https://steamcommunity.com/dev/apikey
IGDB_CLIENT_ID=""  # Optional: Get from https://api-docs.igdb.com/
IGDB_CLIENT_SECRET=""  # Optional
```

4. **Run the Application**
```powershell
# From project root
npm run dev
```

This will start:
- Frontend (Next.js) at: http://localhost:3001
- Backend (Express API) at: http://localhost:4000

## Troubleshooting

### "Environment variable not found: DATABASE_URL"
- Make sure you've completed database setup
- Verify `.env` file exists in project root
- Check DATABASE_URL connection string is correct

### Port conflicts
- If ports 3001 or 4000 are in use, update:
  - `PORT` in `.env` for API
  - Next.js will auto-increment from 3000

### TypeScript errors in IDE
- Restart VS Code TypeScript server: Ctrl+Shift+P → "TypeScript: Restart TS Server"
- Run: `npm run build` to check for actual errors

## Quick Start (Docker Option)

If you have Docker Desktop installed:

```powershell
# 1. Start PostgreSQL
docker run --name game-tracker-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=game_tracker -p 5432:5432 -d postgres:15

# 2. Run migrations
cd apps/api
npx prisma migrate dev --name init

# 3. Start app
cd ../..
npm run dev
```

Visit http://localhost:3001 to see the dashboard!
