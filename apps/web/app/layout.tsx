import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/providers';
import { Shell } from './shell';

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
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
