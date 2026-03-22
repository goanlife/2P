import { useMemo, useState } from "react";
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const isoDate = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

// Grafico a barre semplice in SVG puro — nessuna dipendenza esterna
function BarChart({ data, colore = "#3B82F6", height = 160, label }) {
  const max = Math.max(...data.map(d => d.v), 1);
  const w = 100 / data.length;
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>}
      <svg width="100%" height={height} style={{ overflow: "visible" }}>
        {data.map((d, i) => {
          const barH = (d.v / max) * (height - 30);
          const x = i * w;
          return (
            <g key={i}>
              <rect
                x={`${x + w * 0.1}%`} y={height - 30 - barH}
                width={`${w * 0.8}%`} height={barH}
                fill={colore} rx={3} opacity={.85}
              />
              <text
                x={`${x + w / 2}%`} y={height - 12}
                textAnchor="middle" fontSize={10} fill="var(--text-3)"
              >{d.l}</text>
              {d.v > 0 && (
                <text
                  x={`${x + w / 2}%`} y={height - 30 - barH - 4}
                  textAnchor="middle" fontSize={10} fontWeight="bold" fill={colore}
                >{d.v}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Grafico a torta SVG
function PieChart({ slices, size = 140 }) {
  const total = slices.reduce((s, x) => s + x.v, 0);
  if (total === 0) return <div style={{ textAlign: "center", color: "var(--text-3)", padding: 20, fontSize: 13 }}>Nessun dato</div>;
  let angle = -90;
  const r = size / 2 - 4;
  const cx = size / 2, cy = size / 2;
  const toRad = deg => (deg * Math.PI) / 180;
  const arc = (a1, a2) => {
    const x1 = cx + r * Math.cos(toRad(a1));
    const y1 = cy + r * Math.sin(toRad(a1));
    const x2 = cx + r * Math.cos(toRad(a2));
    const y2 = cy + r * Math.sin(toRad(a2));
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.filter(s => s.v > 0).map((s, i) => {
          const sweep = (s.v / total) * 360;
          const path = arc(angle, angle + sweep);
          angle += sweep;
          return <path key={i} d={path} fill={s.col} stroke="var(--surface)" strokeWidth={2} />;
        })}
      </svg>
      <div style={{ display: "grid", gap: 6 }}>
        {slices.filter(s => s.v > 0).map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: s.col, flexShrink: 0, display: "inline-block" }} />
            <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{s.l}</span>
            <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, marginLeft: "auto", minWidth: 24, textAlign: "right" }}>{s.v}</span>
            <span style={{ color: "var(--text-3)", fontSize: 11 }}>({Math.round(s.v / total * 100)}%)</span>
          </div>
        ))}
        {costoPerOperatore.length > 0 && (
          <Card title="💰 Ore e costo per operatore">
            <div style={{ display: "grid", gap: 8 }}>
              {costoPerOperatore.map(o => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: o.col, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{o.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{o.interventi} interventi</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.ore}h</div>
                    {o.costo && <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700 }}>{fmtEuro(o.costo)}</div>}
                  </div>
                </div>
              ))}
              {costoPerOperatore.some(o => !o.costo) && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>
                  * Configura la tariffa oraria in Utenti per vedere il costo
                </div>
              )}
            </div>
          </Card>
        )}

        {costoPerAsset.length > 0 && (
          <Card title="⚙ Ore di manutenzione per asset">
            <div style={{ display: "grid", gap: 8 }}>
              {costoPerAsset.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", width: 20, textAlign: "right" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</div>
                    <div style={{ height: 5, background: "var(--surface-3)", borderRadius: 99, marginTop: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(a.ore / Math.max(...costoPerAsset.map(x => x.ore), 1)) * 100}%`, background: "#D97706", borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.ore}h</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{a.interventi} interventi</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export function Statistiche({man=[], clienti=[], assets=[], piani=[], operatori=[]}) {
  const isParziale = man.length >= 200; // dati parziali se paginati
  const [periodo, setPeriodo] = useState(6); // ultimi N mesi

  // oggi come useMemo per evitare stale reference a mezzanotte
  const da = useMemo(() => {
    const oggi = new Date();
    const d = new Date(oggi); d.setMonth(d.getMonth() - periodo); return isoDate(d);
  }, [periodo]);

  const manPeriodo = useMemo(() => man.filter(m => m.data >= da), [man, da]);

  // Manutenzioni per mese (ultimi 6/12 mesi)
  const perMese = useMemo(() => {
    const mesi = [];
    const oggi = new Date();
    for (let i = periodo - 1; i >= 0; i--) {
      const d = new Date(oggi); d.setMonth(d.getMonth() - i);
      const y = d.getFullYear(), m = d.getMonth();
      const cnt = manPeriodo.filter(x => {
        const xd = new Date(x.data);
        return xd.getFullYear() === y && xd.getMonth() === m;
      }).length;
      mesi.push({ l: MESI[m].slice(0, 3), v: cnt });
    }
    return mesi;
  }, [manPeriodo, periodo]);

  // Completate per mese
  const completatePerMese = useMemo(() => {
    const mesi = [];
    const oggi = new Date();
    for (let i = periodo - 1; i >= 0; i--) {
      const d = new Date(oggi); d.setMonth(d.getMonth() - i);
      const y = d.getFullYear(), m = d.getMonth();
      const cnt = manPeriodo.filter(x => {
        const xd = new Date(x.data);
        return xd.getFullYear() === y && xd.getMonth() === m && x.stato === "completata";
      }).length;
      mesi.push({ l: MESI[m].slice(0, 3), v: cnt });
    }
    return mesi;
  }, [manPeriodo, periodo]);

  // Distribuzione per stato
  const perStato = useMemo(() => [
    { l: "Pianificate", v: man.filter(m => m.stato === "pianificata").length,   col: "#3B82F6" },
    { l: "In corso",    v: man.filter(m => m.stato === "inCorso").length,        col: "#F59E0B" },
    { l: "Completate",  v: man.filter(m => m.stato === "completata").length,     col: "#059669" },
    { l: "Scadute",     v: man.filter(m => m.stato === "scaduta").length,        col: "#EF4444" },
  ], [man]);

  // Distribuzione per tipo
  const perTipo = useMemo(() => [
    { l: "Ordinaria",     v: man.filter(m => m.tipo === "ordinaria").length,     col: "#059669" },
    { l: "Straordinaria", v: man.filter(m => m.tipo === "straordinaria").length, col: "#F97316" },
  ], [man]);

  // Carico fornitori
  const perFornitore = useMemo(() =>
    operatori.filter(o => o.tipo === "fornitore").map(o => ({
      l: o.nome.split(" ")[0],
      v: manPeriodo.filter(m => m.operatoreId === o.id).length,
      col: o.col,
    })).filter(x => x.v > 0).sort((a, b) => b.v - a.v),
    [operatori, manPeriodo]
  );

  // Top clienti
  const topClienti = useMemo(() =>
    clienti.map(c => ({
      ...c,
      cnt: manPeriodo.filter(m => m.clienteId === c.id).length,
    })).filter(c => c.cnt > 0).sort((a, b) => b.cnt - a.cnt).slice(0, 8),
    [clienti, manPeriodo]
  );

  const maxClienti = Math.max(...topClienti.map(c => c.cnt), 1);

  // Costo per operatore: ore_effettive × tariffa_ora (se disponibile)
  const costoPerOperatore = useMemo(() =>
    operatori.filter(o => o.tipo === "fornitore").map(o => {
      const sue = manPeriodo.filter(m => m.operatoreId === o.id && m.stato === "completata" && m.oreEffettive);
      const ore = sue.reduce((s, m) => s + (m.oreEffettive || 0), 0);
      const costo = o.tariffa_ora ? ore * o.tariffa_ora : null;
      return { ...o, ore: Math.round(ore * 10) / 10, costo, interventi: sue.length };
    }).filter(x => x.ore > 0).sort((a, b) => b.ore - a.ore),
    [operatori, manPeriodo]
  );

  // Costo per asset: somma ore operative
  const costoPerAsset = useMemo(() =>
    assets.map(a => {
      const sue = manPeriodo.filter(m => m.assetId === a.id && m.stato === "completata");
      const ore = sue.reduce((s, m) => s + (m.oreEffettive || 0), 0);
      return { ...a, ore: Math.round(ore * 10) / 10, interventi: sue.length };
    }).filter(x => x.interventi > 0).sort((a, b) => b.ore - a.ore).slice(0, 8),
    [assets, manPeriodo]
  );

  const fmtEuro = v => v ? "€" + Number(v).toFixed(0) : null;

  // KPI generali
  const totale      = man.length;
  const completate  = man.filter(m => m.stato === "completata").length;
  const tasso       = totale > 0 ? Math.round(completate / totale * 100) : 0;
  const scadute     = man.filter(m => m.stato === "scaduta").length;
  const urgenti     = man.filter(m => m.priorita === "urgente" && m.stato !== "completata").length;

  const Card = ({ title, children }) => (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-xl)", padding: "20px 22px",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {isParziale && (
        <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:6,padding:"8px 14px",fontSize:12,color:"#92400E"}}>
          ⚠ Statistiche basate sulle ultime {man.length} attività (6 mesi). Per dati completi vai in Manutenzioni → "Carica tutto".
        </div>
      )}
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 20 }}>📊 Statistiche</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>Analisi delle attività di manutenzione</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[3, 6, 12].map(n => (
            <button key={n} onClick={() => setPeriodo(n)} style={{
              fontSize: 12, padding: "5px 12px", cursor: "pointer",
              fontWeight: periodo === n ? 700 : 400,
              background: periodo === n ? "var(--navy)" : "var(--surface)",
              color: periodo === n ? "white" : "var(--text-2)",
              borderColor: periodo === n ? "var(--navy)" : "var(--border)",
              borderRadius: "var(--radius-sm)", border: "1px solid",
            }}>Ultimi {n} mesi</button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {[
          { v: totale,     l: "Totale",          c: "#0D1B2A", icon: "📋" },
          { v: `${tasso}%`,l: "Tasso completamento", c: "#059669", icon: "✅" },
          { v: completate, l: "Completate",      c: "#059669", icon: "✓" },
          { v: scadute,    l: "Scadute",          c: "#EF4444", icon: "⚠" },
          { v: urgenti,    l: "Urgenti aperte",   c: "#F97316", icon: "⚡" },
          { v: piani.filter(p => p.attivo).length, l: "Piani attivi", c: "#3B82F6", icon: "🔄" },
        ].map(k => (
          <div key={k.l} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderTop: `3px solid ${k.c}`, borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
          }}>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 26, fontWeight: 700, color: k.c }}>
              {k.icon} {k.v}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 3 }}>
              {k.l}
            </div>
          </div>
        ))}
      </div>

      {/* Grafici */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <Card title="📅 Attività per mese">
          <BarChart data={perMese} colore="#3B82F6" />
        </Card>

        <Card title="✅ Completate per mese">
          <BarChart data={completatePerMese} colore="#059669" />
        </Card>

        <Card title="⚡ Distribuzione per stato">
          <PieChart slices={perStato} />
        </Card>

        <Card title="🔧 Ordinarie vs Straordinarie">
          <PieChart slices={perTipo} />
        </Card>

        {perFornitore.length > 0 && (
          <Card title="👤 Attività per fornitore">
            <BarChart data={perFornitore} colore="#7F77DD" />
          </Card>
        )}

        {topClienti.length > 0 && (
          <Card title="🏢 Attività per cliente">
            <div style={{ display: "grid", gap: 8 }}>
              {topClienti.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", width: 20, textAlign: "right" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.rs}</div>
                    <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 99, marginTop: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(c.cnt / maxClienti) * 100}%`, background: "#7F77DD", borderRadius: 99 }} />
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 15, color: "#7F77DD", minWidth: 28, textAlign: "right" }}>{c.cnt}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {costoPerOperatore.length > 0 && (
          <Card title="💰 Ore e costo per operatore">
            <div style={{ display: "grid", gap: 8 }}>
              {costoPerOperatore.map(o => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: o.col, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{o.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{o.interventi} interventi</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{o.ore}h</div>
                    {o.costo && <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700 }}>{fmtEuro(o.costo)}</div>}
                  </div>
                </div>
              ))}
              {costoPerOperatore.some(o => !o.costo) && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>
                  * Configura la tariffa oraria in Utenti per vedere il costo
                </div>
              )}
            </div>
          </Card>
        )}

        {costoPerAsset.length > 0 && (
          <Card title="⚙ Ore di manutenzione per asset">
            <div style={{ display: "grid", gap: 8 }}>
              {costoPerAsset.map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", width: 20, textAlign: "right" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</div>
                    <div style={{ height: 5, background: "var(--surface-3)", borderRadius: 99, marginTop: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(a.ore / Math.max(...costoPerAsset.map(x => x.ore), 1)) * 100}%`, background: "#D97706", borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.ore}h</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{a.interventi} interventi</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
