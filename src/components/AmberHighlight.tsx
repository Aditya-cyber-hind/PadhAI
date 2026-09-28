'use client';

import { motion } from 'motion/react';

/**
 * Amber version of Aceternity's Highlight.
 * Same left-to-right background sweep, but with our accent palette
 * instead of indigo/purple.
 */
export default function AmberHighlight({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      initial={{ backgroundSize: '0% 100%' }}
      animate={{ backgroundSize: '100% 100%' }}
      transition={{
        duration: 2,
        ease: 'linear',
        delay: 0.5,
      }}
      style={{
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
        backgroundImage: 'linear-gradient(90deg, #f59e0b, #d97706)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        display: 'inline',
      }}
      className="italic font-display"
    >
      {children}
    </motion.span>
  );
}