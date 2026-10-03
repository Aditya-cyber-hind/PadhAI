'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// ─────────────────────────────────────────────────────────────
//  THEMES
// ─────────────────────────────────────────────────────────────

export type Theme = 'warm' | 'cool' | 'forest' | 'rose' | 'sky' | 'paper';

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
  { id: 'paper',  label: 'Paper',  emoji: '📖', hint: 'Cream + sepia (reader)' },
];

// ─────────────────────────────────────────────────────────────
//  READING MODES
// ─────────────────────────────────────────────────────────────

export type Reading = 'default' | 'serif' | 'rounded' | 'mono';

export const READING_MODES: Array<{
  id: Reading;
  label: string;
  hint: string;
}> = [
  { id: 'default', label: 'Default', hint: 'Inter — clean and modern' },
  { id: 'serif',   label: 'Serif',   hint: 'Fraunces — book-like' },
  { id: 'rounded', label: 'Rounded', hint: 'Nunito — soft and friendly' },
  { id: 'mono',    label: 'Mono',    hint: 'JetBrains Mono — technical' },
];

// ─────────────────────────────────────────────────────────────
//  PROVIDER
// ─────────────────────────────────────────────────────────────

const THEME_KEY = 'padhai:theme';
const READING_KEY = 'padhai:reading';
const DEFAULT_THEME: Theme = 'warm';
const DEFAULT_READING: Reading = 'default';

interface PreferencesContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  reading: Reading;
  setReading: (r: Reading) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME,
      setTheme: () => console.warn('[preferences] no provider'),
      reading: DEFAULT_READING,
      setReading: () => console.warn('[preferences] no provider'),
    };
  }
  return ctx;
}

// Backwards-compat alias for any file still importing useTheme
export const useTheme = usePreferences;

function isValidTheme(value: string | null): value is Theme {
  return THEMES.some((t) => t.id === value);
}

function isValidReading(value: string | null): value is Reading {
  return READING_MODES.some((r) => r.id === value);
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

function applyReadingToDOM(reading: Reading) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-reading', reading);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [reading, setReadingState] = useState<Reading>(DEFAULT_READING);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (isValidTheme(savedTheme)) {
        setThemeState(savedTheme);
        applyThemeToDOM(savedTheme);
      } else {
        applyThemeToDOM(DEFAULT_THEME);
        if (savedTheme) {
          try {
            localStorage.removeItem(THEME_KEY);
          } catch {}
        }
      }

      const savedReading = localStorage.getItem(READING_KEY);
      if (isValidReading(savedReading)) {
        setReadingState(savedReading);
        applyReadingToDOM(savedReading);
      } else {
        applyReadingToDOM(DEFAULT_READING);
        if (savedReading) {
          try {
            localStorage.removeItem(READING_KEY);
          } catch {}
        }
      }
    } catch {
      applyThemeToDOM(DEFAULT_THEME);
      applyReadingToDOM(DEFAULT_READING);
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyThemeToDOM(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }, []);

  const setReading = useCallback((next: Reading) => {
    setReadingState(next);
    applyReadingToDOM(next);
    try {
      localStorage.setItem(READING_KEY, next);
    } catch {}
  }, []);

  return (
    <PreferencesContext.Provider value={{ theme, setTheme, reading, setReading }}>
      {children}
    </PreferencesContext.Provider>
  );
}