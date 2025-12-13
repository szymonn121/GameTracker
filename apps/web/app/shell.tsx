"use client";

import { usePathname } from 'next/navigation';
import { Nav } from '../components/nav';

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';

  return (
    <>
      {!isAuthPage && <Nav />}
      <main className={isAuthPage ? 'min-h-screen w-full' : 'mx-auto max-w-6xl px-4 pb-10 pt-6'}>
        {children}
      </main>
    </>
  );
}
