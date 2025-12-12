# 📡 API Endpoint Reference

## Authentication Endpoints

### 🔑 Initiate Steam Login
```
GET /auth/steam
```
Redirects user to Steam OpenID login page.

**No authentication required**

**Response:** 302 Redirect to Steam

**URL:** `https://steamcommunity.com/openid/login?openid.ns=...`

---

### 🔄 Steam OpenID Callback
```
GET /auth/steam/return
```
Called by Steam after user logs in. Internal endpoint (not called by frontend).

**Query Parameters (from Steam):**
- `openid.ns` - OpenID namespace
- `openid.mode` - Should be "id_res"
- `openid.claimed_id` - Contains steamid64 (extracted by backend)
- `openid.assoc_handle` - Association handle
- `openid.signed` - Signed parameters
- `openid.sig` - Signature
- *(and others)*

**Response:** 302 Redirect to `/auth/callback?token=<JWT>`

**Redirect URL:** `http://localhost:3000/auth/callback?token=eyJhbGc...`

---

### 👤 Get Current User Profile
```
GET /auth/me
Authorization: Bearer <JWT_TOKEN>
```
Fetch logged-in user's Steam profile and games.

**Authentication:** ✅ Required

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "steamId": "76561198000000000",
  "avatar": "https://avatars.steamstatic.com/...",
  "nickname": "PlayerName",
  "profileUrl": "https://steamcommunity.com/profiles/76561198000000000",
  "games": [
    {
      "appid": 570,
      "name": "Dota 2",
      "playtime_forever": 36000,
      "playtime_hours": 600.0,
      "img_icon_url": "https://media.steampowered.com/steamcommunity/public/images/apps/570/icon.ico",
      "img_logo_url": "https://media.steampowered.com/steamcommunity/public/images/apps/570/logo.png"
    }
  ]
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid or expired token
- **404 Not Found** - User not found
- **500 Server Error** - Server error (check logs)

---

### 🎮 Get Game Statistics
```
GET /api/stats/:appid
Authorization: Bearer <JWT_TOKEN>
```
Fetch user's stats for a specific game.

**Authentication:** ✅ Required

**Path Parameters:**
- `appid` (number) - Steam app ID (e.g., 570 for Dota 2)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request:**
```bash
GET /api/stats/570
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "steamid": "76561198000000000",
  "appid": 570,
  "stats": [
    {
      "name": "total_kills",
      "value": 12345
    },
    {
      "name": "total_deaths",
      "value": 4567
    },
    {
      "name": "total_matches",
      "value": 890
    }
  ],
  "achievements": [
    {
      "name": "first_win",
      "achieved": 1
    },
    {
      "name": "reach_level_25",
      "achieved": 1
    }
  ]
}
```

**Error Responses:**
- **400 Bad Request** - Invalid appid format
- **401 Unauthorized** - Invalid or expired token
- **403 Forbidden** - User's profile is private
- **404 Not Found** - Game not found or no stats available
- **500 Server Error** - Server error (check logs)

---

## Legacy Authentication Endpoints (Deprecated)

### 📝 Register with Email
```
POST /auth/register
Content-Type: application/json
```
**Deprecated:** Use Steam OpenID instead

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
- **400 Bad Request** - Email already registered or missing fields
- **500 Server Error** - Server error

---

### 🔐 Login with Email
```
POST /auth/login
Content-Type: application/json
```
**Deprecated:** Use Steam OpenID instead

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid credentials
- **500 Server Error** - Server error

---

## Existing Endpoints (Still Available)

These endpoints from your original implementation are still available:

### Dashboard
```
GET /dashboard
Authorization: Bearer <JWT_TOKEN>
```

### Games
```
GET /games
GET /games/:id
```

### Friends
```
GET /friends
GET /friends/requests
POST /friends/requests
POST /friends/accept/:id
DELETE /friends/:friendId
```

### Matchmaking
```
GET /matchmaking/recommendations
```

### Profile
```
GET /profile
PUT /profile
```

### Sync
```
POST /sync/import
```

