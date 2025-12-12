import { DashboardData, GameSummary, UserProfile } from '@game-tracker/shared';
import { apiBaseUrl } from './utils';

export interface FriendRequestItem {
  id: string;
  from: { displayName?: string | null; email: string };
  status?: string;
}

export interface FriendListItem {
  id: string;
  displayName?: string | null;
  since: string | Date;
  status?: string;
}

export interface MatchSuggestion {
  userId: string;
  displayName?: string | null;
  score: number;
  reasons?: string[];
}

export interface SimilarGame {
  id: string;
  name: string;
  score?: number;
  reasons?: string[] | string;
  reason?: string;
}

export interface GameDetailResponse {
  game: GameSummary & {
    screenshots?: string[];
    genres?: string[] | string;
    tags?: string[] | string;
    rating?: number;
    releaseDate?: string | Date;
    summary?: string;
  };
  hltb?: { main?: string; completionist?: string };
  similar?: SimilarGame[];
  playtime?: { hours?: number };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Get token from localStorage (client-side) or env override (server-side build-time)
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('auth_token')
    : process.env.NEXT_PUBLIC_API_TOKEN;
    
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const Api = {
  dashboard: () => request<DashboardData>('/dashboard'),
  games: (page = 1) => request<{ items: GameSummary[]; hasMore: boolean }>(`/games?page=${page}`),
  gameDetail: (id: string) => request<GameDetailResponse>(`/games/${id}`),
  recommendations: () => request<MatchSuggestion[]>('/matchmaking/recommendations'),
  friends: () => request<FriendListItem[]>('/friends'),
  friendRequests: () => request<FriendRequestItem[]>('/friends/requests'),
  sendFriendRequest: (userId: string) => request<void>('/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ toUserId: userId })
  }),
  profile: () => request<UserProfile>('/profile'),
  updateProfile: (data: Partial<UserProfile>) => request<UserProfile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  me: () => request<{
    steamId: string;
    avatar?: string;
    nickname?: string;
    profileUrl?: string;
    games: Array<{
      appid: number;
      name: string;
      playtime_forever: number;
      playtime_hours: number;
      img_icon_url: string;
      img_logo_url: string;
    }>;
  }>('/auth/me')
};
