"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Api } from '../lib/api';
import { UserProfile } from '@game-tracker/shared';

interface SettingsFormProps {
  initialProfile: UserProfile;
}

export function SettingsForm({ initialProfile }: SettingsFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      await Api.updateProfile({
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl
      });
      setMessage('Profile saved successfully!');
    } catch (error) {
      setMessage('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-muted-foreground">Account</p>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {message && (
        <div className={`rounded-lg p-3 ${message.includes('success') || message.includes('saved') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Display name</label>
            <Input 
              value={profile.displayName} 
              disabled
              placeholder="Synced from Steam" 
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your name is automatically synced from your Steam profile
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bio</label>
            <Textarea 
              value={profile.bio || ''} 
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..." 
              rows={4} 
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Avatar</label>
            <Input 
              value={profile.avatarUrl || ''} 
              disabled
              placeholder="Synced from Steam" 
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Avatar is automatically synced from your Steam profile
            </p>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <div>
              <p className="font-medium">Friend activity</p>
              <p className="text-xs text-muted-foreground">Alerts for achievements and milestones</p>
            </div>
            <Badge className="bg-primary/20 text-primary-foreground">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <div>
              <p className="font-medium">Weekly summary</p>
              <p className="text-xs text-muted-foreground">Email digest of playtime</p>
            </div>
            <Badge className="bg-secondary/70 text-foreground">Disabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
