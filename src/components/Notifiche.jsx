import React, { useState, useMemo, useRef, useEffect } from "react";

// ── Web Push Notifications (browser nativo) ──────────────────────────────
export function useBrowserNotifiche(notifiche) {
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    if (notifiche.length === 0) return;

    const urgenti = notifiche.filter(n => n.tipo === "scaduta" || n.tipo === "urgente");
    if (!urgenti.length) return;

    const richiediEMostra = async () => {
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
      }
      // Mostra max 3 notifiche browser al caricamento
      urgenti.slice(0, 3).forEach(n => {
        try {
          new Notification("ManuMan — " + n.titolo, {
            body: n.testo + " · " + (n.data ? new Date(n.data+"T00:00:00").toLocaleDateString("it-IT") : ""),
            icon: "/favicon.ico",
            tag: n.id, // evita duplicati
          });
        } catch(e) { /* browser può bloccare */ }
      });
    };
    // Delay per non bloccare il caricamento iniziale
    const t = setTimeout(richiediEMostra, 2000);
    return () => clearTimeout(t);
  }, []); // solo al mount — notifiche iniziali
}

// ── Richiedi permesso notifiche browser ──────────────────────────────────
export async function richiediPermessoNotifiche() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const p = await Notification.requestPermission();
  return p === "granted";
}

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const isoDate = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };

function oggi() { return isoDate(new Date()); }
function traGiorni(n) { const d = new Date(); d.setDate(d.getDate() + n); return isoDate(d); }

export function useNotifiche(man, operatori, meId) {
  return useMemo(() => {
    const oggi_ = oggi();
    const domani = traGiorni(1);
    const dopodomani = traGiorni(2);
    const notifiche = [];

    man.forEach(m => {
      if (m.stato === "completata") return;

      // Scadute
      if (m.data < oggi_ && m.stato !== "completata") {
        notifiche.push({
          id: `scad_${m.id}`, tipo: "scaduta", priorita: 0,
          titolo: "Attività scaduta",
          testo: m.titolo,
          data: m.data,
          manId: m.id,
          icon: "🔴",
        });
      }
      // Oggi
      else if (m.data === oggi_) {
        notifiche.push({
          id: `oggi_${m.id}`, tipo: "oggi", priorita: 1,
          titolo: "Attività per oggi",
          testo: m.titolo,
          data: m.data,
          manId: m.id,
          icon: "📅",
        });
      }
      // Domani
      else if (m.data === domani) {
        notifiche.push({
          id: `dom_${m.id}`, tipo: "domani", priorita: 2,
          titolo: "Attività per domani",
          testo: m.titolo,
          data: m.data,
          manId: m.id,
          icon: "⏰",
        });
      }
      // Urgenti
      if (m.priorita === "urgente" && m.stato !== "completata") {
        notifiche.push({
          id: `urg_${m.id}`, tipo: "urgente", priorita: 0,
          titolo: "⚡ Priorità urgente",
          testo: m.titolo,
          data: m.data,
          manId: m.id,
          icon: "⚡",
        });
      }
    });

    // Deduplica per manId (max 1 notifica per attività)
    const seen = new Set();
    return notifiche
      .filter(n => { if (seen.has(n.manId)) return false; seen.add(n.manId); return true; })
      .sort((a, b) => a.priorita - b.priorita)
      .slice(0, 20);
  }, [man]);
}

export function CampanellaNotifiche({ notifiche=[], onNavigate }) {
  const [aperta, setAperta] = useState(false);
  const [popupPos, setPopupPos] = useState({});
  const btnRef = React.useRef(null);

  const apri = () => {
    if (!aperta && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const openUp = r.bottom > window.innerHeight * 0.6;
      setPopupPos(openUp
        ? { bottom: window.innerHeight - r.top + 8, left: Math.max(8, Math.min(r.right - 360, window.innerWidth - 368)) }
        : { top: r.bottom + 8, left: Math.max(8, Math.min(r.right - 360, window.innerWidth - 368)) }
      );
    }
    setAperta(v => !v);
  };
  const count = notifiche.filter(n => n.tipo === "scaduta" || n.tipo === "urgente" || n.tipo === "oggi").length;

  const coloreNota = (tipo) => ({
    scaduta: { bg: "#FEF2F2", col: "#DC2626", bd: "#FECACA" },
    urgente: { bg: "#FFF1F2", col: "#9F1239", bd: "#FECDD3" },
    oggi:    { bg: "#FFFBEB", col: "#B45309", bd: "#FDE68A" },
    domani:  { bg: "#EFF6FF", col: "#1D4ED8", bd: "#BFDBFE" },
  }[tipo] || { bg: "var(--surface-2)", col: "var(--text-2)", bd: "var(--border)" });

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={apri}
        style={{
          width: 36, height: 36,
          background: aperta ? "var(--navy-3)" : "var(--navy-3)",
          border: "1px solid var(--navy-4)",
          borderRadius: "var(--radius-sm)",
          color: count > 0 ? "var(--amber)" : "var(--slate)",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 16, position: "relative",
          transition: "all .15s",
        }}
        title="Notifiche"
        ref={btnRef}
        data-campanella="true"
      >
        🔔
        {count > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#EF4444", color: "white",
            fontSize: 9, fontWeight: 700,
            width: 16, height: 16, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--navy)",
          }}>{count > 9 ? "9+" : count}</span>
        )}
      </button>

      {aperta && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setAperta(false)}
          />
          {/* Drawer - fixed per non essere clippato dalla sidebar */}
          <div style={{
            position: "fixed",
            ...popupPos,
            width: "min(360px, 92vw)", maxHeight: "70vh",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
            zIndex: 9999, overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <div style={{
              padding: "14px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--navy)",
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>
                🔔 Notifiche
              </div>
              <span style={{
                fontSize: 11, background: count > 0 ? "#EF4444" : "var(--navy-3)",
                color: "white", padding: "2px 7px", borderRadius: 10, fontWeight: 700,
              }}>{notifiche.length}</span>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifiche.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--text-3)" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Tutto in ordine!</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Nessuna notifica pendente</div>
                </div>
              ) : (
                notifiche.map(n => {
                  const c = coloreNota(n.tipo);
                  return (
                    <div
                      key={n.id}
                      onClick={() => { onNavigate("manutenzioni", { stato: n.tipo === "scaduta" ? "scaduta" : "tutti" }); setAperta(false); }}
                      style={{
                        padding: "12px 16px", borderBottom: "1px solid var(--border)",
                        cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start",
                        background: c.bg, borderLeft: `3px solid ${c.col}`,
                        transition: "opacity .15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.col, textTransform: "uppercase", letterSpacing: ".04em" }}>
                          {n.titolo}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                          {n.testo}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                          {fmtData(n.data)}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: c.col, flexShrink: 0 }}>→</span>
                    </div>
                  );
                })
              )}
            </div>

            {notifiche.length > 0 && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
                <button
                  onClick={() => { onNavigate("manutenzioni", {}); setAperta(false); }}
                  style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  Vedi tutte le manutenzioni →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
