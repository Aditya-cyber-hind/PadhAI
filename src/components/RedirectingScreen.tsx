'use client';

import { motion } from 'motion/react';
import Logo from './Logo';

export default function RedirectingScreen() {
  return (
    <main className="app-viewport w-screen flex flex-col bg-stone-50 relative overflow-hidden">
      {/* Background: softer amber glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.35, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(251, 191, 36, 0.35) 0%, rgba(251, 191, 36, 0.1) 30%, rgba(251, 191, 36, 0) 70%)',
        }}
      />

      {/* Background: animated dot matrix (fainter) */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern
              id="dot-pattern-redirect"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.5" fill="#d97706" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-pattern-redirect)" />
        </svg>
      </div>

      {/* Top: small logo pinned */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="pt-8 sm:pt-10 flex justify-center relative z-10"
      >
        <Logo size={28} />
      </motion.div>

      {/* Center: gentle pulse + text */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 -mt-12 text-center">
        {/* Single slow-pulsing ring */}
        <div className="relative flex items-center justify-center mb-8" style={{ width: 140, height: 140 }}>
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
            className="absolute inset-0 rounded-full"
            style={{
              border: '1.5px solid rgba(245, 158, 11, 0.5)',
            }}
          />

          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity, delay: 0.4 }}
            className="absolute rounded-full"
            style={{
              inset: 24,
              border: '1.5px solid rgba(245, 158, 11, 0.3)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="relative z-10"
          >
            <Logo size={52} showWordmark={false} />
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-sm text-stone-600 font-medium mb-2"
        >
          Taking you to sign in...
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-xs text-stone-400 max-w-xs"
        >
          You&apos;ll be back in a moment
        </motion.p>
      </div>

      {/* Bottom: footer hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="pb-8 flex justify-center relative z-10"
      >
        <p className="text-[11px] text-stone-400 tracking-wide">
          🧠 PadhAI · free · open source
        </p>
      </motion.div>
    </main>
  );
}