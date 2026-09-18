const SESSION_KEY = 'padh-ai-session-id';

/**
 * Get or create a session ID for this browser tab.
 * Uses sessionStorage so each tab gets its own session.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
} 
