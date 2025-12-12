"use client";

import { useEffect, useState } from 'react';
import { Api } from '../lib/api';
import { Badge } from './ui/badge';
import { Card, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Gamepad2, ArrowUpDown, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { GameSummary } from '@game-tracker/shared';

type SortType = 'playtime' | 'alphabetical';

const safeParseGenres = (genres: unknown): string[] => {
  if (Array.isArray(genres)) return genres;
  if (typeof genres === 'string') {
    try {
      const parsed = JSON.parse(genres);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const sortGames = (games: GameSummary[], sortBy: SortType): GameSummary[] => {
  const sorted = [...games];
  if (sortBy === 'playtime') {
    return sorted.sort((a, b) => {
      const hoursA = a.playtime?.hours || 0;
      const hoursB = b.playtime?.hours || 0;
      return hoursB - hoursA;
    });
  } else {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
};

export function GameList() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>('playtime');

  const loadAllGames = async () => {
    setLoading(true);
    try {
      let allGames: GameSummary[] = [];
      let page = 1;
      let hasMore = true;

      // Load all games by fetching all pages
      while (hasMore) {
        const res = await Api.games(page);
        allGames = [...allGames, ...res.items];
        hasMore = res.hasMore;
        page++;
      }

      // Sort games by current sort preference
      const sorted = sortGames(allGames, sortBy);
      setGames(sorted);
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSort: SortType) => {
    if (newSort === sortBy) return;
    setSortBy(newSort);
    setGames(prev => sortGames(prev, newSort));
  };

  useEffect(() => {
    loadAllGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={() => handleSortChange('playtime')}
          variant={sortBy === 'playtime' ? 'default' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          Playtime
        </Button>
        <Button
          onClick={() => handleSortChange('alphabetical')}
          variant={sortBy === 'alphabetical' ? 'default' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          Alphabetical
        </Button>
      </div>

      <div className="space-y-3">
        {games.length === 0 && !loading && (
          <div className="rounded-md border border-dashed border-muted-foreground p-8 text-center">
            <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No games yet. Go to <Link href="/settings" className="underline">Settings</Link> to connect your Steam account.
            </p>
          </div>
        )}
        {loading && (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">Loading all games...</p>
          </div>
        )}
        {games.map((game) => (
          <Card key={game.id} className="flex items-center gap-4">
            {game.coverUrl ? (
              <Image src={game.coverUrl} alt={game.name} width={80} height={80} className="rounded-md object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-md bg-secondary/60">
                <Gamepad2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <CardContent className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">
                    <Link href={`/games/${game.id}`} className="hover:underline">
                      {game.name}
                    </Link>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className="bg-green-500 text-white flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {(game.playtime?.hours || 0).toFixed(1)}h
                  </Badge>
                  {game.rating && <Badge className="bg-blue-500 text-white whitespace-nowrap">{(game.rating / 10).toFixed(1)}★</Badge>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{game.summary}</p>
              {game.genres && (
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(game.genres) ? game.genres : safeParseGenres(game.genres))
                    .slice(0, 3)
                    .map((genre) => (
                      <Badge key={genre} className="bg-secondary/70 text-xs text-foreground">
                        {genre}
                      </Badge>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
