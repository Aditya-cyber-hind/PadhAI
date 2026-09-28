'use client';

import { useState, useRef, useEffect } from 'react';
import { authClient } from '@/lib/auth/client';

interface Props {
  userName: string;
  userEmail: string;
  userImage?: string;
}

export default function UserMenu({ userName, userEmail, userImage }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authClient.signOut();
      window.location.reload();
    } catch (err) {
      console.error('[signout] failed:', err);
      setSigningOut(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => !signingOut && setOpen((o) => !o)}
        disabled={signingOut}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 transition disabled:opacity-60 disabled:cursor-not-allowed"
        title={userName}
      >
        {userImage ? (
          <img
            src={userImage}
            alt={userName}
            className="w-8 h-8 rounded-full border border-stone-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-stone-800 text-white text-xs font-semibold flex items-center justify-center">
            {initials || '?'}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-sm font-medium text-stone-900 truncate">{userName}</p>
            <p className="text-xs text-stone-500 truncate">{userEmail}</p>
          </div>

          <div className="py-1">
            <a
              href="/account/settings"
              className="block px-4 py-2 text-sm text-stone-700 hover:bg-accent-50 hover:text-accent-700 transition"
            >
              ⚙️ Settings
            </a>
            <a
              href="/account/security"
              className="block px-4 py-2 text-sm text-stone-700 hover:bg-accent-50 hover:text-accent-700 transition"
            >
              🔒 Security
            </a>
          </div>

          <div className="py-1 border-t border-stone-100">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {signingOut ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <span>↪</span>
                  <span>Sign out</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {signingOut && (
        <div
          className="fixed inset-0 bg-white/40 backdrop-blur-sm z-40 cursor-wait"
          aria-hidden="true"
        />
      )}
    </div>
  );
}