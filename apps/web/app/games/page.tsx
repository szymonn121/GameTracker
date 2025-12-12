import { GameList } from '../../components/game-list';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Games | Game Tracker'
};

export default function GamesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-muted-foreground">Library</p>
          <h1 className="text-2xl font-bold">Games</h1>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/settings">
            <Plus className="mr-2 h-4 w-4" />
            Manage APIs
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All games</CardTitle>
        </CardHeader>
        <CardContent>
          <GameList />
        </CardContent>
      </Card>
    </div>
  );
}
