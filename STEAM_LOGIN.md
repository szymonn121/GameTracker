# 🎮 Logowanie przez Steam - Przewodnik

## Jak to działa?

### Dla użytkowników (proste!)
1. Kliknij **"Zaloguj przez Steam"**
2. Steam otworzy się w przeglądarce
3. Zaloguj się na swoje konto Steam
4. Potwierdź, że chcesz się zalogować
5. Gotowe! Zostaniesz przekierowany z powrotem do aplikacji

**NIE POTRZEBUJESZ żadnego API key!** To działa automatycznie.

---

## Dla administratora aplikacji

### 1. Uzyskaj Steam Web API Key

To jest **TWÓJ klucz** (nie użytkowników). Potrzebujesz go tylko raz.

1. Przejdź na: **https://steamcommunity.com/dev/apikey**
2. Zaloguj się przez Steam
3. W polu "Domain Name" wpisz: `localhost` (dla developmentu)
4. Kliknij "Register"
5. **Skopiuj wygenerowany klucz**

### 2. Dodaj klucz do `.env`

```env
STEAM_API_KEY=TWOJ_KLUCZ_TUTAJ
```

### 3. Uruchom serwery

```bash
npm run dev
```

---

## Architektura autentykacji

### Krok 1: Użytkownik klika "Zaloguj przez Steam"
```
Frontend → Backend (/auth/steam)
```
Backend generuje URL do Steam OpenID i przekierowuje użytkownika.

### Krok 2: Steam weryfikuje użytkownika
```
Steam OpenID sprawdza tożsamość użytkownika
```
Użytkownik loguje się na Steam i potwierdza logowanie do aplikacji.

### Krok 3: Steam zwraca SteamID
```
Steam → Backend (/auth/steam/return?openid.claimed_id=...)
```
Backend weryfikuje podpis OpenID i ekstrahuje SteamID64 użytkownika.

### Krok 4: Backend pobiera dane użytkownika
```
Backend używa TWOJEGO Steam API Key:
- GetPlayerSummaries(steamId) → avatar, nickname
- GetOwnedGames(steamId) → lista gier, czas gry
```

### Krok 5: Użytkownik otrzymuje token
```
Backend → Frontend (/auth/callback?token=JWT_TOKEN)
```
Token JWT jest zapisywany w localStorage i używany do kolejnych requestów.

---

## Endpointy

### `GET /auth/steam`
**Publiczny**  
Rozpoczyna proces logowania - przekierowuje do Steam OpenID.

### `GET /auth/steam/return`
**Publiczny (callback)**  
Steam zwraca tutaj użytkownika po zalogowaniu.  
Weryfikuje OpenID, tworzy/aktualizuje użytkownika, generuje JWT.

### `GET /auth/me`
**Wymaga autentykacji (Bearer token)**  
Zwraca pełne dane zalogowanego użytkownika:
```json
{
  "steamId": "76561198XXXXXXXXX",
  "avatar": "https://avatars.steamstatic.com/...",
  "nickname": "PlayerName",
  "profileUrl": "https://steamcommunity.com/id/...",
  "games": [
    {
      "appid": 730,
      "name": "Counter-Strike 2",
      "playtime_forever": 12345,
      "playtime_hours": 205.75
    }
  ]
}
```

---

## Bezpieczeństwo

✅ **Steam Web API Key nigdy nie trafia do frontendu**  
✅ **Użytkownicy logują się przez oficjalny Steam OpenID**  
✅ **Backend weryfikuje podpis OpenID przed zaakceptowaniem**  
✅ **JWT token jest podpisany i ma expiration**  
✅ **CORS ograniczony do localhost:3000**  

---

## FAQ

### Q: Czy użytkownicy potrzebują własnego Steam API Key?
**A:** NIE! Używają tylko logowania przez Steam.

### Q: Co jeśli użytkownik ma prywatny profil?
**A:** Lista gier będzie pusta, ale podstawowe dane (avatar, nick) nadal działają.

### Q: Jak sprawdzić czy jestem zalogowany?
**A:** Token JWT jest w `localStorage.getItem('auth_token')`.

### Q: Jak się wylogować?
**A:** Kliknij "Logout" w nawigacji lub `localStorage.removeItem('auth_token')`.

### Q: Gdzie jest używany STEAM_API_KEY?
**A:** Tylko w backendzie w `SteamService` do pobierania danych użytkowników.

---

## Troubleshooting

### "Auth failed" po przekierowaniu
- Sprawdź logi backendu - czy Steam zwrócił prawidłowy SteamID
- Upewnij się, że callback URL jest poprawny

### Brak danych o grach
- Użytkownik może mieć prywatny profil Steam
- Sprawdź czy `STEAM_API_KEY` jest ustawiony w `.env`
- Sprawdź logi backendu - czy są błędy z Steam API

### CORS errors
- Upewnij się, że frontend działa na `localhost:3000`
- Backend musi działać na `localhost:4000`
- Restart obu serwerów po zmianie CORS config
