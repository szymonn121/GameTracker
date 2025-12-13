"use client";

import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Api, FriendSearchResult } from '../lib/api';
import { UserIcon, Search, Plus, Hourglass } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function FriendsAdd() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [message, setMessage] = useState('');

  const handleSearch = async () => {
    const term = query.trim();
    if (term.length < 2) {
      setMessage('Type at least 2 characters');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const data = await Api.searchFriends(term);
      setResults(data);
      if (data.length === 0) setMessage('No matches found');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (userId: string) => {
    setLoading(true);
    setMessage('');
    try {
      await Api.sendFriendRequest(userId);
      setResults((prev) => prev.map((r) => (r.id === userId ? { ...r, status: 'pending' } : r)));
      setMessage('Request sent');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search by display name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <Button onClick={handleSearch} disabled={loading} className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      <div className="space-y-2">
        {results.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {r.avatarUrl ? <AvatarImage src={r.avatarUrl} alt={r.displayName || 'User'} /> : <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>}
              </Avatar>
              <div>
                <p className="font-medium">{r.displayName || 'Unknown user'}</p>
                <p className="text-xs text-muted-foreground">{r.status === 'friend' ? 'Already friends' : r.status === 'pending' ? 'Request sent' : r.status === 'incoming' ? 'Incoming request' : 'Can send request'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {r.status === 'friend' && <Badge className="bg-primary/20 text-primary-foreground">Friend</Badge>}
              {r.status === 'pending' && <Badge className="bg-secondary/70 text-foreground">Pending</Badge>}
              {r.status === 'incoming' && <Badge className="bg-primary/30 text-primary-foreground">Incoming</Badge>}
              {r.status === 'can_invite' && (
                <Button size="sm" onClick={() => sendRequest(r.id)} disabled={loading} className="gap-1">
                  {loading ? <Hourglass className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
