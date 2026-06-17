"use client";

import { motion } from "framer-motion";

const bursts = [
  "left-[4%] top-[14%] h-14 w-14 bg-[#ff4fb8]",
  "right-[7%] top-[10%] h-20 w-20 bg-[#38e7ff]",
  "left-[42%] bottom-[8%] h-16 w-16 bg-[#ffdd3d]",
];

export function CoordinationField() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,244,0.92),rgba(255,250,244,0.72)_54%,rgba(230,247,255,0.7))]" />
      <div className="halftone-mask absolute inset-0 opacity-18" />
      <div className="absolute left-1/2 top-8 h-16 w-[115vw] -translate-x-1/2 -rotate-2 border-y-2 border-[#140625] bg-[#ffdd3d]/45" />
      <div className="absolute left-1/2 top-40 h-12 w-[115vw] -translate-x-1/2 rotate-2 border-y-2 border-[#140625] bg-[#38e7ff]/35" />
      {bursts.map((className, index) => (
        <motion.span
          key={className}
          aria-hidden="true"
          className={`absolute rounded-full border-2 border-[#140625] opacity-35 ${className}`}
          animate={{ scale: [1, 1.06, 1], rotate: [0, index % 2 ? -6 : 6, 0] }}
          transition={{
            duration: 4 + index * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
