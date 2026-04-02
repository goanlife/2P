/**
 * PageTransition — Wrapper con animazione di entrata/uscita per ogni vista
 * Usa framer-motion per transizioni fluide tra le pagine
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const variants = {
  enter:  { opacity: 0 },
  center: { opacity: 1 },
  exit:   { opacity: 0 },
};

export function PageTransition({ children, pageKey }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial="enter"
        animate="center"
        exit="exit"
        variants={variants}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ width: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Staggered list ─────────────────────────────────────────────────────────
export function StaggerList({ children, stagger = 0.06 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {React.Children.map(children, child => (
        <motion.div
          variants={{
            hidden:  { opacity: 0, x: -12 },
            visible: { opacity: 1, x: 0, transition: { ease: [0.4,0,0.2,1], duration: 0.28 } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Fade in on mount ───────────────────────────────────────────────────────
export function FadeIn({ children, delay = 0, duration = 0.4 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
