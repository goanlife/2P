import React, { useState, useMemo } from "react";
import { supabase } from "../supabase";
import { Field, Overlay } from "./ui/Atoms";
import { useI18n } from "../i18n/index.jsx";

// ─── Costanti ─────────────────────────────────────────────────────────────
const SOTTOTIPI_STR = [
  { v:"correttiva",  l:"🔧 Correttiva",   desc:"Guasto in corso o appena risolto",        col:"#EF4444", bg:"#FEF2F2" },
  { v:"urgente",     l:"⚡ Urgente",       desc:"Guasto imminente, rischio blocco",         col:"#DC2626", bg:"#FEF2F2" },
  { v:"miglioria",   l:"⬆ Miglioria",     desc:"Miglioramento o upgrade volontario",       col:"#7C3AED", bg:"#F5F3FF" },
  { v:"normativa",   l:"⚖ Normativa",     desc:"Adempimento non pianificato da scadenziario",col:"#D97706", bg:"#FEF3C7" },
];

const CAUSE_GUASTO = [
  "Usura componente","Guasto elettrico","Guasto meccanico","Corrosione/ossidazione",
  "Errore operatore","Mancata manutenzione preventiva","Causa esterna",
  "Difetto di fabbricazione","Cause sconosciute","Altro",
];

const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const fmtDT   = d => d ? new Date(d).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—";

// ─── Badge sottotipo ───────────────────────────────────────────────────────
export function SottotipoBadge({ sottotipo, size=11 }) {
  const s = SOTTOTIPI_STR.find(x=>x.v===sottotipo);
  if (!s) return null;
  return (
    <span style={{
      fontSize:size, fontWeight:700, padding:"2px 8px", borderRadius:99,
      background:s.bg, color:s.col, border:`1px solid ${s.col}33`,
      whiteSpace:"nowrap",
    }}>{s.l}</span>
  );
}

