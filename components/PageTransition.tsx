"use client";

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    setDisplayChildren(children);
  }, [pathname, children]);

  const variants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.98,
      filter: 'blur(8px)',
      transition: { 
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1]
      }
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { 
        duration: 0.5,
        ease: [0.0, 0.0, 0.2, 1] 
      }
    },
    exit: { 
      opacity: 0,
      y: -10,
      scale: 0.96,
      filter: 'blur(8px)',
      transition: { 
        duration: 0.3,
        ease: [0.4, 0.0, 1, 1]
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants}
        className="w-full"
      >
        {displayChildren}
      </motion.div>
    </AnimatePresence>
  );
} 