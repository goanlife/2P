import { useState, useMemo } from "react";
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";

export function RicercaGlobale({ man=[], clienti=[], assets=[], piani=[], operatori=[], onNavigate, onClose }) {
  const [q, setQ] = useState("");

  const risultati = useMemo(() => {
    if (q.trim().length < 2) return [];
    const ql = q.toLowerCase();
    const res = [];

    man.filter(m => m.titolo?.toLowerCase().includes(ql) || m.note?.toLowerCase().includes(ql))
      .slice(0, 5).forEach(m => res.push({
        tipo: "manutenzione", icon: "⚡",
        titolo: m.titolo, sub: `${fmtData(m.data)} · ${m.stato}`,
        action: () => { onNavigate("manutenzioni", {}); onClose(); },
        colore: "#3B82F6",
      }));

    clienti.filter(c => c.rs?.toLowerCase().includes(ql) || c.contatto?.toLowerCase().includes(ql) || c.email?.toLowerCase().includes(ql))
      .slice(0, 4).forEach(c => res.push({
        tipo: "cliente", icon: "🏢",
        titolo: c.rs, sub: c.settore || c.contatto || "",
        action: () => { onNavigate("clienti", {}); onClose(); },
        colore: "#7F77DD",
      }));

    assets.filter(a => a.nome?.toLowerCase().includes(ql) || a.matricola?.toLowerCase().includes(ql) || a.tipo?.toLowerCase().includes(ql))
      .slice(0, 4).forEach(a => res.push({
        tipo: "asset", icon: "⚙",
        titolo: a.nome, sub: `${a.tipo} · ${a.matricola || ""}`,
        action: () => { onNavigate("assets", {}); onClose(); },
        colore: "#2563EB",
      }));

    piani.filter(p => p.nome?.toLowerCase().includes(ql) || p.descrizione?.toLowerCase().includes(ql))
      .slice(0, 3).forEach(p => res.push({
        tipo: "piano", icon: "🔄",
        titolo: p.nome, sub: p.frequenza,
        action: () => { onNavigate("piani", {}); onClose(); },
        colore: "#059669",
      }));

    operatori.filter(o => o.nome?.toLowerCase().includes(ql) || o.spec?.toLowerCase().includes(ql))
      .slice(0, 3).forEach(o => res.push({
        tipo: "utente", icon: "👤",
        titolo: o.nome, sub: `${o.spec} · ${o.tipo}`,
        action: () => { onNavigate("utenti", {}); onClose(); },
        colore: o.col,
      }));

    return res;
  }, [q, man, clienti, assets, piani, operatori]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(13,27,42,.8)",
      backdropFilter: "blur(6px)", zIndex: 3000,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "80px 16px 16px",
    }} onClick={onClose}>
      <div style={{
        width: "min(640px, 100%)", background: "var(--surface)",
        borderRadius: "var(--radius-xl)", border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 18, color: "var(--text-3)" }}>🔍</span>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cerca manutenzioni, clienti, asset, piani, utenti..."
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 15,
              background: "transparent", fontFamily: "var(--font-body)",
              color: "var(--text-1)",
            }}
          />
          {q && (
            <button onClick={() => setQ("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 16 }}>✕</button>
          )}
          <kbd style={{ fontSize: 11, padding: "2px 6px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-3)", cursor: "pointer" }} onClick={onClose}>ESC</kbd>
        </div>

        {/* Risultati */}
        {q.length < 2 ? (
          <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            Digita almeno 2 caratteri per cercare...
          </div>
        ) : risultati.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 500 }}>Nessun risultato per "{q}"</div>
          </div>
        ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {/* Raggruppa per tipo */}
            {["manutenzione","cliente","asset","piano","utente"].map(tipo => {
              const items = risultati.filter(r => r.tipo === tipo);
              if (!items.length) return null;
              const label = { manutenzione:"Manutenzioni", cliente:"Clienti", asset:"Asset", piano:"Piani", utente:"Utenti" }[tipo];
              return (
                <div key={tipo}>
                  <div style={{ padding: "8px 20px 4px", fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".06em", background: "var(--surface-2)" }}>
                    {label}
                  </div>
                  {items.map((r, i) => (
                    <div key={`res-${i}-${r.testo?.slice(0,10)||i}`} onClick={r.action} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                      cursor: "pointer", borderBottom: "1px solid var(--border)",
                      transition: "background .12s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: "var(--radius-sm)",
                        background: r.colore + "20", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 18, flexShrink: 0,
                      }}>{r.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {/* Evidenzia la query */}
                          {r.titolo}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 1 }}>{r.sub}</div>
                      </div>
                      <span style={{ color: "var(--text-3)", fontSize: 14 }}>→</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, fontSize: 11, color: "var(--text-3)" }}>
          <span>↵ per aprire</span>
          <span>ESC per chiudere</span>
          <span style={{ marginLeft: "auto" }}>{risultati.length} risultati</span>
        </div>
      </div>
    </div>
  );
}
