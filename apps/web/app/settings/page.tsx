import { Api } from '../../lib/api';
import { SettingsForm } from '../../components/settings-form';

async function getProfile() {
  return Api.profile();
}

export default async function SettingsPage() {
  const profile = await getProfile();
  return <SettingsForm initialProfile={profile} />;
}
