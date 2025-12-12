# ⚡ Quick Setup Checklist - Steam Auth Refactor

## Before Running the Backend

- [ ] **1. Get Steam API Key**
  - Go to: https://steamcommunity.com/dev/apikey
  - Log in with your Steam account
  - Accept the API agreement
  - Copy your API key

- [ ] **2. Set Environment Variables**
  ```bash
  # .env file in apps/api/
  STEAM_API_KEY=your_key_from_step_1
  API_URL=http://localhost:4000
  FRONTEND_URL=http://localhost:3000
  ```

- [ ] **3. Install Dependencies**
  ```bash
  cd apps/api
  npm install
  ```

- [ ] **4. Run Database Migrations**
  ```bash
  npx prisma migrate dev
  ```

- [ ] **5. Start Backend**
  ```bash
  npm run dev
  ```

- [ ] **6. Verify Startup**
  Look for in console:
  ```
  ✓ Steam API Key configured (length: 32 chars)
  listening on port 4000
  ```

## Login Flow Test

- [ ] **User clicks "Login with Steam"** → Frontend redirects to `/auth/steam`
- [ ] **Backend redirects to Steam** → User logs in
- [ ] **Steam redirects back** → Backend validates OpenID
- [ ] **Backend creates JWT** → Redirects to `/auth/callback?token=...`
- [ ] **Frontend stores token** → Uses for subsequent API calls

## API Testing

### Get User Profile
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected response:**
```json
{
  "steamId": "76561198...",
  "avatar": "https://avatars.steamstatic.com/...",
  "nickname": "YourUsername",
  "games": [...]
}
```

### Get Game Stats
```bash
curl -X GET http://localhost:4000/api/stats/570 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected response:**
```json
{
  "steamid": "76561198...",
  "appid": 570,
  "stats": [...]
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "STEAM_API_KEY not set" | Add to `.env`: `STEAM_API_KEY=your_key` |
| "Invalid steamid" | Make sure your Steam profile is public |
| "Profile is private" | User needs to make profile public in Steam |
| "API Key invalid" | Verify key is complete (32+ chars) |
| CORS errors | Check `FRONTEND_URL` in backend `.env` |

## Key Implementation Details

✅ **Single Global API Key** - Not per-user, stored server-side only  
✅ **Steam OpenID** - Validates with Steam cryptographically  
✅ **JWT Tokens** - Contains `userId`, `email`, `steamId`  
✅ **No Frontend API Key** - Never exposed to client  
✅ **Error Handling** - Private profiles, missing stats, invalid keys  
✅ **Caching** - 1 hour for user data, 24 hours for game data  

## Files to Review

1. **[STEAM_AUTH_REFACTOR.md](./STEAM_AUTH_REFACTOR.md)** - Complete documentation
2. **[apps/api/src/routes/index.ts](./apps/api/src/routes/index.ts)** - All endpoints
3. **[apps/api/src/services/steam-service.ts](./apps/api/src/services/steam-service.ts)** - Steam API calls
4. **[apps/api/src/middleware/auth.ts](./apps/api/src/middleware/auth.ts)** - Token validation

## Next Steps

- [ ] Test login with real Steam account
- [ ] Verify all game data is fetched correctly
- [ ] Test error scenarios (private profile, invalid key, etc.)
- [ ] Deploy backend to production
- [ ] Update frontend to use new token format
- [ ] Monitor logs for any issues

---

**Status:** ✅ Refactoring complete  
**Tested:** Manual integration with Steam OpenID  
**Ready for:** Frontend integration and testing
