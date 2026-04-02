/**
 * AnimatedKPI — KPI card con counter animato e 3D tilt hover
 * Usa GSAP per il countup e CSS perspective per il tilt
 */
import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";

export function AnimatedKPI({ value, label, color, icon, delay = 0, onClick }) {
  const numRef   = useRef(null);
  const cardRef  = useRef(null);
  const prevVal  = useRef(0);
  const isString = typeof value === "string";

  // ── Counter animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (isString || !numRef.current) return;
    const from = prevVal.current;
    const to   = Number(value) || 0;
    prevVal.current = to;

    gsap.fromTo(
      { n: from },
      { n: to, duration: 1.2 + delay * 0.1, ease: "power3.out",
        delay,
        onUpdate() { if (numRef.current) numRef.current.textContent = Math.round(this.targets()[0].n); }
      },
      {}
    );
    gsap.to(numRef.current, {
      duration: 0.4, delay,
      opacity: 1, y: 0, ease: "power2.out",
    });
  }, [value, delay, isString]);

  // ── Card entrance ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 24, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: delay * 0.08 + 0.15, ease: "power3.out" }
    );
  }, [delay]);

  // ── 3D Tilt on hover ──────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    gsap.to(card, {
      rotateX: -dy * 8, rotateY: dx * 8,
      transformPerspective: 800,
      duration: 0.3, ease: "power2.out",
    });
  };
  const handleMouseLeave = () => {
    gsap.to(cardRef.current, {
      rotateX: 0, rotateY: 0, duration: 0.4, ease: "elastic.out(1, 0.5)",
    });
  };

  return (
    <div
      ref={cardRef}
      className="kpi-card"
      style={{
        "--c": color,
        cursor: onClick ? "pointer" : "default",
        opacity: 0,
        willChange: "transform",
        transformStyle: "preserve-3d",
      }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {icon && (
        <div style={{ fontSize: 16, marginBottom: 8, opacity: .7 }}>{icon}</div>
      )}
      <div
        ref={numRef}
        className="kpi-value"
        style={{ opacity: isString ? 1 : 0, transform: isString ? "none" : "translateY(8px)", fontSize: isString ? 20 : 32 }}
      >
        {isString ? value : "0"}
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

// ── Griglia KPI con entrance staggered ────────────────────────────────────
export function KPIGrid({ items }) {
  return (
    <div className="kpi-grid">
      {items.map((item, i) => (
        <AnimatedKPI key={item.label || item.l} {...item} delay={i} />
      ))}
    </div>
  );
}
