'use client';

import { createContext, useContext } from 'react';

export interface FlashcardInput {
  term: string;
  definition: string;
  category: string;
  difficulty: number;
}

export interface WorkspaceActions {
  /** Switch to Chat, pre-fill the input with this question, focus it. Does NOT send. */
  askAbout: (question: string) => void;
  /** Add a single flashcard to the current notebook. Returns true on success. */
  addFlashcard: (card: FlashcardInput) => Promise<boolean>;
}

const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);

export function useWorkspaceActions(): WorkspaceActions {
  const ctx = useContext(WorkspaceActionsContext);
  if (!ctx) {
    // Safe no-op fallback so panels don't crash if used outside the provider
    return {
      askAbout: (q) => console.warn('[workspace] askAbout called with no provider:', q),
      addFlashcard: async () => false,
    };
  }
  return ctx;
}

export const WorkspaceActionsProvider = WorkspaceActionsContext.Provider;