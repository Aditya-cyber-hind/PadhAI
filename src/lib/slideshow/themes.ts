/**
 * Deck themes for slideshow export.
 *
 * Each theme defines a visual language used consistently across
 * every slide type. Choosing a theme changes colors, typography,
 * background treatment, and accent style — but the slide content
 * structure stays the same.
 */

export type ThemeId = 'editorial' | 'bold' | 'notion';

export interface Theme {
  id: ThemeId;
  label: string;
  emoji: string;
  description: string;
  /** Short preview text shown in the picker card */
  preview: string;
}

export const THEMES: Theme[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    emoji: '📖',
    description: 'Cream paper, serif headlines, warm accent rules',
    preview: 'Reads like a well-designed magazine spread',
  },
  {
    id: 'bold',
    label: 'Bold',
    emoji: '⚡',
    description: 'Near-black canvas, big sans type, amber glow accents',
    preview: 'High contrast, built for impact',
  },
  {
    id: 'notion',
    label: 'Notion',
    emoji: '📝',
    description: 'Soft white, subtle borders, doc-like clarity',
    preview: 'Calm, minimal, and easy to read',
  },
];

export const DEFAULT_THEME: ThemeId = 'editorial';

export function getTheme(id: string | null | undefined): Theme {
  const found = THEMES.find((t) => t.id === id);
  return found || THEMES[0];
}