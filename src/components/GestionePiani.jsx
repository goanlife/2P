import React, { useState, useMemo } from "react";
import { Overlay, Field } from "./ui/Atoms";
import { ModalGeneraOdL } from "./GeneraOdL";
import { HelpButton } from "./HelpPanel";

// ─── Costanti ─────────────────────────────────────────────────────────────
const FREQ = [
  { v:"settimanale", l:"Ogni settimana",  giorni:7   },
  { v:"mensile",     l:"Ogni mese",       giorni:30  },
  { v:"bimestrale",  l:"Ogni 2 mesi",     giorni:60  },
  { v:"trimestrale", l:"Ogni 3 mesi",     giorni:90  },
  { v:"semestrale",  l:"Ogni 6 mesi",     giorni:180 },
  { v:"annuale",     l:"Ogni anno",       giorni:365 },
];
const AGGREG = [
  { v:"per_visita",    l:"Per visita",    sub:"Stessa data+operatore → 1 OdL",       icon:"👤" },
  { v:"per_attivita",  l:"Per attività",  sub:"1 OdL per ogni singola attività",      icon:"⚙" },
  { v:"per_mese",      l:"Per mese",      sub:"Tutte le attività del mese → 1 OdL",  icon:"📅" },
  { v:"per_categoria", l:"Per categoria", sub:"Raggruppate per categoria",            icon:"🏷" },
];
const PRI_COL = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const oggi = () => new Date().toISOString().split("T")[0];

