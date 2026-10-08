import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import useCanHover from "../hooks/useCanHover";

export default function TiltCard({
  children,
  className = "",
  glowColor = "rgba(0, 240, 255, 0.2)",
  tiltDegree = 5,
  enableGlow = true,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  // Touch devices (matchMedia "(hover: none)") get the static elevated card only:
  // no pointer listeners, no springs, no per-frame transforms.
  const canHover = useCanHover();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tiltDegree}deg`, `-${tiltDegree}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tiltDegree}deg`, `${tiltDegree}deg`]);

  if (!canHover) {
    return (
      <div onClick={onClick} className={`relative depth-elevated ${className}`} {...props}>
        {children}
      </div>
    );
  }

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
      }}
      whileHover={{
        y: -3,
        boxShadow: enableGlow ? `0 15px 35px -5px ${glowColor}` : undefined,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`relative depth-elevated transition-colors duration-200 pointer-events-auto ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
