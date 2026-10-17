"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  direction = "up",
  className = "",
  fullWidth = false,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe mount gate for framer-motion (by design)
    setMounted(true);
  }, []);

  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  };

  const wrapClass = `${fullWidth ? "w-full" : ""} ${className}`.trim();

  // Avoid SSR/client style mismatches from Framer Motion transforms
  if (!mounted) {
    return <div className={wrapClass}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ ...directions[direction], opacity: 0 }}
      whileInView={{ x: 0, y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={wrapClass}
    >
      {children}
    </motion.div>
  );
}
