'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextValue {
  pushToast: (type: ToastMessage['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback so panels don't crash if used outside the provider
    return {
      pushToast: (type, message) => {
        console.warn('[toast] no provider — message:', type, message);
      },
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      // Auto-dismiss after 4s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ─── Renderer (unchanged shape so existing ChatPanel import still works) ───
export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const colorClass =
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-stone-50 border-stone-200 text-stone-900';
          const icon =
            toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-lg backdrop-blur-sm ${colorClass}`}
            >
              <span className="flex-shrink-0 text-sm leading-none mt-0.5">{icon}</span>
              <span className="flex-1 text-sm leading-snug">{toast.message}</span>
              <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 text-current opacity-40 hover:opacity-80 transition leading-none text-base"
                title="Dismiss"
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}