// ─── Modal Piano (crea/modifica template) ─────────────────────────────────
function ModalPiano({ ini, onClose, onSalva }) {
  const [f, sf] = useState(ini || {
    nome:"", descrizione:"", aggregazioneOdl:"per_visita",
  });
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  return (
    <Overlay onClose={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(500px,96vw)", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:20 }}>
          {ini ? "Modifica piano" : "Nuovo piano di manutenzione"}
        </div>
        <div style={{ display:"grid", gap:14 }}>
          <Field label="Nome piano *">
            <input value={f.nome} onChange={e=>s("nome",e.target.value)}
              style={{width:"100%"}} autoFocus
              placeholder="Es. Piano antincendio, Manutenzione verde, Impianti elettrici..." />
          </Field>
          <Field label="Descrizione">
            <textarea value={f.descrizione||""} onChange={e=>s("descrizione",e.target.value)}
              rows={2} style={{width:"100%",resize:"vertical"}}
              placeholder="Capitolato, normative di riferimento, note generali..." />
          </Field>

          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-2)",
              textTransform:"uppercase", letterSpacing:".04em", marginBottom:8 }}>
              Come aggregare le attività negli Ordini di Lavoro?
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {AGGREG.map(a=>(
                <div key={a.v} onClick={()=>s("aggregazioneOdl",a.v)} style={{
                  padding:"10px 12px", borderRadius:8, cursor:"pointer",
                  border:`2px solid ${f.aggregazioneOdl===a.v?"#3B82F6":"var(--border)"}`,
                  background: f.aggregazioneOdl===a.v?"#EFF6FF":"var(--surface)",
                }}>
                  <div style={{ fontSize:16, marginBottom:4 }}>{a.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color: f.aggregazioneOdl===a.v?"#1E40AF":"var(--text-1)" }}>{a.l}</div>
                  <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>{a.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={()=>onSalva(f)} disabled={!f.nome.trim()} className="btn-primary">
            {ini ? "Salva" : "Crea piano"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal Voce (attività template) ───────────────────────────────────────
function ModalVoce({ ini, pianoId, onClose, onSalva }) {
  const [f, sf] = useState(ini || {
    titolo:"", frequenza:"mensile", durata:60,
    tipo:"ordinaria", priorita:"media", nota:"", categoria:"",
  });
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  return (
    <Overlay onClose={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(480px,96vw)", maxHeight:"90vh", overflow:"auto",
        padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:20 }}>
          {ini ? "Modifica attività" : "Aggiungi attività al piano"}
        </div>
        <div style={{ display:"grid", gap:13 }}>
          <Field label="Attività *">
            <input value={f.titolo} onChange={e=>s("titolo",e.target.value)}
              style={{width:"100%"}} autoFocus
              placeholder="Es. Taglio erba, Verifica estintori, Cambio filtri, Controllo caldaia..." />
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Frequenza">
              <select value={f.frequenza} onChange={e=>s("frequenza",e.target.value)} style={{width:"100%"}}>
                {FREQ.map(fr=><option key={fr.v} value={fr.v}>{fr.l}</option>)}
              </select>
            </Field>
            <Field label="Durata (minuti)">
              <input type="number" min={15} step={15} value={f.durata}
                onChange={e=>s("durata",Number(e.target.value))} style={{width:"100%"}} />
            </Field>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Tipo">
              <select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}>
                <option value="ordinaria">Ordinaria</option>
                <option value="straordinaria">Straordinaria</option>
              </select>
            </Field>
            <Field label="Priorità">
              <select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}>
                <option value="bassa">🔵 Bassa</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🔴 Alta</option>
                <option value="urgente">⚡ Urgente</option>
              </select>
            </Field>
          </div>
          <Field label="Categoria (per raggruppamento OdL)">
            <input value={f.categoria||""} onChange={e=>s("categoria",e.target.value)}
              style={{width:"100%"}} placeholder="Es. Antincendio, Verde, Impianti elettrici..." />
          </Field>
          <Field label="Note / istruzioni specifiche">
            <textarea value={f.note||""} onChange={e=>s("note",e.target.value)}
              rows={2} style={{width:"100%",resize:"vertical"}}
              placeholder="Istruzioni operative, riferimenti normativi, attenzioni..." />
          </Field>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={()=>onSalva({...f, pianoId})} disabled={!f.titolo.trim()} className="btn-primary">
            {ini ? "Salva" : "Aggiungi attività"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal Applica a Sito ─────────────────────────────────────────────────
function ModalApplicaSito({ pianoId, ini, clienti=[], operatori=[], onClose, onSalva }) {
  const fornitori = operatori.filter(o=>o.tipo==="fornitore");
  const [f, sf] = useState(ini ? {
    clienteId: String(ini.clienteId),
    operatoreId: String(ini.operatoreId||""),
    dataInizio: ini.dataInizio || oggi(),
    dataFine: ini.dataFine || "",
    note: ini.note || "",
  } : {
    clienteId: "", operatoreId: "",
    dataInizio: oggi(), dataFine: "", note: "",
  });
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  const ok = !!f.clienteId;
  return (
    <Overlay onClose={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(460px,96vw)", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>
          {ini ? "Modifica sito" : "Applica piano a un sito"}
        </div>
        <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:18 }}>
          Il piano verrà applicato al sito selezionato. Da qui potrai generare gli Ordini di Lavoro.
        </div>
        <div style={{ display:"grid", gap:13 }}>
          <Field label="Cliente / Sito *">
            <select value={f.clienteId} onChange={e=>s("clienteId",e.target.value)} style={{width:"100%"}}>
              <option value="">— Seleziona cliente —</option>
              {clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
            </select>
          </Field>
          <Field label="Operatore di default (per questo sito)">
            <select value={f.operatoreId} onChange={e=>s("operatoreId",e.target.value)} style={{width:"100%"}}>
              <option value="">— Da assegnare all'OdL —</option>
              {fornitori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}{o.spec?` · ${o.spec}`:""}</option>)}
            </select>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Data inizio contratto">
              <input type="date" value={f.dataInizio} onChange={e=>s("dataInizio",e.target.value)} style={{width:"100%"}} />
            </Field>
            <Field label="Data fine (opzionale)">
              <input type="date" value={f.dataFine} onChange={e=>s("dataFine",e.target.value)} style={{width:"100%"}} />
            </Field>
          </div>
          <Field label="Note">
            <textarea value={f.note} onChange={e=>s("note",e.target.value)}
              rows={2} style={{width:"100%",resize:"vertical"}} />
          </Field>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={()=>onSalva({
            ...f, pianoId,
            clienteId: Number(f.clienteId),
            operatoreId: f.operatoreId ? Number(f.operatoreId) : null,
          })} disabled={!ok} className="btn-primary">
            {ini ? "Salva" : "Applica al sito"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Pannello piano selezionato ───────────────────────────────────────────
function PannelloPiano({
  piano, voci=[], siti=[], manutenzioni=[],
  clienti=[], operatori=[], assets=[],
  uid, tenantId,
  onModPiano, onDelPiano,
  onAggVoce, onModVoce, onDelVoce,
  onAggSito, onModSito, onDelSito, onToggleSito,
}) {
  const [tab, setTab]             = useState("attivita"); // attivita | siti
  const [showVoce, setShowVoce]   = useState(false);
  const [inModVoce, setInModVoce] = useState(null);
  const [showSito, setShowSito]   = useState(false);
  const [inModSito, setInModSito] = useState(null);
  const [sitoGenera, setSitoGenera] = useState(null); // sito su cui generare OdL

  const aggLabel = AGGREG.find(a=>a.v===piano.aggregazioneOdl);

  // Stima interventi/anno dalle voci
  const stimaAnno = voci.reduce((t,v)=>{
    const f = {settimanale:52,mensile:12,bimestrale:6,trimestrale:4,semestrale:2,annuale:1};
    return t+(f[v.frequenza]||12);
  },0);

  return (
    <div style={{ display:"grid", gap:14 }}>
      {/* Header piano */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"var(--radius-xl)", padding:"18px 20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:18 }}>{piano.nome}</div>
            {piano.descrizione && (
              <div style={{ fontSize:12, color:"var(--text-2)", marginTop:4, fontStyle:"italic" }}>
                {piano.descrizione}
              </div>
            )}
            <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, padding:"3px 9px", borderRadius:99,
                background:"#EFF6FF", color:"#1E40AF", fontWeight:600 }}>
                {aggLabel?.icon} Aggrega {aggLabel?.l}
              </span>
              <span style={{ fontSize:11, color:"var(--text-3)" }}>
                {voci.length} attività · ~{stimaAnno} interventi/anno
              </span>
              <span style={{ fontSize:11, color:"var(--text-3)" }}>
                {siti.length} sito/i
              </span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button className="btn-sm btn-icon" onClick={()=>onModPiano(piano)}>✏</button>
            <button className="btn-sm btn-icon btn-danger" onClick={()=>onDelPiano(piano.id)}>✕</button>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid var(--border)" }}>
        {[
          { id:"attivita", l:`Attività (${voci.length})` },
          { id:"siti",     l:`Siti applicati (${siti.length})` },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"9px 18px", border:"none", background:"none", cursor:"pointer",
            fontWeight: tab===t.id?700:400, fontSize:13,
            color: tab===t.id?"var(--navy)":"var(--text-3)",
            borderBottom: tab===t.id?"2px solid var(--amber)":"2px solid transparent",
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── Tab Attività ── */}
      {tab === "attivita" && (
        <div>
          {voci.length === 0 ? (
            <div style={{ border:"2px dashed var(--border)", borderRadius:10,
              padding:"36px 24px", textAlign:"center", color:"var(--text-3)" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>Nessuna attività nel piano</div>
              <div style={{ fontSize:12, lineHeight:1.7, marginBottom:18 }}>
                Aggiungi le attività ricorrenti: taglio erba, verifica estintori, cambio filtri, ecc.<br/>
                Ogni attività ha la sua frequenza e durata. Il piano è un <strong>template riusabile</strong>:<br/>
                puoi applicarlo a più siti diversi.
              </div>
              <button className="btn-primary"
                onClick={()=>{setInModVoce(null);setShowVoce(true);}}>
                + Aggiungi prima attività
              </button>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gap:6, marginBottom:10 }}>
                {voci.sort((a,b)=>a.ordine-b.ordine).map(v=>{
                  const freq = FREQ.find(f=>f.v===v.frequenza);
                  return (
                    <div key={v.id} style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"11px 14px", borderRadius:8,
                      background:"var(--surface-2)", border:"1px solid var(--border)",
                      borderLeft:`3px solid ${PRI_COL[v.priorita]||"#94A3B8"}`,
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13 }}>{v.titolo}</div>
                        <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2, display:"flex", gap:8 }}>
                          {v.categoria && <span style={{ background:"var(--surface)",
                            border:"1px solid var(--border)", padding:"1px 6px",
                            borderRadius:99, fontWeight:600 }}>🏷 {v.categoria}</span>}
                          {v.note && <span>📝 {v.note.slice(0,40)}{v.note.length>40?"...":""}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:11, padding:"2px 9px", borderRadius:99,
                        background:"#EFF6FF", color:"#1E40AF", fontWeight:600, whiteSpace:"nowrap" }}>
                        {freq?.l||v.frequenza}
                      </span>
                      <span style={{ fontSize:11, color:"var(--text-3)", whiteSpace:"nowrap" }}>
                        {v.durata >= 60 ? `${Math.floor(v.durata/60)}h${v.durata%60>0?v.durata%60+"m":""}` : `${v.durata}m`}
                      </span>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="btn-sm btn-icon"
                          onClick={()=>{setInModVoce(v);setShowVoce(true);}}>✏</button>
                        <button className="btn-sm btn-icon btn-danger"
                          onClick={()=>onDelVoce(v.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>{setInModVoce(null);setShowVoce(true);}}
                style={{ width:"100%", padding:"10px", borderRadius:8,
                  border:"1.5px dashed var(--border)", background:"none", cursor:"pointer",
                  color:"var(--text-3)", fontSize:13, fontWeight:600 }}>
                + Aggiungi attività
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Tab Siti applicati ── */}
      {tab === "siti" && (
        <div>
          {siti.length === 0 ? (
            <div style={{ border:"2px dashed var(--border)", borderRadius:10,
              padding:"36px 24px", textAlign:"center", color:"var(--text-3)" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🏢</div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>Piano non ancora applicato a nessun sito</div>
              <div style={{ fontSize:12, lineHeight:1.7, marginBottom:18 }}>
                Per generare gli Ordini di Lavoro devi prima applicare<br/>
                questo piano a uno o più clienti / siti.
              </div>
              <button className="btn-primary" disabled={voci.length===0}
                onClick={()=>{setInModSito(null);setShowSito(true);}}
                title={voci.length===0?"Aggiungi prima le attività":""}>
                🏢 Applica a un sito
              </button>
              {voci.length===0 && (
                <div style={{ fontSize:11, color:"var(--amber)", marginTop:8 }}>
                  ⚠ Prima aggiungi almeno un'attività al piano
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gap:8, marginBottom:10 }}>
                {siti.map(s=>{
                  const cl  = clienti.find(c=>c.id===s.clienteId);
                  const op  = operatori.find(o=>o.id===s.operatoreId);
                  const manS = manutenzioni.filter(m=>m.pianoId===piano.id && m.clienteId===s.clienteId);
                  const prossima = manS.filter(m=>m.stato==="pianificata")
                    .sort((a,b)=>a.data.localeCompare(b.data))[0];
                  return (
                    <div key={s.id} style={{
                      background:"var(--surface)", border:"1px solid var(--border)",
                      borderRadius:"var(--radius-xl)", padding:"14px 16px",
                      opacity: s.attivo ? 1 : 0.6,
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        {/* Info sito */}
                        <div style={{ width:38, height:38, borderRadius:8, flexShrink:0,
                          background:"#F3F0FF", display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:18 }}>🏢</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:14 }}>
                            {cl?.rs || "Cliente non trovato"}
                          </div>
                          <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2, display:"flex", gap:8, flexWrap:"wrap" }}>
                            {op && <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                              <span style={{ width:7, height:7, borderRadius:"50%",
                                background:op.col, display:"inline-block" }}/>
                              {op.nome}
                            </span>}
                            {s.dataInizio && <span>📅 {fmtData(s.dataInizio)}{s.dataFine?` → ${fmtData(s.dataFine)}`:""}</span>}
                            {prossima && <span style={{color:"#059669"}}>⏭ {fmtData(prossima.data)}</span>}
                            {manS.length > 0 && <span>{manS.length} attività generate</span>}
                          </div>
                        </div>
                        {/* Azioni */}
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                          {/* Bottone Genera — solo con almeno 1 voce */}
                          <button
                            onClick={()=>setSitoGenera(s)}
                            disabled={voci.length===0 || !s.attivo}
                            style={{
                              padding:"7px 14px", borderRadius:7, fontWeight:700, fontSize:12,
                              background: voci.length>0 && s.attivo ? "#059669" : "var(--surface-3)",
                              color: voci.length>0 && s.attivo ? "white" : "var(--text-3)",
                              border:"none", cursor: voci.length>0&&s.attivo ? "pointer":"default",
                              whiteSpace:"nowrap",
                            }}>
                            ⚡ Genera OdL
                          </button>
                          <button className="btn-sm"
                            onClick={()=>onToggleSito(s.id, !s.attivo)}
                            style={{ fontSize:11 }}>
                            {s.attivo ? "⏸" : "▶"}
                          </button>
                          <button className="btn-sm btn-icon"
                            onClick={()=>{setInModSito(s);setShowSito(true);}}>✏</button>
                          <button className="btn-sm btn-icon btn-danger"
                            onClick={()=>onDelSito(s.id)}>✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>{setInModSito(null);setShowSito(true);}}
                style={{ width:"100%", padding:"10px", borderRadius:8,
                  border:"1.5px dashed var(--border)", background:"none", cursor:"pointer",
                  color:"var(--text-3)", fontSize:13, fontWeight:600 }}>
                + Applica a un altro sito
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showVoce && (
        <ModalVoce ini={inModVoce} pianoId={piano.id}
          onClose={()=>{setShowVoce(false);setInModVoce(null);}}
          onSalva={async f=>{
            if(inModVoce) await onModVoce({...inModVoce,...f,id:inModVoce.id});
            else          await onAggVoce(f);
            setShowVoce(false);setInModVoce(null);
          }} />
      )}
      {showSito && (
        <ModalApplicaSito
          pianoId={piano.id} ini={inModSito}
          clienti={clienti} operatori={operatori}
          onClose={()=>{setShowSito(false);setInModSito(null);}}
          onSalva={async f=>{
            if(inModSito) await onModSito({...inModSito,...f,id:inModSito.id});
            else          await onAggSito(f);
            setShowSito(false);setInModSito(null);
          }} />
      )}
      {sitoGenera && (
        <ModalGeneraOdL
          piano={piano} voci={voci} pianoSito={sitoGenera}
          operatori={operatori} assets={assets} clienti={clienti}
          tenantId={tenantId} uid={uid}
          onClose={()=>setSitoGenera(null)}
          onGenera={()=>setSitoGenera(null)}
        />
      )}
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────
export function GestionePiani({
  piani=[], pianoVoci=[], pianoSiti=[],
  assegnazioni=[], clienti=[], assets=[], manutenzioni=[], operatori=[],
  uid="", tenantId="",
  onAgg, onMod, onDel,
  onAggVoce, onModVoce, onDelVoce,
  onAggSito, onModSito, onDelSito, onToggleSito,
  // retrocompatibilità
  onAggAss, onModAss, onDelAss, onAttivaDisattiva, onRinnova,
}) {
  const [pianoSelId, setPianoSelId] = useState(null);
  const [showNuovo,  setShowNuovo]  = useState(false);
  const [inMod,      setInMod]      = useState(null);
  const [cerca,      setCerca]      = useState("");

  const pianoSel = piani.find(p=>p.id===pianoSelId);
  const selEff   = pianoSel || piani[0] || null;

  const pianiView = useMemo(()=>{
    let l = [...piani];
    if (cerca.trim()) l = l.filter(p=>p.nome.toLowerCase().includes(cerca.toLowerCase()));
    return l.sort((a,b)=>a.nome.localeCompare(b.nome));
  }, [piani, cerca]);

  const vociPiano = (pid) => pianoVoci.filter(v=>v.pianoId===pid);
  const sitiPiano = (pid) => pianoSiti.filter(s=>s.pianoId===pid);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:0, minHeight:500 }}>

      {/* ── Sidebar lista piani ── */}
      <div style={{ borderRight:"1px solid var(--border)", paddingRight:14,
        display:"grid", alignContent:"start", gap:6 }}>

        <input value={cerca} onChange={e=>setCerca(e.target.value)}
          placeholder="🔍 Cerca piano..."
          style={{ fontSize:12, marginBottom:4 }} />

        {pianiView.map(p=>{
          const nVoci = pianoVoci.filter(v=>v.pianoId===p.id).length;
          const nSiti = pianoSiti.filter(s=>s.pianoId===p.id).length;
          const sel   = p.id === selEff?.id;
          return (
            <div key={p.id} onClick={()=>setPianoSelId(p.id)} style={{
              padding:"11px 13px", borderRadius:8, cursor:"pointer",
              border:`1px solid ${sel?"var(--amber)":"var(--border)"}`,
              background: sel?"#FFFBEB":"var(--surface)",
              transition:"all .15s",
            }}>
              <div style={{ fontWeight:700, fontSize:13, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nome}</div>
              <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3,
                display:"flex", gap:6 }}>
                <span>{nVoci} attività</span>
                {nSiti > 0 && <span style={{color:"#7F77DD",fontWeight:600}}>· {nSiti} sito/i</span>}
              </div>
            </div>
          );
        })}

        {pianiView.length === 0 && (
          <div style={{ textAlign:"center", padding:"24px 8px", color:"var(--text-3)", fontSize:12 }}>
            {piani.length===0 ? "Nessun piano" : "Nessun risultato"}
          </div>
        )}

        <button className="btn-primary" style={{ marginTop:6 }}
          onClick={()=>{setInMod(null);setShowNuovo(true);}}>
          + Nuovo piano
        </button>
      </div>

      {/* ── Area principale ── */}
      <div style={{ paddingLeft:14 }}>
        {!selEff ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-3)" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Nessun piano</div>
            <div style={{ fontSize:13, marginBottom:20 }}>
              Crea il primo piano di manutenzione.<br/>
              Un piano contiene N attività con le loro frequenze.<br/>
              Poi applicalo ai siti per generare gli OdL.
            </div>
            <button className="btn-primary" onClick={()=>{setInMod(null);setShowNuovo(true);}}>
              + Crea il primo piano
            </button>
          </div>
        ) : (
          <PannelloPiano
            piano={selEff}
            voci={vociPiano(selEff.id)}
            siti={sitiPiano(selEff.id)}
            manutenzioni={manutenzioni}
            clienti={clienti} operatori={operatori} assets={assets}
            uid={uid} tenantId={tenantId}
            onModPiano={p=>{setInMod(p);setShowNuovo(true);}}
            onDelPiano={onDel}
            onAggVoce={onAggVoce} onModVoce={onModVoce} onDelVoce={onDelVoce}
            onAggSito={onAggSito} onModSito={onModSito}
            onDelSito={onDelSito} onToggleSito={onToggleSito}
          />
        )}
      </div>

      {showNuovo && (
        <ModalPiano ini={inMod}
          onClose={()=>{setShowNuovo(false);setInMod(null);}}
          onSalva={f=>{
            if(inMod) onMod({...inMod,...f});
            else      onAgg(f);
            setShowNuovo(false);setInMod(null);
          }} />
      )}
    </div>
  );
}

