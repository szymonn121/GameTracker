import { Api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PlaytimeChart } from '../components/charts/playtime-chart';
import { TopGenresChart } from '../components/charts/top-genres-chart';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Recommendation } from '@game-tracker/shared';

async function getDashboard() {
  return Api.dashboard();
}

export default async function DashboardPage() {
  const data = await getDashboard();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase text-muted-foreground">Welcome back</p>
        <h1 className="text-3xl font-bold text-gradient">Your Game Tracker</h1>
        <p className="text-muted-foreground">Recent playtime, trends, and tailored recs in one view.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.playtime.recentGames.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <span>{g.name}</span>
                <Badge className="bg-secondary/50 text-foreground">{g.genres?.[0] ?? '—'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{data.playtime.totalHours.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">Across Steam library</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recommendations.slice(0, 3).map((rec: Recommendation) => (
              <div key={rec.game.id} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{rec.game.name}</p>
                  <p className="text-muted-foreground">{rec.reasons[0]}</p>
                </div>
                <Badge className="bg-accent/20 text-accent-foreground">{rec.score.toFixed(2)}</Badge>
              </div>
            ))}
            <Link href="/matchmaking" className="inline-flex items-center text-sm text-primary hover:underline">
              See all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly playtime</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaytimeChart data={data.playtime.monthlyHours} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most played games</CardTitle>
          </CardHeader>
          <CardContent>
            <TopGenresChart data={data.playtime.topGenres} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Friends activity</CardTitle>
            <p className="text-sm text-muted-foreground">Recent milestones from your circle</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/friends">Open feed</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.activity.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <Badge className="bg-primary/20 text-primary-foreground">{item.type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
