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
      className="rounded-2xl bg-card backdrop-blur p-6 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <img src={imgSrc} alt={title} className="rounded-xl mb-4 w-full" />
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </motion.div>
  );
}
