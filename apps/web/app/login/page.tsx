'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  // Clear old tokens when landing on login page
  useEffect(() => {
    localStorage.clear();
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    });
  }, []);

  const handleSteamLogin = () => {
    window.location.href = 'http://localhost:4000/auth/steam';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Game Tracker</h1>
          <p className="mt-2 text-muted-foreground">Sign in to track your gaming journey</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSteamLogin}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-[#0d1b2a] to-[#1b2838] px-6 py-4 font-semibold text-white shadow-lg transition-all hover:from-[#1b2838] hover:to-[#2a475e] hover:shadow-xl"
          >
            <svg className="h-8 w-8" viewBox="0 0 256 256" fill="currentColor">
              <path d="M127.778 0C57.234 0 0 57.234 0 127.778c0 56.269 36.383 104.064 86.833 120.85l30.052-44.424c-8.06-3.043-14.714-9.14-18.52-16.943l-43.162 18.068c-11.653-20.067-18.327-43.393-18.327-68.282 0-74.99 60.912-135.9 135.9-135.9 74.99 0 135.9 60.912 135.9 135.9 0 24.89-6.674 48.215-18.327 68.282l-43.162-18.068c-3.806 7.803-10.46 13.9-18.52 16.943l30.052 44.424C219.617 231.842 256 184.047 256 127.778 256 57.234 198.766 0 127.778 0zm62.173 127.778c0-34.317-27.856-62.173-62.173-62.173s-62.173 27.856-62.173 62.173c0 17.083 6.898 32.546 18.067 43.715l30.606-12.812c-3.043-5.35-4.783-11.517-4.783-18.11 0-20.37 16.521-36.891 36.891-36.891s36.891 16.521 36.891 36.891-16.521 36.891-36.891 36.891c-2.072 0-4.101-.17-6.088-.493l-31.361 13.128c9.668 5.987 21.065 9.46 33.274 9.46 34.317 0 62.173-27.856 62.173-62.173z"/>
            </svg>
            <span className="text-lg">Zaloguj przez Steam</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-muted-foreground">or continue as demo</span>
            </div>
          </div>

          <a
            href="/"
            className="flex w-full items-center justify-center rounded-lg border bg-background px-4 py-3 font-medium transition hover:bg-secondary/60"
          >
            Continue as Guest
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
