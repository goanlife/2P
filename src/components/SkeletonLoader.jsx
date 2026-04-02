/**
 * SkeletonLoader — Placeholder animato per stati di caricamento
 * Shimmer effect per liste, card e KPI
 */
import React from "react";
import { motion } from "framer-motion";

const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: { duration: 1.8, repeat: Infinity, ease: "linear" },
  },
};

const shimmerStyle = {
  background: "linear-gradient(90deg, #F1F5F9 0%, #E8F1F8 40%, #F1F5F9 100%)",
  backgroundSize: "400% 100%",
  borderRadius: 6,
};

export function SkeletonLine({ width = "100%", height = 12, style = {} }) {
  return (
    <motion.div
      variants={shimmer}
      animate="animate"
      style={{ ...shimmerStyle, width, height, borderRadius: 6, ...style }}
    />
  );
}

export function SkeletonCard({ lines = 3, style = {} }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(14,165,233,.12)",
      borderRadius: 14, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 10, ...style
    }}>
      <SkeletonLine width="45%" height={10} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines-1 ? "60%" : "100%"} height={10} />
      ))}
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(14,165,233,.12)",
      borderRadius: 14, padding: "18px 16px 14px", position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#E2E8F0", borderRadius: "14px 14px 0 0" }} />
      <SkeletonLine width={40} height={32} style={{ marginBottom: 10, borderRadius: 6 }} />
      <SkeletonLine width="75%" height={8} />
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <SkeletonCard lines={2} style={{ padding: "12px 14px" }} />
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <SkeletonKPI />
          </motion.div>
        ))}
      </div>
      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        <SkeletonCard lines={4} style={{ height: 200 }} />
        <SkeletonCard lines={3} style={{ height: 200 }} />
      </div>
      {/* List */}
      <SkeletonList rows={4} />
    </div>
  );
}
