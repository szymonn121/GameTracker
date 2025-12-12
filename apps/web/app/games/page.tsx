import { GameList } from '../../components/game-list';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export const metadata = {
  title: 'Games | Game Tracker'
};

export default function GamesPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-muted-foreground">Library</p>
        <h1 className="text-2xl font-bold">Games</h1>
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
