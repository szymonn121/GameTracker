# SteamStats - Game Tracker Dashboard

Full-stack monorepo dla dashboardu Steam z integracją RAWG API, autentykacją przez Steam OpenID i funkcjami społecznościowymi.

## Stack
- **Frontend**: Next.js 14 (App Router, TypeScript), TailwindCSS, shadcn/ui
- **Backend**: Express (TypeScript), Prisma + SQLite, Steam OpenID
- **Shared**: TypeScript types package

## 🎮 Funkcje

### ✅ Logowanie przez Steam OpenID
- **Użytkownicy NIE potrzebują własnego Steam API key**
- Kliknij "Zaloguj przez Steam" → przekierowanie do Steam → automatyczne utworzenie konta
- Backend automatycznie pobiera:
  - Avatar użytkownika
  - Nickname
  - SteamID64
  - Listę gier (jeśli profil publiczny)
  - Czas gry w każdej grze

### 📊 Dashboard
- Statystyki playtime (łączne godziny, trendy miesięczne)
- Top 5 gatunków według czasu gry
- Ostatnio grane gry
- Rekomendacje gier

### 🎯 Inne funkcje
- Lista wszystkich gier z biblioteki Steam
- Szczegóły gry (z RAWG API)
- System znajomych
- Matchmaking (sugestie graczy o podobnych gustach)

## 🚀 Szybki start

### 1. Instalacja
\`\`\`bash
npm install
\`\`\`

### 2. Konfiguracja Steam API

**WAŻNE:** Tylko administrator aplikacji potrzebuje Steam Web API Key!

1. Przejdź do: https://steamcommunity.com/dev/apikey
2. Zaloguj się przez Steam
3. Wprowadź nazwę domeny: `localhost` (dla developmentu)
4. Skopiuj wygenerowany klucz

### 3. Wypełnij plik `.env`

\`\`\`env
# Twój Steam Web API Key (TYLKO backend)
STEAM_API_KEY=TWOJ_KLUCZ_TUTAJ

# Opcjonalnie: RAWG API dla lepszych danych o grach
RAWG_API_KEY=
\`\`\`

### 4. Uruchom bazę danych
\`\`\`bash
npx prisma migrate dev
npx prisma generate
\`\`\`

### 5. Uruchom aplikację
\`\`\`bash
npm run dev
\`\`\`

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## 🔐 Jak działa autentykacja?

### Dla użytkowników:
1. Kliknij "Zaloguj przez Steam" na stronie /login
2. Zostaniesz przekierowany na stronę Steam
3. Zaloguj się na Steam (jeśli nie jesteś zalogowany)
4. Potwierdź logowanie do aplikacji
5. Zostaniesz automatycznie przekierowany z powrotem - zalogowany!

### Dla dewelopera:
1. **Steam OpenID** weryfikuje tożsamość użytkownika (bez jego API key)
2. Po zalogowaniu backend używa **TWOJEGO Steam API Key** do pobrania:
   - Profilu użytkownika (`GetPlayerSummaries`)
   - Listy gier użytkownika (`GetOwnedGames`)
3. Token JWT jest zapisywany w `localStorage`
4. Kolejne requesty zawierają token w headerze `Authorization: Bearer <token>`

## 📡 Endpointy API

### Autentykacja
- `GET /auth/steam` - Rozpocznij logowanie przez Steam
- `GET /auth/steam/return` - Callback po logowaniu Steam
- `GET /auth/me` - Pobierz dane zalogowanego użytkownika (wymaga tokenu)

### Dane
- `GET /dashboard` - Dashboard ze statystykami
- `GET /games` - Lista gier
- `GET /games/:id` - Szczegóły gry
- `GET /profile` - Profil użytkownika
- `PUT /profile` - Aktualizacja profilu

## 🛠 Scripts

\`\`\`bash
npm run dev              # Uruchom frontend + backend
npm run build            # Build produkcyjny
npm run lint             # Lint całego projektu
npm run prisma:migrate   # Migracje bazy danych
npm run prisma:studio    # GUI bazy danych
\`\`\`

## 📝 Uwagi

- **STEAM_API_KEY** jest używany TYLKO na backendzie
- Użytkownicy logują się przez **Steam OpenID** (nie potrzebują własnego klucza)
- Jeśli użytkownik ma prywatny profil Steam, lista gier będzie pusta
- RAWG API key jest opcjonalny - służy do wzbogacania danych o grach

## 🔒 Bezpieczeństwo

✅ Steam Web API Key jest TYLKO w `.env` na serwerze  
✅ Użytkownicy logują się przez oficjalny Steam OpenID  
✅ JWT token przechowywany bezpiecznie w localStorage  
✅ CORS skonfigurowany dla localhost:3000  

## 📦 Struktura projektu

\`\`\`
apps/
  api/          # Express backend
  web/          # Next.js frontend
packages/
  shared/       # Współdzielone typy TypeScript
\`\`\`
