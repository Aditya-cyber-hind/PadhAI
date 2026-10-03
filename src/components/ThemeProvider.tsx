'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export type Theme = 'warm' | 'cool' | 'dark' | 'paper';

export const THEMES: Array<{
  id: Theme;
  label: string;
  emoji: string;
  hint: string;
}> = [
  { id: 'warm', label: 'Warm', emoji: '🌅', hint: 'Stone + amber (default)' },
  { id: 'cool', label: 'Cool', emoji: '❄️', hint: 'Slate + blue' },
  { id: 'dark', label: 'Dark', emoji: '🌙', hint: 'Night mode' },
  { id: 'paper', label: 'Paper', emoji: '📖', hint: 'Cream + serif for reading' },
];

const STORAGE_KEY = 'padhai:theme';
const DEFAULT_THEME: Theme = 'warm';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so components don't crash if used outside provider
    return {
      theme: DEFAULT_THEME,
      setTheme: () => console.warn('[theme] no provider'),
    };
  }
  return ctx;
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        setThemeState(saved);
        applyThemeToDOM(saved);
      } else {
        applyThemeToDOM(DEFAULT_THEME);
      }
    } catch {
      applyThemeToDOM(DEFAULT_THEME);
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeToDOM(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}