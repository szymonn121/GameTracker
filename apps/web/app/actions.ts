'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server Action to clear auth token and redirect to login
 * This is the only place where we can safely modify cookies
 */
export async function clearAuthAndRedirect(reason: string = 'reauth') {
  const cookieStore = cookies();
  cookieStore.set({
    name: 'auth_token',
    value: '',
    path: '/',
    expires: new Date(0),
  });
  redirect(`/login?reason=${reason}`);
}

/**
 * Server Action to fetch dashboard data
 * Returns data or triggers redirect if unauthorized
 */
export async function fetchDashboardData() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value || process.env.NEXT_PUBLIC_API_TOKEN;
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/dashboard`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    // Token is invalid - clear it and redirect
    await clearAuthAndRedirect('reauth');
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Dashboard request failed: ${res.status}`);
  }
  
  return res.json();
}
