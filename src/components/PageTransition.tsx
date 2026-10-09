import React from 'react';
import { motion } from 'motion/react';

type TransitionVariant = 'fade' | 'slideUp' | 'scale' | 'blur';

interface PageTransitionProps {
  children: React.ReactNode;
  variant?: TransitionVariant;
}

const variants = {
  fade: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.05 },
  },
  blur: {
    initial: { opacity: 0, filter: 'blur(10px)' },
    in: { opacity: 1, filter: 'blur(0px)' },
    out: { opacity: 0, filter: 'blur(10px)' },
  },
};

const transitionConfig = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 20,
  mass: 1,
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children, variant = 'slideUp' }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={variants[variant]}
      transition={transitionConfig}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};
