"use client";

import { useEffect, useState } from 'react';
import { Api } from '../lib/api';
import { Badge } from './ui/badge';
import { Card, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Gamepad2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { GameSummary } from '@game-tracker/shared';

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

export function GameList() {
  const [page, setPage] = useState(1);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await Api.games(page);
      setGames((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
      setPage((p) => p + 1);
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {games.length === 0 && !loading && (
        <div className="rounded-md border border-dashed border-muted-foreground p-8 text-center">
          <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No games yet. Go to <Link href="/settings" className="underline">Settings</Link> to connect your Steam account.
          </p>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                <Link href={`/games/${game.id}`} className="hover:underline">
                  {game.name}
                </Link>
              </CardTitle>
              {game.rating && <Badge className="bg-accent/20 text-accent-foreground">{game.rating.toFixed(1)}</Badge>}
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
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button onClick={load} disabled={loading} variant="secondary">
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
