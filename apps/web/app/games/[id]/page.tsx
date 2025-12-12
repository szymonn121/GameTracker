import Image from 'next/image';
import { Api, GameDetailResponse, SimilarGame } from '../../../lib/api';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Clock3, Share2 } from 'lucide-react';

export default async function GameDetailPage({ params }: { params: { id: string } }) {
  const data: GameDetailResponse = await Api.gameDetail(params.id);
  const game = data.game;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[240px,1fr]">
        <div className="relative h-64 w-full overflow-hidden rounded-xl">
          {game.coverUrl && <Image src={game.coverUrl} alt={game.name} fill className="object-cover" />}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase text-muted-foreground">Game</p>
              <h1 className="text-3xl font-bold">{game.name}</h1>
            </div>
            <Button variant="secondary" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
          <p className="text-muted-foreground">{game.summary}</p>
          <div className="flex flex-wrap gap-2">
            {game.genres?.map((genre: string) => (
              <Badge key={genre} className="bg-secondary/70 text-foreground">
                {genre}
              </Badge>
            ))}
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Rating: {game.rating ?? 'n/a'}</span>
            <span>Release: {game.releaseDate ?? 'n/a'}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Playtime vs HLTB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              You played: {data.playtime?.hours ?? 0}h
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Main story: {data.hltb?.main ?? '—'}
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Completionist: {data.hltb?.completionist ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Screenshots</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {game.screenshots?.map((shot: string) => (
              <div key={shot} className="relative h-32 overflow-hidden rounded-lg">
                <Image src={shot} alt="screenshot" fill className="object-cover" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Similar games</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {data.similar?.map((sim: SimilarGame) => {
            const reasons = Array.isArray(sim.reasons)
              ? sim.reasons
              : typeof sim.reasons === 'string'
                ? (() => { try { return JSON.parse(sim.reasons as string); } catch { return []; } })()
                : [];
            const label = reasons[0] ?? sim.reason ?? 'match';
            return (
              <div key={sim.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                <div>
                  <p className="font-medium">{sim.name}</p>
                  <p className="text-xs text-muted-foreground">Score {sim.score?.toFixed(2)}</p>
                </div>
                <Badge className="bg-accent/20 text-accent-foreground">{label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
