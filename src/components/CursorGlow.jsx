/**
 * CursorGlow — Spotlight luminoso che segue il cursore
 * Effetto "torcia" con gradiente radiale morbido
 */
import { useEffect, useRef } from "react";

export function CursorGlow() {
  const glowRef = useRef(null);
  const pos = useRef({ x: -500, y: -500 });
  const raf = useRef(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    const handleMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    const handleLeave = () => {
      pos.current = { x: -500, y: -500 };
    };

    const animate = () => {
      if (el) {
        el.style.left = pos.current.x + "px";
        el.style.top  = pos.current.y + "px";
      }
      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mouseleave", handleLeave);
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 0,
        transform: "translate(-50%, -50%)",
        width: 500,
        height: 500,
        background: "radial-gradient(circle at center, rgba(14,165,233,.06) 0%, rgba(14,165,233,.02) 40%, transparent 70%)",
        borderRadius: "50%",
        transition: "opacity .3s",
        willChange: "left, top",
      }}
    />
  );
}