// ─── Modal Approvazione ────────────────────────────────────────────────────
function ModalApprovazione({ richiesta, operatori=[], clienti=[], assets=[], onClose, onConferma, onRifiuta }) {
  const cl  = clienti.find(c=>c.id===richiesta.clienteId);
  const as  = assets.find(a=>a.id===richiesta.assetId);
  const st  = SOTTOTIPI_STR.find(s=>s.v===richiesta.sottotipo);

  const [operatoreId, setOpId]  = useState(richiesta.operatoreId||"");
  const [data,        setData]  = useState(richiesta.data||new Date().toISOString().split("T")[0]);
  const [durata,      setDurata]= useState(richiesta.durata||60);
  const [nota,        setNota]  = useState("");
  const [motRifiuto,  setMotRif]= useState("");
  const [tab,         setTab]   = useState("approva");
  const [loading,     setLoad]  = useState(false);

  const fornitori = operatori.filter(o=>o.tipo==="fornitore");

  const approva = async () => {
    setLoad(true);
    await onConferma({ ...richiesta, operatoreId:Number(operatoreId)||null, data, durata:Number(durata), nota });
    setLoad(false); onClose();
  };
  const rifiuta = async () => {
    if (!motRifiuto.trim()) return;
    setLoad(true);
    await onRifiuta(richiesta, motRifiuto);
    setLoad(false); onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(560px,96vw)", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>

        {/* Testata richiesta */}
        <div style={{ background:"var(--surface-2)", borderRadius:10, padding:"14px 16px", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{richiesta.titolo}</div>
              <div style={{ fontSize:12, color:"var(--text-3)", marginTop:2, display:"flex", gap:10 }}>
                {cl && <span>🏢 {cl.rs}</span>}
                {as && <span>⚙ {as.nome}</span>}
                <span>📅 Ricevuta: {fmtDate(richiesta.data)}</span>
              </div>
            </div>
            {st && <SottotipoBadge sottotipo={richiesta.sottotipo} />}
          </div>
          {richiesta.note && (
            <div style={{ fontSize:12, color:"var(--text-2)", padding:"8px 10px",
              background:"var(--surface)", borderRadius:6, borderLeft:"3px solid var(--border)" }}>
              {richiesta.note}
            </div>
          )}
          {richiesta.causaGuasto && (
            <div style={{ fontSize:11, color:"#D97706", marginTop:6 }}>
              💥 Causa: {richiesta.causaGuasto}
              {richiesta.fermoImpianto && <span style={{ color:"#EF4444", marginLeft:8 }}>⛔ Impianto FERMO</span>}
              {richiesta.downtimeOre && <span style={{ color:"#EF4444", marginLeft:8 }}>⏱ {richiesta.downtimeOre}h fermo</span>}
            </div>
          )}
        </div>

        {/* Tab approva / rifiuta */}
        <div style={{ display:"flex", borderBottom:"1px solid var(--border)", marginBottom:18 }}>
          {[["approva","✅ Approva e pianifica"],["rifiuta","✕ Rifiuta"]].map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              padding:"8px 18px", border:"none", background:"none", cursor:"pointer",
              fontWeight:tab===id?700:400, fontSize:13,
              color:tab===id?(id==="rifiuta"?"#DC2626":"var(--navy)"):"var(--text-3)",
              borderBottom:tab===id?`2px solid ${id==="rifiuta"?"#DC2626":"var(--amber)"}`:"2px solid transparent",
            }}>{l}</button>
          ))}
        </div>

        {tab === "approva" && (
          <div style={{ display:"grid", gap:13 }}>
            <Field label="Assegna operatore *">
              <select value={operatoreId} onChange={e=>setOpId(e.target.value)} style={{width:"100%"}}>
                <option value="">— Seleziona tecnico —</option>
                {fornitori.map(o=><option key={o.id} value={o.id}>{o.nome}{o.spec?` · ${o.spec}`:""}</option>)}
              </select>
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Data intervento *">
                <input type="date" value={data} onChange={e=>setData(e.target.value)}
                  min={new Date().toISOString().split("T")[0]} style={{width:"100%"}} />
              </Field>
              <Field label="Durata stimata (min)">
                <input type="number" value={durata} onChange={e=>setDurata(e.target.value)}
                  min={15} step={15} style={{width:"100%"}} />
              </Field>
            </div>
            <Field label="Nota interna (opzionale)">
              <textarea value={nota} onChange={e=>setNota(e.target.value)}
                rows={2} style={{width:"100%",resize:"vertical"}}
                placeholder="Istruzioni al tecnico, materiali da portare..." />
            </Field>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={onClose} className="btn-ghost">Annulla</button>
              <button onClick={approva} disabled={!operatoreId||!data||loading}
                className="btn-primary"
                style={{ background:"#059669" }}>
                {loading ? "⏳..." : "✅ Approva e pianifica"}
              </button>
            </div>
          </div>
        )}

        {tab === "rifiuta" && (
          <div style={{ display:"grid", gap:13 }}>
            <Field label="Motivo del rifiuto *">
              <textarea value={motRifiuto} onChange={e=>setMotRif(e.target.value)}
                rows={3} style={{width:"100%",resize:"vertical"}}
                placeholder="Es. Non di competenza, duplicato, informazioni insufficienti..." />
            </Field>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={onClose} className="btn-ghost">Annulla</button>
              <button onClick={rifiuta} disabled={!motRifiuto.trim()||loading}
                style={{ padding:"9px 20px", borderRadius:7, fontWeight:700, fontSize:13,
                  background:"#DC2626", color:"white", border:"none",
                  cursor:!motRifiuto.trim()?"default":"pointer" }}>
                {loading ? "⏳..." : "✕ Rifiuta richiesta"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ─── Card richiesta ────────────────────────────────────────────────────────
function CardRichiesta({ m, clienti=[], assets=[], operatori=[], onApprova, onRifiuta, onVedi }) {
  const cl = clienti.find(c=>c.id===m.clienteId);
  const as = assets.find(a=>a.id===m.assetId);
  const op = operatori.find(o=>o.id===m.operatoreId);
  const st = SOTTOTIPI_STR.find(s=>s.v===m.sottotipo);

  const PRI_COL = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };

  return (
    <div style={{
      background:"var(--surface)", border:"1px solid var(--border)",
      borderRadius:"var(--radius-xl)", padding:"14px 16px",
      borderLeft:`4px solid ${PRI_COL[m.priorita]||"#94A3B8"}`,
      display:"grid", gap:10,
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>{m.titolo}</div>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:3, display:"flex", gap:8, flexWrap:"wrap" }}>
            {cl && <span style={{ color:"#7F77DD", fontWeight:600 }}>🏢 {cl.rs}</span>}
            {as && <span>⚙ {as.nome}</span>}
            <span>📅 {fmtDate(m.data)}</span>
            {m.createdAt && <span style={{ color:"var(--text-3)" }}>ricevuta {fmtDT(m.createdAt)}</span>}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
            {st && <SottotipoBadge sottotipo={m.sottotipo} />}
            <span style={{
              fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:99,
              background:PRI_COL[m.priorita]+"20", color:PRI_COL[m.priorita],
            }}>
              {m.priorita?.charAt(0).toUpperCase()+m.priorita?.slice(1)}
            </span>
            {m.fermoImpianto && (
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:99,
                background:"#FEF2F2", color:"#DC2626" }}>⛔ Impianto fermo</span>
            )}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
          <button onClick={()=>onApprova(m)}
            style={{ padding:"7px 14px", borderRadius:7, fontWeight:700, fontSize:12,
              background:"#059669", color:"white", border:"none", cursor:"pointer" }}>
            ✅ Approva
          </button>
          <button onClick={()=>onRifiuta(m)}
            style={{ padding:"7px 14px", borderRadius:7, fontWeight:700, fontSize:12,
              background:"var(--surface-2)", color:"#DC2626",
              border:"1px solid #FECACA", cursor:"pointer" }}>
            ✕ Rifiuta
          </button>
        </div>
      </div>

      {/* Dettagli guasto */}
      {(m.causaGuasto||m.note) && (
        <div style={{ fontSize:12, padding:"8px 10px", background:"var(--surface-2)",
          borderRadius:7, color:"var(--text-2)", lineHeight:1.6 }}>
          {m.causaGuasto && <div>💥 <strong>Causa:</strong> {m.causaGuasto}{m.downtimeOre?` · Fermo: ${m.downtimeOre}h`:""}</div>}
          {m.note && <div>{m.causaGuasto?"📝 ":""}{m.note}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Vista storico straordinarie ───────────────────────────────────────────
function StoricoStraordinarie({ man=[], clienti=[], assets=[], operatori=[] }) {
  const [filtroSt, setFSt] = useState("tutti");
  const straord = man.filter(m=>m.tipo==="straordinaria");

  const filtrate = useMemo(() => {
    if (filtroSt==="tutti") return straord;
    return straord.filter(m=>m.sottotipo===filtroSt||m.stato===filtroSt);
  },[straord,filtroSt]);

  // KPI
  const correttive = straord.filter(m=>m.sottotipo==="correttiva");
  const fermi      = straord.filter(m=>m.fermoImpianto);
  const totDowntime= straord.reduce((s,m)=>s+(m.downtimeOre||0),0);
  const completate = straord.filter(m=>m.stato==="completata");

  return (
    <div style={{ display:"grid", gap:14 }}>
      {/* KPI straordinarie */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { v:straord.length,     l:"Totale straord.",  col:"var(--text-2)" },
          { v:correttive.length,  l:"Correttive",       col:"#EF4444" },
          { v:fermi.length,       l:"Con fermo impianto",col:"#DC2626" },
          { v:totDowntime>0?totDowntime+"h":"0h", l:"Totale downtime", col:"#F59E0B" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--surface-2)", borderRadius:"var(--radius)",
            padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:800, color:k.col }}>{k.v}</div>
            <div style={{ fontSize:10, color:"var(--text-3)", marginTop:3,
              textTransform:"uppercase", letterSpacing:".04em" }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {[["tutti","Tutte"],...SOTTOTIPI_STR.map(s=>[s.v,s.l]),
          ["completata","✅ Completate"],["pianificata","📅 Pianificate"]
        ].map(([v,l])=>(
          <button key={v} onClick={()=>setFSt(v)} style={{
            padding:"5px 12px", borderRadius:99, fontSize:12, fontWeight:filtroSt===v?700:400,
            background:filtroSt===v?"var(--navy)":"var(--surface)",
            color:filtroSt===v?"white":"var(--text-2)",
            border:filtroSt===v?"2px solid var(--navy)":"1px solid var(--border)",
            cursor:"pointer",
          }}>{l}</button>
        ))}
      </div>

      {/* Lista */}
      {filtrate.length===0 ? (
        <div style={{ textAlign:"center", padding:"32px 0", color:"var(--text-3)" }}>
          Nessuna manutenzione straordinaria trovata
        </div>
      ) : (
        <div style={{ display:"grid", gap:8 }}>
          {filtrate.map(m=>{
            const cl=clienti.find(c=>c.id===m.clienteId);
            const as=assets.find(a=>a.id===m.assetId);
            const op=operatori.find(o=>o.id===m.operatoreId);
            const ST_COL={completata:"#059669",pianificata:"#1E40AF",scaduta:"#EF4444",richiesta:"#D97706",rifiutata:"#6B7280"};
            return (
              <div key={m.id} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:10, padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{m.titolo}</div>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3, display:"flex", gap:8, flexWrap:"wrap" }}>
                      {cl&&<span style={{color:"#7F77DD"}}>{cl.rs}</span>}
                      {as&&<span>{as.nome}</span>}
                      {op&&<span>{op.nome}</span>}
                      <span>{fmtDate(m.data)}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {m.sottotipo&&<SottotipoBadge sottotipo={m.sottotipo} />}
                    <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                      borderRadius:99, background:(ST_COL[m.stato]||"#94A3B8")+"20",
                      color:ST_COL[m.stato]||"#94A3B8" }}>
                      {m.stato}
                    </span>
                  </div>
                </div>
                {m.causaGuasto&&(
                  <div style={{ fontSize:11, color:"var(--text-3)", marginTop:6 }}>
                    💥 {m.causaGuasto}{m.downtimeOre?` · ${m.downtimeOre}h fermo`:""}
                  </div>
                )}
                {m.rifiutatoMotivo&&(
                  <div style={{ fontSize:11, color:"#6B7280", marginTop:4, fontStyle:"italic" }}>
                    Rifiutata: {m.rifiutatoMotivo}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Componente principale ─────────────────────────────────────────────────
export function GestioneRichieste({
  man=[], clienti=[], assets=[], operatori=[],
  tenantId, meOperatore,
  onApprova, onRifiuta,
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState("in_attesa");
  const [modaleRich, setModaleRich] = useState(null);
  const [modoRifiuto, setModoRifiuto] = useState(false);

  const inAttesa    = man.filter(m=>m.stato==="richiesta");
  const approvate   = man.filter(m=>m.tipo==="straordinaria"&&m.approvataAt&&m.stato!=="completata");
  const storico     = man.filter(m=>m.tipo==="straordinaria");

  const apriApprovazione = (m) => { setModaleRich(m); setModoRifiuto(false); };
  const apriRifiuto      = (m) => { setModaleRich(m); setModoRifiuto(true); };

  return (
    <div style={{ display:"grid", gap:14 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:18, marginBottom:3 }}>🔧 Gestione Straordinarie</h2>
          <div style={{ fontSize:12, color:"var(--text-3)" }}>
            Workflow approvazione richieste · Storico interventi non pianificati
          </div>
        </div>
        {inAttesa.length>0 && (
          <div style={{ background:"#EF4444", color:"white", borderRadius:"50%",
            width:28, height:28, display:"flex", alignItems:"center",
            justifyContent:"center", fontWeight:800, fontSize:13 }}>
            {inAttesa.length}
          </div>
        )}
      </div>

      {/* Tab */}
      <div style={{ display:"flex", borderBottom:"1px solid var(--border)", gap:0 }}>
        {[
          { id:"in_attesa",  l:`🕐 In attesa (${inAttesa.length})` },
          { id:"in_corso",   l:`🔧 Approvate (${approvate.length})` },
          { id:"storico",    l:"📋 Storico straordinarie" },
        ].map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
            padding:"9px 18px", border:"none", background:"none", cursor:"pointer",
            fontWeight:tab===tb.id?700:400, fontSize:13,
            color:tab===tb.id?"var(--navy)":"var(--text-3)",
            borderBottom:tab===tb.id?"2px solid var(--amber)":"2px solid transparent",
          }}>{tb.l}</button>
        ))}
      </div>

      {/* Tab: In attesa */}
      {tab==="in_attesa" && (
        <div style={{ display:"grid", gap:10 }}>
          {inAttesa.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
              <div style={{ fontWeight:700, fontSize:15 }}>Nessuna richiesta in attesa</div>
              <div style={{ fontSize:12, color:"var(--text-3)", marginTop:6 }}>
                Le nuove richieste dai clienti appariranno qui
              </div>
            </div>
          ) : (
            inAttesa.map(m=>(
              <CardRichiesta key={m.id} m={m}
                clienti={clienti} assets={assets} operatori={operatori}
                onApprova={apriApprovazione}
                onRifiuta={apriRifiuto}
              />
            ))
          )}
        </div>
      )}

      {/* Tab: Approvate in corso */}
      {tab==="in_corso" && (
        <div style={{ display:"grid", gap:10 }}>
          {approvate.length===0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--text-3)" }}>
              Nessuna straordinaria approvata in corso
            </div>
          ) : (
            approvate.map(m=>{
              const cl=clienti.find(c=>c.id===m.clienteId);
              const op=operatori.find(o=>o.id===m.operatoreId);
              const ST_COL={completata:"#059669",pianificata:"#1E40AF",scaduta:"#EF4444",inCorso:"#F59E0B"};
              return (
                <div key={m.id} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                  borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{m.titolo}</div>
                      <div style={{ fontSize:12, color:"var(--text-3)", marginTop:3, display:"flex", gap:8 }}>
                        {cl&&<span style={{color:"#7F77DD"}}>{cl.rs}</span>}
                        {op&&<span>👤 {op.nome}</span>}
                        <span>📅 {m.data}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      {m.sottotipo&&<SottotipoBadge sottotipo={m.sottotipo} />}
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                        borderRadius:99, background:(ST_COL[m.stato]||"#94A3B8")+"20",
                        color:ST_COL[m.stato]||"#94A3B8" }}>{m.stato}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Storico */}
      {tab==="storico" && (
        <StoricoStraordinarie
          man={storico} clienti={clienti} assets={assets} operatori={operatori}
        />
      )}

      {/* Modale approvazione */}
      {modaleRich && (
        <ModalApprovazione
          richiesta={modaleRich}
          operatori={operatori} clienti={clienti} assets={assets}
          onClose={()=>setModaleRich(null)}
          onConferma={onApprova}
          onRifiuta={onRifiuta}
        />
      )}
    </div>
  );
}
