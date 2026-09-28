'use client';

import { useMotionValue, motion, useMotionTemplate } from 'motion/react';
import React, { MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/lib/utils';

export const CardSpotlight = ({
  children,
  radius = 280,
  color = 'rgba(245, 158, 11, 0.18)',
  className,
  ...props
}: {
  radius?: number;
  color?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn('group/spotlight relative', className)}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute z-0 -inset-px rounded-[inherit] opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              ${color},
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};