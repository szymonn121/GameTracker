import { Api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { MatchList } from '../../components/match-list';

async function getMatches() {
  return Api.recommendations();
}

export default async function MatchmakingPage() {
  const matches = await getMatches();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-muted-foreground">Social graph</p>
          <h1 className="text-2xl font-bold">Matchmaking</h1>
          <p className="text-muted-foreground">Suggested friends based on libraries, genres, and time-of-day play.</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/friends">
            <UserPlus className="mr-2 h-4 w-4" />
            View requests
          </Link>
        </Button>
      </div>

      <MatchList initialMatches={matches} />
    </div>
  );
}
