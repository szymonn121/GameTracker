import { Api, FriendListItem, FriendRequestItem } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { UserIcon, Check, X } from 'lucide-react';

async function getData() {
  const [friends, requests] = await Promise.all([Api.friends(), Api.friendRequests()]);
  return { friends, requests };
}

export default async function FriendsPage() {
  const { friends, requests } = await getData();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-muted-foreground">Social</p>
        <h1 className="text-2xl font-bold">Friends</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {requests.map((req: FriendRequestItem) => (
            <div key={req.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5" />
                <div>
                  <p className="font-medium">{req.from.displayName}</p>
                  <p className="text-xs text-muted-foreground">{req.from.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="gap-1">
                  <Check className="h-4 w-4" /> Accept
                </Button>
                <Button size="sm" variant="ghost" className="gap-1">
                  <X className="h-4 w-4" /> Decline
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Friends list</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {friends.map((friend: FriendListItem) => (
            <div key={friend.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
              <div>
                <p className="font-medium">{friend.displayName}</p>
                <p className="text-xs text-muted-foreground">since {new Date(friend.since).toLocaleDateString()}</p>
              </div>
              <Badge className="bg-primary/20 text-primary-foreground">{friend.status ?? 'active'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
