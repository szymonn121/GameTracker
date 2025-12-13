'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server Action to fetch dashboard data
 * Returns data or triggers redirect if unauthorized
 */
export async function fetchDashboardData() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value || process.env.NEXT_PUBLIC_API_TOKEN;
  
  // Add timestamp to prevent any caching
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const url = `${baseUrl}/dashboard?_t=${Date.now()}`;
  
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store'
  });

  if (res.status === 401 || res.status === 403) {
    // Token is invalid - redirect to login (cookies will be cleared client-side)
    redirect('/login?reason=reauth');
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Dashboard request failed: ${res.status}`);
  }
  
  return res.json();
}
