"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TarotCard } from "@/components/TarotCard";

interface CutAnimationProps {
  active: boolean;
  cutCount: number;
}

const activeLabel = "\u6b63\u5728\u5207\u724c...";
const idleLabel = "\u8ba9\u76f4\u89c9\u51b3\u5b9a\u5207\u70b9";

export function CutAnimation({ active, cutCount }: CutAnimationProps) {
  const reduceMotion = useReducedMotion();
  const topCards = [0, 1, 2];
  const bottomCards = [0, 1, 2];

  return (
    <div className="relative mx-auto mt-6 h-80 w-full max-w-sm overflow-hidden">
      {bottomCards.map((item) => (
        <motion.div
          key={`bottom-${item}-${cutCount}`}
          className="absolute left-1/2 top-12"
          style={{ marginLeft: -88 + item * 5, marginTop: item * 5, zIndex: item }}
          animate={
            active && !reduceMotion
              ? {
                  x: [0, 76, 76, 0],
                  y: [0, 18, 74, 0],
                  rotate: [item * 1.6, 7, 3, item * 1.6],
                }
              : { x: 0, y: 0, rotate: item * 1.6 }
          }
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: "easeInOut", delay: reduceMotion ? 0 : item * 0.03 }}
        >
          <TarotCard faceDown />
        </motion.div>
      ))}

      {topCards.map((item) => (
        <motion.div
          key={`top-${item}-${cutCount}`}
          className="absolute left-1/2 top-12"
          style={{ marginLeft: -88 + item * 5, marginTop: item * 5, zIndex: item + 8 }}
          animate={
            active && !reduceMotion
              ? {
                  x: [0, -82, -82, 0],
                  y: [0, -22, 72, 0],
                  rotate: [item * -1.8, -8, -3, item * -1.8],
                }
              : { x: 0, y: 0, rotate: item * -1.8 }
          }
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: "easeInOut", delay: reduceMotion ? 0 : 0.08 + item * 0.03 }}
        >
          <TarotCard faceDown />
        </motion.div>
      ))}

      <motion.div
        className="absolute bottom-1 w-full text-center text-sm text-mist"
      >
        {active ? activeLabel : idleLabel}
      </motion.div>
    </div>
  );
}
