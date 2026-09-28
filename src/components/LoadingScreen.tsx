'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

const STATUS_MESSAGES = [
  'Warming up the models...',
  'Loading your notebooks...',
  'Syncing your sources...',
  'Almost there...',
];

export default function LoadingScreen() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="app-viewport w-screen flex flex-col bg-stone-50 relative overflow-hidden">
      {/* ============ Background: amber radial glow ============ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0.15) 30%, rgba(251, 191, 36, 0) 70%)',
        }}
      />

      {/* ============ Background: animated dot matrix ============ */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern
              id="dot-pattern"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.5" fill="#f59e0b" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-pattern)" />
        </svg>
      </div>

      {/* ============ Top: small logo pinned ============ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="pt-8 sm:pt-10 flex justify-center relative z-10"
      >
        <Logo size={28} />
      </motion.div>

      {/* ============ Center: the loader ============ */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 -mt-12">
        {/* Orbiting rings + logo */}
        <div className="relative flex items-center justify-center mb-10" style={{ width: 180, height: 180 }}>
          {/* Outer ring — slow clockwise */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
            className="absolute inset-0 rounded-full"
            style={{
              border: '1.5px solid transparent',
              borderTopColor: '#fbbf24',
              borderRightColor: '#fbbf24',
            }}
          />

          {/* Inner ring — fast counter-clockwise */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
            className="absolute rounded-full"
            style={{
              inset: 20,
              border: '1.5px solid transparent',
              borderBottomColor: '#d97706',
              borderLeftColor: '#d97706',
            }}
          />

          {/* Pulsing amber dot */}
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 2,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
            className="absolute rounded-full"
            style={{
              inset: 40,
              background:
                'radial-gradient(circle, rgba(245, 158, 11, 0.6) 0%, rgba(245, 158, 11, 0) 70%)',
            }}
          />

          {/* Center: logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="relative z-10"
          >
            <Logo size={56} showWordmark={false} />
          </motion.div>

          {/* Four orbiting dots */}
          {[0, 90, 180, 270].map((angle, i) => (
            <motion.div
              key={angle}
              className="absolute w-1.5 h-1.5 rounded-full bg-accent-500"
              style={{
                top: '50%',
                left: '50%',
                transformOrigin: '0 0',
              }}
              animate={{
                rotate: [angle, angle + 360],
              }}
              transition={{
                duration: 6 + i * 0.5,
                ease: 'linear',
                repeat: Infinity,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  transform: `translateX(78px)`,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#f59e0b',
                  boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Rotating status text */}
        <div className="h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-sm text-stone-500 font-medium"
            >
              {STATUS_MESSAGES[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Animated progress bar under the text */}
        <div className="mt-4 w-40 h-0.5 bg-stone-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent-400 to-accent-600"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 1.6,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
            style={{ width: '50%' }}
          />
        </div>
      </div>

      {/* ============ Bottom: footer hint ============ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="pb-8 flex justify-center relative z-10"
      >
        <p className="text-[11px] text-stone-400 tracking-wide">
          🧠 PadhAI · study workspace
        </p>
      </motion.div>
    </main>
  );
}