'use client';

import { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'error' | 'info' | 'success';
  message: string;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timeout);
  }, [toast.id, onDismiss]);

  const colors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  }[toast.type];

  const icons = { error: '⚠️', info: 'ℹ️', success: '✓' }[toast.type];

  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg ${colors} animate-in slide-in-from-top-2`}>
      <span className="text-base leading-none mt-0.5">{icons}</span>
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-current opacity-60 hover:opacity-100 text-sm leading-none"
      >
        ✕
      </button>
    </div>
  );
} 
