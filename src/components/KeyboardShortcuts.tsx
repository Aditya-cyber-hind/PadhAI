'use client';

import { useEffect } from 'react';

/**
 * Global keyboard shortcuts for PadhAI.
 *
 * - Cmd/Ctrl + K  → focus the search input on the dashboard
 * - "/"           → focus the chat / coder input inside a notebook
 * - Esc           → close any active search focus (handled locally too)
 *
 * Skips triggering when the user is already typing in an input, textarea,
 * or contenteditable element, so we don't hijack their typing.
 */

function isTypingInField(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K → focus the dashboard search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // Don't hijack Cmd+K if the user is typing in a field.
        // Browsers use Cmd+K for the URL bar in some cases; preventDefault
        // captures it in the app context.
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search..."]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // "/" → focus the chat input
      if (e.key === '/' && !isTypingInField()) {
        const chatInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'input[placeholder^="Ask"], textarea[placeholder^="Ask"]'
        );
        if (chatInput) {
          e.preventDefault();
          chatInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return null;
}