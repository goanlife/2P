/**
 * LoadingScreen — Schermata di caricamento con canvas 3D particle field
 * Effetto: rete di nodi connessi che ruota nello spazio 3D
 */
import React, { useEffect, useRef } from "react";

export function LoadingScreen() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    let t = 0;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    // ── Nodes ────────────────────────────────────────────────────────────
    const N = 80;
    const nodes = Array.from({ length: N }, () => ({
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 600,
      z: (Math.random() - 0.5) * 600,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      vz: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2.5 + 1,
    }));

    const project = (x, y, z, rotX, rotY) => {
      // Rotate around Y
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      let rx = x * cosY - z * sinY;
      let rz = x * sinY + z * cosY;
      // Rotate around X
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      let ry = y * cosX - rz * sinX;
      rz     = y * sinX + rz * cosX;
      // Perspective
      const fov = 500;
      const scale = fov / (fov + rz + 400);
      return {
        sx: rx * scale + W / 2,
        sy: ry * scale + H / 2,
        scale,
        z: rz,
      };
    };

    const CYAN  = [14, 165, 233];
    const WHITE = [220, 235, 255];

    const draw = () => {
      t += 0.004;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.7);
      grd.addColorStop(0, "rgba(14,165,233,.04)");
      grd.addColorStop(1, "rgba(244,247,251,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      const rotY = t * 0.3;
      const rotX = Math.sin(t * 0.2) * 0.25;

      // Project all nodes
      const proj = nodes.map(n => ({ ...project(n.x, n.y, n.z, rotX, rotY), r: n.r }));

      // Sort by z
      const sorted = proj.map((p,i) => ({ ...p, i })).sort((a,b) => a.z - b.z);

      // Draw edges (only nearby)
      const MAX_DIST_SQ = 160 * 160;
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i], b = sorted[j];
          const dx = nodes[a.i].x - nodes[b.i].x;
          const dy = nodes[a.i].y - nodes[b.i].y;
          const dz = nodes[a.i].z - nodes[b.i].z;
          const d2 = dx*dx + dy*dy + dz*dz;
          if (d2 > MAX_DIST_SQ) continue;
          const alpha = (1 - d2 / MAX_DIST_SQ) * 0.35 * Math.min(a.scale, b.scale) * 3;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Draw nodes
      sorted.forEach(p => {
        if (p.sx < -50 || p.sx > W+50 || p.sy < -50 || p.sy > H+50) return;
        const alpha = Math.min(1, p.scale * 3);
        const r = p.r * p.scale * 2;

        // Glow
        const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 4);
        glow.addColorStop(0, `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},${alpha * 0.4})`);
        glow.addColorStop(1, `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},0)`);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${WHITE[0]},${WHITE[1]},${WHITE[2]},${alpha * 0.9})`;
        ctx.fill();
      });

      // Animate nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
        if (Math.abs(n.x) > 300) n.vx *= -1;
        if (Math.abs(n.y) > 300) n.vy *= -1;
        if (Math.abs(n.z) > 300) n.vz *= -1;
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#F4F7FB",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", zIndex: 9999,
      overflow: "hidden",
    }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        {/* Animated rings */}
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 24px" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              position: "absolute",
              inset: i * 10,
              borderRadius: "50%",
              border: `1.5px solid rgba(14,165,233,${0.6 - i*0.15})`,
              animation: `ringPulse ${1.2 + i*0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
          <div style={{
            position: "absolute", inset: 24,
            background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 0 30px rgba(14,165,233,.4), 0 8px 24px rgba(14,165,233,.2)",
          }}>⚙</div>
        </div>

        <div style={{
          fontFamily: "'Oxanium', sans-serif",
          fontSize: 28, fontWeight: 800,
          color: "#0F172A",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>ManuMan</div>

        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11, color: "#0EA5E9",
          letterSpacing: ".2em",
          textTransform: "uppercase",
          marginBottom: 28,
          animation: "blinkText 2s ease-in-out infinite",
        }}>
          Inizializzazione sistema…
        </div>

        {/* Progress bar */}
        <div style={{
          width: 180, height: 2,
          background: "rgba(14,165,233,.15)",
          borderRadius: 99, margin: "0 auto",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: "60%",
            background: "linear-gradient(90deg, #0EA5E9, #38BDF8)",
            borderRadius: 99,
            animation: "progressScan 1.6s ease-in-out infinite",
            boxShadow: "0 0 8px rgba(14,165,233,.6)",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes ringPulse {
          0%,100% { opacity:.5; transform:scale(1); }
          50%      { opacity:1; transform:scale(1.05); }
        }
        @keyframes blinkText {
          0%,100% { opacity:.5; }
          50%      { opacity:1; }
        }
        @keyframes progressScan {
          0%   { transform:translateX(-100%); }
          100% { transform:translateX(400%); }
        }
      `}</style>
    </div>
  );
}