---

## JWT Token Format

### Token Structure
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "76561198000000000@steam.local",
  "steamId": "76561198000000000",
  "iat": 1702416000,
  "exp": 1703020800
}
```

### Token Lifetime
- **Expires in:** 7 days
- **Algorithm:** HS256 (HMAC SHA-256)
- **Secret:** `JWT_SECRET` environment variable

### Using the Token
```bash
# In Authorization header
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# Or as cookie (if frontend uses cookies)
curl -X GET http://localhost:4000/auth/me \
  -H "Cookie: auth_token=<TOKEN>"
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong",
  "details": "Additional information (development mode only)"
}
```

### HTTP Status Codes
- **200** - Success
- **400** - Bad Request (invalid parameters)
- **401** - Unauthorized (invalid token or no auth)
- **403** - Forbidden (profile is private)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (email already registered)
- **500** - Internal Server Error (server error)
- **503** - Service Unavailable (Steam API down)

---

## Rate Limiting

All endpoints are rate-limited:
- **Window:** 60 seconds
- **Max requests:** 60 per window
- **Response:** 429 Too Many Requests

---

## CORS Configuration

**Allowed Origins:**
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `FRONTEND_URL` environment variable (if set)

**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers:** Content-Type, Authorization

---

## Example Workflows

### Complete Login Flow
```
1. Frontend: GET /auth/steam
   Backend: Redirects to Steam OpenID
   
2. User: Logs in on Steam
   Steam: Redirects back with openid.*
   
3. Backend: GET /auth/steam/return?openid.*=...
   Backend: Validates OpenID response
   Backend: Extracts steamid64
   Backend: Creates/finds user
   Backend: Creates JWT token
   Backend: Redirects to /auth/callback?token=...
   
4. Frontend: Receives token
   Frontend: Stores token in localStorage/sessionStorage
   
5. Frontend: Sends request with token
   GET /auth/me
   Headers: Authorization: Bearer <TOKEN>
   
6. Backend: Validates token
   Backend: Fetches user data from Steam API
   Backend: Returns user profile and games
   
7. Frontend: Receives user data
   Frontend: Displays profile and games
```

### Fetch Game Stats
```
1. Frontend: User clicks on game to see stats
   
2. Frontend: GET /api/stats/570
   Headers: Authorization: Bearer <TOKEN>
   
3. Backend: Validates token
   Backend: Extracts steamId from token
   Backend: Calls Steam API with steamId + appid
   Backend: Returns stats
   
4. Frontend: Displays stats
```

### Handle Errors
```
1. Private Profile
   Backend: Steam API returns 403
   Backend: Returns 403 to frontend
   Frontend: Shows "Profile is private" message
   
2. No Stats for Game
   Backend: Steam API returns empty stats
   Backend: Returns 404 to frontend
   Frontend: Shows "No stats available" message
   
3. Expired Token
   Backend: JWT validation fails
   Backend: Returns 401
   Frontend: Redirects to login
```

---

## Testing with cURL

### Login Flow
```bash
# Step 1: Get Steam OpenID URL
curl -X GET http://localhost:4000/auth/steam -L

# Step 2: Manual - Navigate browser to URL and log in
# Browser: https://steamcommunity.com/openid/login?...

# Step 3: Browser will redirect to callback with token
# Result: http://localhost:3000/auth/callback?token=<JWT>
```

### Get User Profile
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Get Game Stats
```bash
curl -X GET http://localhost:4000/api/stats/570 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Test Error Handling
```bash
# Invalid token
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer invalid_token"

# Missing token
curl -X GET http://localhost:4000/auth/me

# Invalid appid
curl -X GET http://localhost:4000/api/stats/invalid \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Response Time Expectations

- **Cache hit:** < 50ms
- **Database query:** < 100ms
- **Steam API call (first time):** 500-2000ms
- **Steam API call (cached):** < 50ms

---

## Rate Limiting Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702417200
```

---

**Last Updated:** December 12, 2024  
**API Version:** 1.0  
**Status:** Production Ready ✅
