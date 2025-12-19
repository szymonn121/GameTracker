"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';
import { MatchSuggestion } from '../lib/api';
import { Api } from '../lib/api';

interface MatchListProps {
  initialMatches: MatchSuggestion[];
}

export function MatchList({ initialMatches }: MatchListProps) {
  const [matches, setMatches] = useState(initialMatches);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleConnect = async (userId: string) => {
    setLoading(userId);
    setMessage('');
    
    try {
      await Api.sendFriendRequest(userId);
      setMessage('Friend request sent!');
      // Remove from list after sending request
      setMatches(matches.filter(m => m.userId !== userId));
    } catch (error) {
      setMessage('Failed to send request');
      console.error('Friend request error:', error);
    } finally {
      setLoading(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <>
      {message && (
        <div className={`rounded-lg p-3 mb-4 ${message.includes('sent') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Suggested connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No suggestions available at the moment
            </p>
          ) : (
            matches.map((match: MatchSuggestion) => (
              <div key={match.userId} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                <div>
                  <p className="font-medium">{match.displayName ?? match.userId}</p>
                  <p className="text-xs text-muted-foreground">Overlap: {match.reasons?.join(', ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/40 text-white border border-primary/50 font-semibold">Score {match.score.toFixed(2)}</Badge>
                  <Button 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleConnect(match.userId)}
                    disabled={loading === match.userId}
                  >
                    <Sparkles className="h-4 w-4" /> 
                    {loading === match.userId ? 'Sending...' : 'Connect'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
