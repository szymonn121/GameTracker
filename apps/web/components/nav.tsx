"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Gamepad2, Home, Users, Settings, Joystick, Sparkles, LogIn, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Api } from '../lib/api';

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/matchmaking', label: 'Matchmaking', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function Nav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);

    if (token) {
      // Fetch user data
      Api.me()
        .then((data) => {
          setUsername(data.nickname || 'Player');
          setAvatarUrl(data.avatar || null);
        })
        .catch((error) => {
          console.error('Failed to fetch user data:', error);
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; max-age=0'; // Remove cookie
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-black/20 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-gradient text-xl font-bold">
          <Joystick className="h-5 w-5" />
          Game Tracker
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={cn('group')}> 
                <Button variant={active ? 'default' : 'ghost'} size="sm" className="gap-2">
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
          {isLoggedIn ? (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border/40">
              {avatarUrl && (
                <img 
                  src={avatarUrl} 
                  alt={username || 'User'} 
                  className="h-8 w-8 rounded-full"
                />
              )}
              {username && (
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {username}
                </span>
              )}
              <Button onClick={handleLogout} variant="ghost" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
