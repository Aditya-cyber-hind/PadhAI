'use client';

import { motion } from 'motion/react';
import { revealOnScroll } from '@/lib/motion';

interface Props {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function MotionSection({ children, className, id }: Props) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={revealOnScroll}
      className={className}
    >
      {children}
    </motion.section>
  );
}