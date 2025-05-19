"use client";

import React, { ReactNode, useEffect, useState } from 'react';
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
      transition: { 
        duration: 0.08
      }
    },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.08
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 0.08
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