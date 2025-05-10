// components/Card.tsx
"use client";

import { motion } from "framer-motion";

interface CardProps {
  title: string;
  description: string;
  imgSrc: string;
}

export default function Card({ title, description, imgSrc }: CardProps) {
  return (
    <motion.div
      className="rounded-xl bg-card backdrop-blur p-4 shadow-lg hover:shadow-xl transition-transform duration-200"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <img src={imgSrc} alt={title} className="rounded-xl mb-2 w-full" />
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </motion.div>
  );
}
