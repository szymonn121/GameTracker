'use client';

import { useEffect, useState } from 'react';
import { Api } from '../../lib/api';
import { SettingsForm } from '../../components/settings-form';
import { UserProfile } from '@game-tracker/shared';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await Api.profile();
        setProfile(data);
      } catch (err) {
        setError((err as Error).message);
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!profile) return <div className="p-4">Profile not found</div>;

  return <SettingsForm initialProfile={profile} />;
}
