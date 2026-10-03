'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export type Theme = 'warm' | 'cool' | 'forest' | 'rose' | 'sky';

export const THEMES: Array<{
  id: Theme;
  label: string;
  emoji: string;
  hint: string;
}> = [
  { id: 'warm',   label: 'Warm',   emoji: '🌅', hint: 'Stone + amber (default)' },
  { id: 'cool',   label: 'Cool',   emoji: '❄️', hint: 'Slate + blue' },
  { id: 'forest', label: 'Forest', emoji: '🌲', hint: 'Sage + amber' },
  { id: 'rose',   label: 'Rose',   emoji: '🌸', hint: 'Blush + rose' },
  { id: 'sky',    label: 'Sky',    emoji: '☁️', hint: 'Blue-grey + sky' },
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
    return {
      theme: DEFAULT_THEME,
      setTheme: () => console.warn('[theme] no provider'),
    };
  }
  return ctx;
}

function isValidTheme(value: string | null): value is Theme {
  return THEMES.some((t) => t.id === value);
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isValidTheme(saved)) {
        setThemeState(saved);
        applyThemeToDOM(saved);
      } else {
        // Migrate away from removed themes (dark, paper)
        applyThemeToDOM(DEFAULT_THEME);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
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