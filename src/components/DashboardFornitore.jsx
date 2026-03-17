import { useMemo, useState } from "react";
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const isoDate = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
function Av({ nome, col, size=36 }) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:(col||"#888")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:Math.round(size*.34),color:col||"#888",flexShrink:0}}>{(nome||"?").split(" ").map(p=>p[0]).join("").slice(0,2)}</div>;
}

const oggi = () => isoDate(new Date());
const traGiorni = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n); return isoDate(d);
};

function AttivaCard({ m, clienti, assets, onStato, onChiudi, urgent }) {
  const cl = clienti.find(c => c.id === m.clienteId);
  const as = assets.find(a => a.id === m.assetId);

  return (
    <div style={{
      border: `1px solid ${urgent ? "#FECACA" : "var(--border)"}`,
      borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 8,
      background: urgent ? "#FFF5F5" : "var(--surface)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 3, borderRadius: 99, background: PRI_COLOR[m.priorita] || "#ccc", alignSelf: "stretch", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{m.titolo}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>📅 {fmtData(m.data)}</span>
            <span>⏱ {m.durata} min</span>
            {cl && <span style={{ color: "#7F77DD", fontWeight: 500 }}>🏢 {cl.rs}</span>}
            {as && <span>⚙ {as.nome}</span>}
          </div>
        </div>
      </div>
      {/* Bottoni azione grandi — ottimizzati per touch */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {m.stato === "pianificata" && (
          <button onClick={() => onStato(m.id, "inCorso")}
            style={{ flex: 1, padding: "10px", background: "#F59E0B", color: "white",
              border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ▶ Avvia
          </button>
        )}
        {m.stato === "inCorso" && (
          <button onClick={() => onChiudi(m)}
            style={{ flex: 1, padding: "10px", background: "#059669", color: "white",
              border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ✓ Completa intervento
          </button>
        )}
        {m.stato === "scaduta" && (
          <button onClick={() => onStato(m.id, "inCorso")}
            style={{ flex: 1, padding: "10px", background: "#EF4444", color: "white",
              border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ▶ Avvia ora
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardFornitore({ me, man, clienti, assets, onStato, onApriChiudi }) {
  const [settimana, setSettimana] = useState(0); // 0=questa, 1=prossima

  const lunedi = useMemo(() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1 + settimana * 7);
    return isoDate(d);
  }, [settimana]);
  const domenica = useMemo(() => {
    const d = new Date(lunedi);
    d.setDate(d.getDate() + 6);
    return isoDate(d);
  }, [lunedi]);

  const mie = useMemo(() =>
    man.filter(m => m.operatoreId === me.id && m.stato !== "completata")
      .sort((a, b) => a.data.localeCompare(b.data)),
    [man, me.id]
  );

  const oggi_ = oggi();
  const domani = traGiorni(1);

  const scadute    = mie.filter(m => m.data < oggi_);
  const perOggi    = mie.filter(m => m.data === oggi_);
  const perDomani  = mie.filter(m => m.data === domani);
  const dellaSettimana = mie.filter(m => m.data >= lunedi && m.data <= domenica);
  const completateM = man.filter(m => m.operatoreId === me.id && m.stato === "completata");

  // Raggruppa settimana per giorno
  const GIORNI_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const giorniSettimana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunedi); d.setDate(d.getDate() + i);
    const iso = isoDate(d);
    return {
      iso,
      label: GIORNI_IT[i],
      num: d.getDate(),
      isOggi: iso === oggi_,
      attivita: man.filter(m => m.operatoreId === me.id && m.data === iso),
    };
  });

  const StatCard = ({ v, l, c, icon }) => (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "16px",
      borderTop: `3px solid ${c}`, flex: 1, minWidth: 100,
    }}>
      <div style={{ fontSize: 28, fontFamily: "var(--font-head)", fontWeight: 700, color: c }}>{v}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 2 }}>{icon} {l}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Header personale */}
      <div style={{
        background: `linear-gradient(135deg, ${me.col}20, ${me.col}05)`,
        border: `1px solid ${me.col}40`,
        borderRadius: "var(--radius-xl)",
        padding: "20px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <Av nome={me.nome} col={me.col} size={52} />
        <div>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 20 }}>
            Ciao, {me.nome.split(" ")[0]} 👋
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            {me.spec} · {perOggi.length > 0
              ? `${perOggi.length} attività oggi`
              : scadute.length > 0
                ? `⚠ ${scadute.length} attività in ritardo`
                : "Nessuna attività per oggi"}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatCard v={scadute.length}    l="In ritardo"  c="#EF4444" icon="🔴" />
        <StatCard v={perOggi.length}    l="Oggi"        c="#F59E0B" icon="📅" />
        <StatCard v={mie.length}        l="Assegnate"   c="#3B82F6" icon="⚡" />
        <StatCard v={completateM.length}l="Completate"  c="#059669" icon="✅" />
      </div>

      {/* Alert scadute */}
      {scadute.length > 0 && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA",
          borderLeft: "4px solid #EF4444", borderRadius: "var(--radius-lg)",
          padding: "14px 18px",
        }}>
          <div style={{ fontWeight: 700, color: "#991B1B", marginBottom: 8, fontSize: 13 }}>
            🔴 {scadute.length} attività in ritardo
          </div>
          {scadute.map(m => (
            <AttivaCard key={m.id} m={m} clienti={clienti} assets={assets}
              onStato={onStato} onChiudi={onApriChiudi} urgent />
          ))}
        </div>
      )}

      {/* Oggi */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "18px 20px" }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
          📅 Oggi — {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {perOggi.length === 0
          ? <div style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "16px 0" }}>Nessuna attività per oggi 🎉</div>
          : perOggi.map(m => (
            <AttivaCard key={m.id} m={m} clienti={clienti} assets={assets}
              onStato={onStato} onChiudi={onApriChiudi} />
          ))
        }
      </div>

      {/* Vista settimana */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 15, flex: 1 }}>
            📆 {settimana === 0 ? "Questa settimana" : "Prossima settimana"}
          </div>
          <button onClick={() => setSettimana(0)}
            style={{ fontSize: 12, padding: "4px 10px", fontWeight: settimana === 0 ? 700 : 400,
              background: settimana === 0 ? "var(--navy)" : "var(--surface)",
              color: settimana === 0 ? "white" : "var(--text-2)", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }}>
            Questa
          </button>
          <button onClick={() => setSettimana(1)}
            style={{ fontSize: 12, padding: "4px 10px", fontWeight: settimana === 1 ? 700 : 400,
              background: settimana === 1 ? "var(--navy)" : "var(--surface)",
              color: settimana === 1 ? "white" : "var(--text-2)", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer" }}>
            Prossima
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {giorniSettimana.map(g => (
            <div key={g.iso} style={{
              borderRadius: "var(--radius-sm)",
              border: g.isOggi ? "2px solid var(--navy)" : "1px solid var(--border)",
              background: g.isOggi ? "var(--navy)" : g.attivita.length > 0 ? "var(--surface-2)" : "transparent",
              padding: "6px 4px",
              minHeight: 64,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: g.isOggi ? "var(--amber)" : "var(--text-3)",
                textAlign: "center", textTransform: "uppercase", letterSpacing: ".04em" }}>{g.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: g.isOggi ? "white" : "var(--text-1)",
                textAlign: "center", marginBottom: 4 }}>{g.num}</div>
              {g.attivita.slice(0, 2).map(m => (
                <div key={m.id} style={{
                  fontSize: 9, padding: "2px 4px", borderRadius: 3, marginBottom: 2,
                  background: (PRI_COLOR[m.priorita] || "#888") + "20",
                  color: PRI_COLOR[m.priorita] || "#888",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600,
                }}>{m.titolo}</div>
              ))}
              {g.attivita.length > 2 && (
                <div style={{ fontSize: 9, color: "var(--text-3)", textAlign: "center", fontWeight: 600 }}>
                  +{g.attivita.length - 2}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
