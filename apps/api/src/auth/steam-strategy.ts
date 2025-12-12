/**
 * Steam Passport Strategy (DEPRECATED)
 *
 * This file is no longer used. Modern Steam OpenID 2.0 is handled directly in routes/index.ts.
 *
 * Reason: The passport-steam library has compatibility issues with current Steam OpenID 2.0 spec.
 * The SteamAuth class in steam-openid.ts is the correct, working implementation.
 *
 * If you need Passport.js integration, use the routes-based approach which properly validates
 * OpenID responses and extracts steamid64 without external strategy libraries.
 */

export {};
