'use client';

import { useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';
import { apiBaseUrl } from '@/lib/utils';

export default function LoginPage() {
  // Clear old tokens when landing on login page
  useEffect(() => {
    localStorage.clear();
    document.cookie.split(';').forEach((c) => {
      document.cookie = `${c.trim().split('=')[0]}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    });
  }, []);

  const handleSteamLogin = () => {
    window.location.href = `${apiBaseUrl}/auth/steam`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.1),transparent_35%)]" />
      <div className="absolute inset-0 animate-pulse-slow bg-[radial-gradient(circle_at_10%_10%,rgba(14,165,233,0.08),transparent_25%)]" />

      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-12">
        <div className="relative w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 shadow-xl shadow-cyan-500/30 animate-float">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Game Tracker</h1>
            <p className="text-base text-slate-300">Track your Steam library with style.</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-8 shadow-2xl shadow-slate-900/60 backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06),transparent_0)] bg-[size:18px_18px] opacity-60" aria-hidden />
            <div className="space-y-5">
              <button
                onClick={handleSteamLogin}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all duration-200 hover:from-cyan-400 hover:to-sky-400 hover:shadow-cyan-400/40 active:scale-[0.98]"
              >
                <span className="absolute inset-0 animate-shine bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] bg-[length:200%_100%] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <svg className="h-5 w-5" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M127.778 0C57.234 0 0 57.234 0 127.778c0 56.269 36.383 104.064 86.833 120.85l30.052-44.424c-8.06-3.043-14.714-9.14-18.52-16.943l-43.162 18.068c-11.653-20.067-18.327-43.393-18.327-68.282 0-74.99 60.912-135.9 135.9-135.9 74.99 0 135.9 60.912 135.9 135.9 0 24.89-6.674 48.215-18.327 68.282l-43.162-18.068c-3.806 7.803-10.46 13.9-18.52 16.943l30.052 44.424C219.617 231.842 256 184.047 256 127.778 256 57.234 198.766 0 127.778 0zm62.173 127.778c0-34.317-27.856-62.173-62.173-62.173s-62.173 27.856-62.173 62.173c0 17.083 6.898 32.546 18.067 43.715l30.606-12.812c-3.043-5.35-4.783-11.517-4.783-18.11 0-20.37 16.521-36.891 36.891-36.891s36.891 16.521 36.891 36.891-16.521 36.891-36.891 36.891c-2.072 0-4.101-.17-6.088-.493l-31.361 13.128c9.668 5.987 21.065 9.46 33.274 9.46 34.317 0 62.173-27.856 62.173-62.173z" />
                </svg>
                <span className="text-base">Sign in with Steam</span>
              </button>

              <div className="relative text-center">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-slate-800/80" />
                </div>
                <div className="relative inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Steam OpenID • Secure
                </div>
              </div>

              <p className="text-center text-sm text-slate-400 leading-relaxed">
                Your Steam library and stats sync automatically. No passwords stored here.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
