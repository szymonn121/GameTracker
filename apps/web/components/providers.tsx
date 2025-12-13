"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect, createContext, useContext } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

type Theme = 'cyber-blue' | 'purple-haze' | 'emerald-night' | 'sunset-orange' | 'rose-gold';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export function Providers({ children }: ProvidersProps) {
  const [client] = useState(() => new QueryClient());
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'cyber-blue';
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved ?? 'cyber-blue';
  });

  useEffect(() => {
    // Ensure the HTML attribute matches the current theme on mount
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  return (
    <QueryClientProvider client={client}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
