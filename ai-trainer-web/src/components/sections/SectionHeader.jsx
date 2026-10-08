import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import useCanHover from "../../hooks/useCanHover";

/**
 * Section title with a subtle scroll parallax: the eyebrow drifts slower than
 * the heading as the section scrolls past. Disabled on touch devices and for
 * reduced-motion users (static header, no scroll listeners).
 */
export default function SectionHeader({ eyebrow, title, accent, children }) {
  const ref = useRef(null);
  const canHover = useCanHover();
  const reduceMotion = useReducedMotion();
  const animate = canHover && !reduceMotion;

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const eyebrowY = useTransform(scrollYProgress, [0, 1], [10, -10]);
  const titleY = useTransform(scrollYProgress, [0, 1], [4, -4]);

  return (
    <div ref={ref} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div>
        <motion.span
          style={animate ? { y: eyebrowY } : undefined}
          className="block text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase"
        >
          {eyebrow}
        </motion.span>
        <motion.h2
          style={animate ? { y: titleY } : undefined}
          className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase mt-0.5"
        >
          {title} {accent && <span className="text-cyan-400">{accent}</span>}
        </motion.h2>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
