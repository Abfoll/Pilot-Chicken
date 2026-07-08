"use client";

import { motion } from "framer-motion";

interface Props {
  multiplier: number;
  isFlying: boolean;
}

export default function ChickenAnimation({ multiplier, isFlying }: Props) {
  const height = Math.min(multiplier * 15, 200);

  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <motion.div
        className="text-6xl"
        animate={{
          y: isFlying ? -height : 0,
          rotate: isFlying ? [0, -5, 5, -5, 0] : 0,
        }}
        transition={{
          y: { type: "spring", stiffness: 100, damping: 20 },
          rotate: { repeat: Infinity, duration: 0.5, ease: "easeInOut" },
        }}
      >
        🐔
      </motion.div>
      {isFlying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50" />
      )}
    </div>
  );
}