#!/usr/bin/env python3
import argparse
import json
import os
import sys
from typing import Any, Dict, List, Optional

import requests

BASE = "https://api.steampowered.com"


def get(url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    r = requests.get(url, params=params, timeout=15)
    r.raise_for_status()
    ct = r.headers.get("content-type", "")
    if "json" in ct:
        return r.json()
    # Steam sometimes returns text/html on errors; try parse anyway when status 200
    try:
        return r.json()
    except Exception:
        return {"raw": r.text}


def get_player_summaries(key: str, steam_id: str) -> Dict[str, Any]:
    data = get(
        f"{BASE}/ISteamUser/GetPlayerSummaries/v0002/",
        {"key": key, "steamids": steam_id},
    )
    players = data.get("response", {}).get("players", [])
    return players[0] if players else {}


def get_friend_list(key: str, steam_id: str) -> List[Dict[str, Any]]:
    try:
        data = get(
            f"{BASE}/ISteamUser/GetFriendList/v0001/",
            {"key": key, "steamid": steam_id, "relationship": "friend"},
        )
        return data.get("friendslist", {}).get("friends", [])
    except requests.HTTPError as e:
        # Often 403 if profile privacy blocks it
        return []


def get_owned_games(key: str, steam_id: str) -> Dict[str, Any]:
    return get(
        f"{BASE}/IPlayerService/GetOwnedGames/v0001/",
        {
            "key": key,
            "steamid": steam_id,
            "include_appinfo": 1,
            "include_played_free_games": 1,
            "format": "json",
        },
    ).get("response", {})


def get_recently_played(key: str, steam_id: str) -> Dict[str, Any]:
    return get(
        f"{BASE}/IPlayerService/GetRecentlyPlayedGames/v0001/",
        {"key": key, "steamid": steam_id, "count": 20},
    ).get("response", {})


def get_steam_level(key: str, steam_id: str) -> Optional[int]:
    try:
        data = get(
            f"{BASE}/IPlayerService/GetSteamLevel/v1/",
            {"key": key, "steamid": steam_id},
        )
        return data.get("response", {}).get("player_level")
    except requests.HTTPError:
        return None


def get_player_achievements(key: str, steam_id: str, appid: int) -> Optional[Dict[str, Any]]:
    # Not all games support achievements API
    url = f"{BASE}/ISteamUserStats/GetPlayerAchievements/v1/"
    try:
        return get(url, {"key": key, "steamid": steam_id, "appid": appid}).get("playerstats")
    except requests.HTTPError:
        return None


def dump(key: str, steam_id: str, include_achievements: bool, achievements_limit: int) -> Dict[str, Any]:
    result: Dict[str, Any] = {"steam_id": steam_id}
    result["profile"] = get_player_summaries(key, steam_id)

    friends = get_friend_list(key, steam_id)
    result["friends_count"] = len(friends)
    # Keep only friend steamids to keep JSON compact; up to 50 for preview
    result["friends_preview"] = [f.get("steamid") for f in friends[:50]]

    owned = get_owned_games(key, steam_id)
    result["owned_games_count"] = owned.get("game_count", 0)
    games = owned.get("games", [])
    # Keep compact structure for games
    result["owned_games"] = [
        {
            "appid": g.get("appid"),
            "name": g.get("name"),
            "playtime_forever_min": g.get("playtime_forever"),
            "playtime_2weeks_min": g.get("playtime_2weeks"),
        }
        for g in games
    ]

    recent = get_recently_played(key, steam_id)
    result["recently_played_count"] = recent.get("total_count", 0)
    result["recently_played"] = recent.get("games", [])

    result["steam_level"] = get_steam_level(key, steam_id)

    if include_achievements:
        # Achievements for first N games that likely support stats
        ach: Dict[str, Any] = {}
        count = 0
        for g in games:
            appid = g.get("appid")
            if not isinstance(appid, int):
                continue
            stats = get_player_achievements(key, steam_id, appid)
            if stats and "achievements" in stats:
                ach[str(appid)] = {
                    "game": g.get("name"),
                    "achievements_unlocked": sum(1 for a in stats["achievements"] if a.get("achieved") == 1),
                    "achievements_total": len(stats["achievements"]),
                }
                count += 1
            if count >= achievements_limit:
                break
        result["achievements_summary"] = ach

    # Totals
    total_minutes = sum(int(g.get("playtime_forever", 0) or 0) for g in games)
    result["totals"] = {"playtime_minutes": total_minutes, "playtime_hours": round(total_minutes / 60, 1)}

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Dump Steam data using Steam Web API key")
    parser.add_argument("--key", default=os.getenv("STEAM_API_KEY"), help="Steam Web API key (or set STEAM_API_KEY env)")
    parser.add_argument("--steam-id", required=True, help="SteamID64 to query")
    parser.add_argument("--out", default=None, help="Write JSON output to file path")
    parser.add_argument("--achievements", action="store_true", help="Include achievements summary (slower)")
    parser.add_argument("--achievements-limit", type=int, default=5, help="How many games to fetch achievements for")

    args = parser.parse_args()

    if not args.key:
        print("Error: missing API key. Use --key or set STEAM_API_KEY.", file=sys.stderr)
        sys.exit(2)

    try:
        data = dump(args.key, args.steam_id, args.achievements, args.achievements_limit)
    except requests.HTTPError as e:
        # Surface Steam errors clearly
        print(f"Steam API error: {e}", file=sys.stderr)
        if e.response is not None:
            print(e.response.text[:300], file=sys.stderr)
        sys.exit(1)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Wrote: {args.out}")
    else:
        print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
