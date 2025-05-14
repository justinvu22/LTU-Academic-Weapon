// components/Card.tsx
"use client";

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  floating?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', floating = false }) => (
  <div
    className={
      `${floating
        ? 'floating-card-neon backdrop-blur-xl -mt-4 border border-[#b47aff]'
        : 'bg-[#191138] shadow-lg border border-[#23234a]'}
      rounded-xl p-6 transition-all duration-200 ${className}`
    }
    style={floating ? {
      zIndex: 10,
      position: 'relative',
      background: 'linear-gradient(135deg, #7c3aed 0%, #ff5eec 100%)'
    } : {}}
  >
    {children}
  </div>
);

export default Card;
