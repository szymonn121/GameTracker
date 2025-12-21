# Konfiguracja Środowisk - GameTracker

## Zmienne Środowiskowe

Aplikacja obsługuje dwa środowiska:

### Development (Localhost)
- **API**: `http://localhost:4000`
- **Frontend**: `http://localhost:3000`
- **Port API**: 4000
- **Port Frontend**: 3000

### Production (46.59.10.17)
- **API**: `http://46.59.10.17:10380/api`
- **Frontend**: `http://46.59.10.17:10380`
- **Port API**: 10380
- **Port Frontend**: 10370

## Pliki Konfiguracji

### `.env` - Development Lokalny
Używaj tego pliku do lokalnego developmentu:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/game_tracker?schema=public"
JWT_SECRET=dev-secret-change-in-production
API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
STEAM_API_KEY=YOUR_KEY
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### `.env.local` - Alternatywa dla Development
Jeśli chcesz przesłonić ustawienia z `.env`, utwórz `.env.local`:
```env
# Zmienne które chcesz przesłonić
```

### `.env.production` - Production
Zmienne dla środowiska produkcji (46.59.10.17):
```env
API_URL=http://46.59.10.17:10380/api
FRONTEND_URL=http://46.59.10.17:10380
NEXT_PUBLIC_API_BASE_URL=http://46.59.10.17:10380/api
```

## Docker Compose

### Development - `docker-compose.yml`
```bash
docker-compose up -d
```
Porty:
- API: 4000
- Frontend: 10370
- PostgreSQL: 5432

### Production - `docker-compose.prod.yml`
```bash
docker-compose -f docker-compose.prod.yml up -d
```
Porty:
- API: 10380
- Frontend: 10370
- PostgreSQL: 5432

## Zmienne Wymagane dla Docker

Przed uruchomieniem docker-compose, ustaw zmienne w pliku `.env`:

```bash
# Niezbędne dla docker-compose
DB_PASSWORD=secure_password_123
JWT_SECRET=your_jwt_secret_min_32_chars
STEAM_API_KEY=your_steam_api_key

# Dla production
API_URL=http://46.59.10.17:10380/api
FRONTEND_URL=http://46.59.10.17:10380
```

## Proces Deploymentu

### 1. Skopiuj zmienne do serwera
```bash
scp .env.production user@46.59.10.17:.env
```

### 2. Utwórz `.env` na serwerze z wartościami produkcji
```bash
ssh user@46.59.10.17
cd /path/to/app
cat > .env << EOF
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
STEAM_API_KEY=your_steam_key
API_URL=http://46.59.10.17:10380/api
FRONTEND_URL=http://46.59.10.17:10380
EOF
```

### 3. Uruchom docker-compose.prod.yml
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Zmienne Systemowe Aplikacji

### Backend (apps/api)
- `PORT` - Port na którym słucha API (default: 4000)
- `DATABASE_URL` - Connection string PostgreSQL
- `JWT_SECRET` - Secret do JWT tokenów
- `STEAM_API_KEY` - API Key dla Steam
- `API_URL` - Publiczny URL API (dla CORS)
- `FRONTEND_URL` - URL frontendu (dla CORS)

### Frontend (apps/web)
- `NEXT_PUBLIC_API_BASE_URL` - Base URL do API (dostępne dla przeglądarki)
- `PORT` - Port na którym słucha Next.js (default: 3000)

## Testowanie Konfiguracji

### Sprawdzenie connectivity
```bash
curl http://46.59.10.17:10380/api/health
curl http://localhost:4000/health
```

### Sprawdzenie zmiennych w kontenerze
```bash
docker-compose exec api env | grep API_URL
docker-compose exec web env | grep NEXT_PUBLIC_API_BASE_URL
```

## Troubleshooting

### Błąd: "Connect ECONNREFUSED localhost:4000"
- Frontend nie może się połączyć z API
- Sprawdzić: `NEXT_PUBLIC_API_BASE_URL` w docker-compose.yml
- Upewnić się, że API container jest uruchomiony

### Błąd: "Mixed Content" (HTTPS warning)
- Jeśli frontend jest na HTTPS, API musi być też HTTPS
- Lub oba muszą być HTTP

### Błąd: CORS
- Sprawdzić `API_URL` i `FRONTEND_URL` w konfiguracji API
- Powinny zawierać poprawne adresy (z protokołem, bez trailing slash)

## Notatki

- **Nigdy** nie commituj `.env` do git
- Zawsze użyj `.env.example` jako szablonu
- Dla produkcji, ustaw silne hasła i bezpieczne sekrety
- Zmienne prefixem `NEXT_PUBLIC_` są dostępne w przeglądarce (nie umieszczaj w nich sekretów!)
