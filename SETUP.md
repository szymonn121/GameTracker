# Game Tracker Dashboard - Setup Instructions

## Quick Commands Reference

```powershell
# Clone and install
git clone https://github.com/szymonn121/GameTracker.git
cd GameTracker
npm install

# Setup database (first time)
cd apps/api
npx prisma migrate dev
cd ../..

# Start development server (both API and web)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Database commands
npx prisma studio                    # Open DB admin UI
npx prisma migrate dev               # Run migrations
npx prisma migrate deploy            # Deploy migrations to production
npx prisma generate                  # Regenerate Prisma client

# Export Steam data (optional)
python scripts/steam_dump.py

# Code quality
npm run lint                         # Check for linting errors
npm run type-check                   # TypeScript type checking
```

## Prerequisites
- Node.js 18+ installed
- npm installed
- Python 3.8+ (for optional Steam data export script)

## Database Setup

By default, the application uses **SQLite** for local development, which requires no setup. For production, use PostgreSQL.

### Development (SQLite - Default)
No setup required. Database file is created automatically at `apps/api/prisma/dev.db`.

### Production (PostgreSQL)

#### Option 1: Docker PostgreSQL (Recommended)
```powershell
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/

# Start PostgreSQL container
docker run --name game-tracker-db `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=game_tracker `
  -p 5432:5432 -d postgres:15

# Database will be available at:
# postgresql://postgres:postgres@localhost:5432/game_tracker
```

#### Option 2: Cloud Database (Supabase/Neon)
```powershell
# Sign up at https://supabase.com or https://neon.tech
# Create a new PostgreSQL database
# Copy the connection string
```

## Installation Steps

1. **Clone & Install Dependencies**
```powershell
cd c:\Users\szkub\OneDrive\Pulpit\SteamStats
npm install
```

2. **Setup Database**
```powershell
cd apps/api
npx prisma migrate dev
npx prisma generate
cd ../..
```

3. **Configure Environment Variables**
Copy `.env.example` to `.env` and update:
```powershell
cp .env.example .env
```

Edit `.env`:
```env
# Database (SQLite for dev, PostgreSQL for production)
DATABASE_URL=file:./apps/api/prisma/dev.db
# OR for PostgreSQL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/game_tracker

# Required: Get from https://steamcommunity.com/dev/apikey
STEAM_API_KEY=your-steam-web-api-key

# Authentication secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production

# Web frontend URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

4. **Run the Application**
```powershell
npm run dev
```

This starts:
- **Frontend (Next.js)**: http://localhost:3000
- **Backend (Express)**: http://localhost:4000

## Steam Data Export (Optional)

To manually export your Steam library data for testing:

```powershell
# Set your Steam API key first
$env:STEAM_API_KEY = "your-key-here"

# Run the export script
python scripts/steam_dump.py
```

This creates `steam_dump.json` which is automatically imported when you log in.

## Login Flow

1. Click "Log in with Steam" on the login page
2. Complete Steam OpenID authentication
3. Backend automatically:
   - Creates/updates your user account
   - Generates `steam_dump.json` with your library data
   - Imports games into the database
4. Dashboard displays your games and playtime metrics
5. Data persists across sessions

## Troubleshooting

### "Environment variable not found: DATABASE_URL"
- Ensure `.env` file exists in project root
- Check DATABASE_URL is set correctly
- Restart the dev server after changing `.env`

### "No games showing on dashboard"
- Log in again to trigger data import
- Check API logs for import status
- Verify Steam API key is valid
- Database should populate automatically after login

### Port already in use (3000 or 4000)
- Change `PORT` in `.env` for API
- Next.js will auto-increment from 3000

### TypeScript errors in IDE
- Run: `npm run build` to check for actual errors
- Restart VS Code TypeScript server: Ctrl+Shift+P → "TypeScript: Restart TS Server"

## Production Deployment

1. **Set environment variables:**
   - Use PostgreSQL (not SQLite)
   - Set strong `JWT_SECRET`
   - Update `NEXT_PUBLIC_API_BASE_URL` to your domain
   - Ensure `STEAM_OPENID_REALM` matches your domain

2. **Build for production:**
```powershell
npm run build
npm run start
```

3. **Hosting options:**
   - **Frontend**: Vercel, Netlify, AWS CloudFront
   - **API**: Railway, Render, Heroku, AWS EC2
   - **Database**: Supabase, AWS RDS, Railway

## Multi-user Support

The application supports multiple concurrent users:
- Each user logs in independently via Steam
- Data is isolated by user ID in the database
- No shared demo data interferes with production users
- Suitable for public hosting


Visit http://localhost:3001 to see the dashboard!
