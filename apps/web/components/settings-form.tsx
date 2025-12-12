"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
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

  const isSuccess = message.toLowerCase().includes('success') || message.toLowerCase().includes('saved');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-muted-foreground">Account</p>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile & Bio</CardTitle>
          <p className="text-sm text-muted-foreground">Display name and avatar stay synced with Steam. Bio is shared with friends.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs uppercase text-muted-foreground">Display name</p>
            <p className="text-sm font-semibold">{profile.displayName || 'Synced from Steam'}</p>
            <p className="text-xs text-muted-foreground">Managed by Steam. Update there to change here.</p>
          </div>

          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs uppercase text-muted-foreground">Avatar</p>
            {profile.avatarUrl ? (
              <a href={profile.avatarUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
                Open current avatar
              </a>
            ) : (
              <p className="text-sm font-semibold">Synced from Steam</p>
            )}
            <p className="text-xs text-muted-foreground">Managed by Steam. Update there to change here.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Bio</label>
            <Textarea
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Keep it short and friendly. Shared with friends.</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save bio'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account sync</CardTitle>
          <p className="text-sm text-muted-foreground">Steam data refreshes on login. Display name and avatar are read-only.</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Display name and avatar come from Steam and cannot be edited here.</p>
          <p>• Bio is editable above and shown to your friends.</p>
          <p>• If something looks outdated, log out and log back in to resync.</p>
        </CardContent>
      </Card>
    </div>
  );
}
