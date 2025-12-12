export type Visibility = 'public' | 'private';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  favoriteGames: string[];
  visibility: Visibility;
  apiKeys?: ApiKeys;
}

export interface ApiKeys {
  steamKey?: string;
  steamId?: string;
}

export interface Friend {
  userId: string;
  friendId: string;
  since: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface GameSummary {
  id: string;
  name: string;
  coverUrl?: string;
  steamAppId?: number;
  igdbId?: number;
  genres?: string[];
  tags?: string[];
  summary?: string;
  rating?: number;
  releaseDate?: string;
  playtime?: { hours?: number };
}

export interface PlaytimeStats {
  totalHours: number;
  monthlyHours: { month: string; hours: number }[];
  topGenres: { genre: string; hours: number }[];
  recentGames: GameSummary[];
}

export interface Recommendation {
  game: GameSummary;
  score: number;
  reasons: string[];
}

export interface DashboardData {
  playtime: PlaytimeStats;
  recommendations: Recommendation[];
  activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'play' | 'achievement' | 'friend_joined';
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
