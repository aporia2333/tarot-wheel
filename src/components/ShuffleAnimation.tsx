"use client";

import { motion } from "framer-motion";
import { TarotCard } from "@/components/TarotCard";

export function ShuffleAnimation({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto h-80 w-64">
      {[0, 1, 2, 3, 4].map((item) => (
        <motion.div
          key={item}
          className="absolute left-10 top-4"
          animate={
            active
              ? {
                  x: [0, item % 2 ? -46 : 46, 0],
                  rotate: [0, item % 2 ? -10 : 10, 0],
                  y: [0, item * 3, 0],
                }
              : { x: item * 4, y: item * 5, rotate: item * 2 }
          }
          transition={{ duration: 0.75, repeat: active ? Infinity : 0, delay: item * 0.05 }}
        >
          <TarotCard faceDown compact={false} />
        </motion.div>
      ))}
    </div>
  );
}
