"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Api } from '../lib/api';
import { UserProfile } from '@game-tracker/shared';
import { useTheme } from './providers';
import { Palette } from 'lucide-react';

const themes = [
  { id: 'cyber-blue' as const, name: 'Cyber Blue', colors: ['#7dd3fc', '#38bdf8', '#0ea5e9'] },
  { id: 'purple-haze' as const, name: 'Purple Haze', colors: ['#c084fc', '#a855f7', '#9333ea'] },
  { id: 'emerald-night' as const, name: 'Emerald Night', colors: ['#34d399', '#10b981', '#059669'] },
  { id: 'sunset-orange' as const, name: 'Sunset Orange', colors: ['#fb923c', '#f97316', '#ea580c'] },
  { id: 'rose-gold' as const, name: 'Rose Gold', colors: ['#fb7185', '#f43f5e', '#e11d48'] }
];

interface SettingsFormProps {
  initialProfile: UserProfile;
}

export function SettingsForm({ initialProfile }: SettingsFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { theme, setTheme } = useTheme();

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
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Display Name</label>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`group relative rounded-xl border-2 p-4 text-left transition-all ${
                  theme === t.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/30 hover:border-primary/50'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">{t.name}</span>
                  {theme === t.id && (
                    <Badge className="bg-primary text-primary-foreground">Active</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {t.colors.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-card"
                      style={{ backgroundColor: color, outlineColor: color }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Theme updates apply to charts, buttons, and other accents across the app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
