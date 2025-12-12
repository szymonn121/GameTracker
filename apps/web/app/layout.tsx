import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/providers';
import { Nav } from '../components/nav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Game Tracker Dashboard',
  description: 'Unified Steam, IGDB, and HLTB insights for your playtime.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
