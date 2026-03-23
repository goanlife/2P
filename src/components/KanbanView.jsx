import { useState, useMemo } from "react";
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };

const COLONNE = [
  { id: "pianificata", label: "Pianificate", col: "#3B82F6", bg: "#EFF6FF" },
  { id: "inCorso",     label: "In corso",    col: "#F59E0B", bg: "#FFFBEB" },
  { id: "scaduta",     label: "Scadute",     col: "#EF4444", bg: "#FEF2F2" },
  { id: "completata",  label: "Completate",  col: "#059669", bg: "#ECFDF5" },
];

export function KanbanView({ man=[], clienti=[], assets=[], operatori=[], onStato, onMod }) {
  const [filtroOp, setFiltroOp] = useState(0);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const filtrati = useMemo(() =>
    filtroOp ? man.filter(m => m.operatoreId === filtroOp) : man,
    [man, filtroOp]
  );

  const handleDrop = (colId) => {
    if (!dragId || colId === dragId.stato) return;
    onStato(dragId.id, colId);
    setDragId(null);
    setDragOver(null);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "10px 16px",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>Filtro:</span>
        <button onClick={() => setFiltroOp(0)} style={{
          fontSize: 12, padding: "4px 10px", cursor: "pointer",
          fontWeight: filtroOp === 0 ? 700 : 400,
          background: filtroOp === 0 ? "var(--navy)" : "var(--surface)",
          color: filtroOp === 0 ? "white" : "var(--text-2)",
          borderRadius: 6, border: "1px solid var(--border)",
        }}>Tutti</button>
        {operatori.filter(o => o.tipo === "fornitore").map(o => (
          <button key={o.id} onClick={() => setFiltroOp(o.id)} style={{
            fontSize: 12, padding: "4px 10px", cursor: "pointer",
            fontWeight: filtroOp === o.id ? 700 : 400,
            background: filtroOp === o.id ? o.col : "var(--surface)",
            color: filtroOp === o.id ? "white" : "var(--text-2)",
            borderRadius: 6, border: `1px solid ${filtroOp === o.id ? o.col : "var(--border)"}`,
          }}>{o.nome.split(" ")[0]}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)" }}>
          {filtrati.length} attività · trascina per cambiare stato
        </span>
      </div>

      {/* Board */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 12,
        alignItems: "start",
      }}>
        {COLONNE.map(col => {
          const cards = filtrati.filter(m => m.stato === col.id)
            .sort((a, b) => {
              const po = { urgente: 0, alta: 1, media: 2, bassa: 3 };
              return (po[a.priorita] ?? 2) - (po[b.priorita] ?? 2) || a.data.localeCompare(b.data);
            });

          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.id)}
              style={{
                background: dragOver === col.id ? col.bg : "var(--surface-2)",
                border: `2px solid ${dragOver === col.id ? col.col : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                transition: "all .15s",
                minHeight: 120,
              }}
            >
              {/* Colonna header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 14px", borderBottom: `2px solid ${col.col}`,
                background: col.bg, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.col }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: col.col }}>{col.label}</span>
                <span style={{
                  marginLeft: "auto", fontSize: 11, fontWeight: 700,
                  background: col.col + "20", color: col.col,
                  padding: "2px 7px", borderRadius: 10,
                }}>{cards.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: "8px", display: "grid", gap: 6 }}>
                {cards.map(m => {
                  const cl = clienti.find(c => c.id === m.clienteId);
                  const as = assets.find(a => a.id === m.assetId);
                  const op = operatori.find(o => o.id === m.operatoreId);
                  return (
                    <div key={m.id}
                      draggable
                      onDragStart={() => setDragId(m)}
                      onDragEnd={() => { setDragId(null); setDragOver(null); }}
                      onClick={() => onMod(m)}
                      style={{
                        background: "var(--surface)",
                        border: `1px solid var(--border)`,
                        borderLeft: `3px solid ${PRI_COLOR[m.priorita] || "#ccc"}`,
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 12px",
                        cursor: "grab",
                        opacity: dragId?.id === m.id ? 0.4 : 1,
                        transition: "box-shadow .15s",
                        boxShadow: "var(--shadow-sm)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow-sm)"}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>
                        <span style={{fontSize:10,fontWeight:700,color:"var(--text-3)",marginRight:4,fontFamily:"var(--font-head)"}}>#{m.pianoId?m.numeroIntervento||1:m.id}</span>
                        {m.titolo}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: "var(--text-3)" }}>
                        <span>📅 {fmtData(m.data)}</span>
                        {cl && <span style={{ color: "#7F77DD", fontWeight: 500 }}>🏢 {cl.rs.split(" ")[0]}</span>}
                      </div>
                      {as && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>⚙ {as.nome}</div>}
                      {m.note && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                        {op && (
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: op.col + "22", color: op.col,
                            fontSize: 9, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {op.nome.split(" ").map(p => p[0]).join("").slice(0, 2)}
                          </div>
                        )}
                        {m.priorita === "urgente" && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", background: "#FEF2F2", padding: "1px 5px", borderRadius: 3 }}>⚡ URGENTE</span>
                        )}
                        {m.pianoId && (
                          <span style={{ fontSize: 10, color: "#059669", background: "#ECFDF5", padding: "1px 5px", borderRadius: 3 }}>🔄 PIANO</span>
                        )}
                        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-3)" }}>
                          ⏱ {m.durata}min
                        </span>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-3)", fontSize: 12, fontStyle: "italic" }}>
                    Nessuna attività
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
