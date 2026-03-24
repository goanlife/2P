import React, { useState, useMemo, useCallback } from "react";
import { supabase } from "../supabase";
import { Overlay, Field } from "./ui/Atoms";
import { ChecklistEditor } from "./PianoChecklist";

const FREQUENZE = [
  { v:"settimanale",  l:"Settimanale"  },
  { v:"mensile",      l:"Mensile"      },
  { v:"bimestrale",   l:"Bimestrale"   },
  { v:"trimestrale",  l:"Trimestrale"  },
  { v:"semestrale",   l:"Semestrale"   },
  { v:"annuale",      l:"Annuale"      },
];
const PRIORITA = [
  { v:"bassa",   l:"Bassa"   },
  { v:"media",   l:"Media"   },
  { v:"alta",    l:"Alta"    },
  { v:"urgente", l:"Urgente" },
];
const PRI_COL = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
const SCOPE_CFG = {
  asset:    { icon:"⚙", label:"Asset",    color:"var(--blue-bg)",   text:"var(--blue-bd)"   },
  area:     { icon:"📍", label:"Area",     color:"#ECFDF5",          text:"#059669"          },
  generale: { icon:"📋", label:"Generale", color:"var(--surface-2)", text:"var(--text-3)"    },
};
const isoDate = d => d.toISOString().split("T")[0];
const fmtData  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";

// ── Modal voce singola (asset / area / generale) ─────────────────────────
function ModalVoce({ ini, pianoId, clienteId, assets=[], operatori=[], onClose, onSalva }) {
  const vuoto = {
    scope:"asset", titolo:"", assetId:"", area_nome:"",
    operatoreId:"", frequenza:"mensile", durata:60,
    tipo:"ordinaria", priorita:"media", note:"",
  };
  const [f, sf] = useState(ini
    ? { ...vuoto, ...ini,
        assetId:    String(ini.assetId||""),
        operatoreId:String(ini.operatoreId||""),
      }
    : vuoto);
  const s = (k,v) => sf(p=>({...p,[k]:v}));

  const assetsCliente = useMemo(()=>
    clienteId ? assets.filter(a=>a.clienteId===Number(clienteId)) : assets
  , [clienteId, assets]);

  const fornitori = useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"), [operatori]);

  const saveOk = f.titolo.trim() &&
    (f.scope!=="asset" || f.assetId) &&
    (f.scope!=="area"  || f.area_nome.trim());

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(560px,96vw)", maxHeight:"90vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
      }}>
        <div style={{padding:"20px 24px 16px", borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:16}}>
            {ini ? "Modifica attività" : "Nuova attività di manutenzione"}
          </div>
        </div>

        <div style={{padding:"20px 24px", display:"grid", gap:14}}>
          {/* Scope selector */}
          <div>
            <div style={{fontSize:11, fontWeight:700, color:"var(--text-2)",
              textTransform:"uppercase", letterSpacing:".04em", marginBottom:8}}>
              Tipo di attività
            </div>
            <div style={{display:"flex", gap:8}}>
              {Object.entries(SCOPE_CFG).map(([k,cfg])=>(
                <button key={k} onClick={()=>s("scope",k)} style={{
                  flex:1, padding:"10px 8px", borderRadius:"var(--radius)",
                  border:`2px solid ${f.scope===k ? PRI_COL.alta : "var(--border)"}`,
                  background: f.scope===k ? "var(--blue-bg)" : "var(--surface)",
                  cursor:"pointer", display:"flex", flexDirection:"column",
                  alignItems:"center", gap:4,
                }}>
                  <span style={{fontSize:20}}>{cfg.icon}</span>
                  <span style={{fontSize:12, fontWeight:700, color: f.scope===k ? "var(--blue-bd)" : "var(--text-2)"}}>{cfg.label}</span>
                  <span style={{fontSize:10, color:"var(--text-3)"}}>
                    {k==="asset"?"macchina specifica":k==="area"?"zona/luogo":"nessun vincolo fisico"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Titolo */}
          <Field label="Nome attività *">
            <input value={f.titolo} onChange={e=>s("titolo",e.target.value)}
              style={{width:"100%"}}
              placeholder={
                f.scope==="asset"    ? "Es. Cambio filtri pompa, Revisione HVAC..." :
                f.scope==="area"     ? "Es. Taglio erba, Pulizia locale tecnico..." :
                                       "Es. Verifica estintori, Formazione sicurezza..."
              } />
          </Field>

          {/* Asset (solo se scope=asset) */}
          {f.scope==="asset" && (
            <Field label="Asset *">
              <select value={f.assetId} onChange={e=>s("assetId",e.target.value)} style={{width:"100%"}}>
                <option value="">— Seleziona asset —</option>
                {assetsCliente.map(a=>(
                  <option key={a.id} value={String(a.id)}>
                    {a.nome}{a.tipo?` (${a.tipo})`:""}{a.matricola?` · ${a.matricola}`:""}
                  </option>
                ))}
              </select>
              {assetsCliente.length===0 && (
                <div style={{fontSize:11, color:"var(--amber)", marginTop:4}}>
                  ⚠ Nessun asset per questo cliente. Aggiungili dalla sezione Asset.
                </div>
              )}
            </Field>
          )}

          {/* Area (solo se scope=area) */}
          {f.scope==="area" && (
            <Field label="Nome area / zona *">
              <input value={f.area_nome} onChange={e=>s("area_nome",e.target.value)}
                style={{width:"100%"}} placeholder="Es. Giardino Nord, Parcheggio Est, Piano 2..." />
            </Field>
          )}

          {/* Operatore */}
          <Field label="Operatore / fornitore">
            <select value={f.operatoreId} onChange={e=>s("operatoreId",e.target.value)} style={{width:"100%"}}>
              <option value="">— Non assegnato —</option>
              {fornitori.map(o=>(
                <option key={o.id} value={String(o.id)}>{o.nome}{o.spec?` · ${o.spec}`:""}</option>
              ))}
            </select>
          </Field>

          {/* Frequenza + Durata */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Frequenza">
              <select value={f.frequenza} onChange={e=>s("frequenza",e.target.value)} style={{width:"100%"}}>
                {FREQUENZE.map(fr=><option key={fr.v} value={fr.v}>{fr.l}</option>)}
              </select>
            </Field>
            <Field label="Durata (min)">
              <input type="number" min={15} step={15} value={f.durata}
                onChange={e=>s("durata",Number(e.target.value))} style={{width:"100%"}} />
            </Field>
          </div>

          {/* Tipo + Priorità */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Tipo">
              <select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}>
                <option value="ordinaria">Ordinaria</option>
                <option value="straordinaria">Straordinaria</option>
              </select>
            </Field>
            <Field label="Priorità">
              <select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}>
                {PRIORITA.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>
          </div>

          {/* Note */}
          <Field label="Note / istruzioni specifiche">
            <textarea value={f.note} onChange={e=>s("note",e.target.value)}
              rows={2} style={{width:"100%", resize:"vertical"}}
              placeholder="Istruzioni, riferimenti tecnici, attenzioni particolari..." />
          </Field>
        </div>

        <div style={{padding:"0 24px 20px", display:"flex", justifyContent:"space-between",
          borderTop:"1px solid var(--border)", paddingTop:16, gap:10}}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={()=>onSalva({
            ...f,
            assetId:     f.scope==="asset" && f.assetId ? Number(f.assetId) : null,
            operatoreId: f.operatoreId ? Number(f.operatoreId) : null,
            pianoId,
          })} disabled={!saveOk} className="btn-primary">
            {ini ? "Aggiorna" : "✅ Aggiungi al piano"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Modal crea/modifica piano (contenitore) ───────────────────────────────
function ModalPianoContenitore({ ini, clienti=[], onClose, onSalva }) {
  const oggi = isoDate(new Date());
  const vuoto = {
    nome:"", descrizione:"", clienteId:"",
    dataInizio:oggi, dataFine:"", attivo:true,
  };
  const [f, sf] = useState(ini
    ? { ...vuoto, ...ini, clienteId:String(ini.clienteId||"") }
    : vuoto);
  const s = (k,v) => sf(p=>({...p,[k]:v}));

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(500px,96vw)", maxHeight:"90vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
      }}>
        <div style={{padding:"20px 24px 16px", borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:16}}>
            {ini ? "Modifica piano" : "Nuovo piano di manutenzione"}
          </div>
          <div style={{fontSize:12, color:"var(--text-3)", marginTop:4}}>
            Il piano è un contenitore per tutte le attività ricorrenti di un cliente/sito.
          </div>
        </div>

        <div style={{padding:"20px 24px", display:"grid", gap:14}}>
          <Field label="Nome piano *">
            <input value={f.nome} onChange={e=>s("nome",e.target.value)}
              style={{width:"100%"}} placeholder="Es. Contratto manutenzione 2025, Piano annuale Rossi..." />
          </Field>

          <Field label="Cliente / sito">
            <select value={f.clienteId} onChange={e=>s("clienteId",e.target.value)} style={{width:"100%"}}>
              <option value="">— Nessun cliente —</option>
              {clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
            </select>
          </Field>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Data inizio">
              <input type="date" value={f.dataInizio}
                onChange={e=>s("dataInizio",e.target.value)} style={{width:"100%"}} />
            </Field>
            <Field label="Data fine (opzionale)">
              <input type="date" value={f.dataFine}
                onChange={e=>s("dataFine",e.target.value)} style={{width:"100%"}} />
            </Field>
          </div>

          <Field label="Note">
            <textarea value={f.descrizione||""} onChange={e=>s("descrizione",e.target.value)}
              rows={2} style={{width:"100%", resize:"vertical"}}
              placeholder="Es. Contratto annuale, include verde e impianti..." />
          </Field>
        </div>

        <div style={{padding:"0 24px 20px", display:"flex", justifyContent:"space-between",
          borderTop:"1px solid var(--border)", paddingTop:16, gap:10}}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={()=>onSalva({
            ...f,
            clienteId: f.clienteId ? Number(f.clienteId) : null,
          })} disabled={!f.nome.trim()} className="btn-primary">
            {ini ? "Aggiorna piano" : "✅ Crea piano"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Riga voce nel piano ───────────────────────────────────────────────────
function RigaVoce({ ass, assets=[], operatori=[], onMod, onDel, onToggle }) {
  const asset = assets.find(a=>a.id===ass.assetId);
  const op    = operatori.find(o=>o.id===ass.operatoreId);
  const scope = SCOPE_CFG[ass.scope||"asset"];
  const freq  = FREQUENZE.find(f=>f.v===ass.frequenza);

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"10px 14px",
      background: ass.attivo ? "var(--surface-2)" : "var(--surface-3)",
      borderRadius:"var(--radius)", border:"1px solid var(--border)",
      marginBottom:6, opacity: ass.attivo ? 1 : 0.55,
    }}>
      {/* Scope icon */}
      <div style={{
        width:34, height:34, borderRadius:"var(--radius-sm)",
        background:scope.color, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:16, flexShrink:0,
      }}>{scope.icon}</div>

      {/* Info */}
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:700, fontSize:13, color:"var(--text-1)"}}>
          {ass.titolo || "(senza nome)"}
        </div>
        <div style={{fontSize:11, color:"var(--text-3)", marginTop:2, display:"flex", gap:8, flexWrap:"wrap"}}>
          <span style={{
            background:scope.color, color:scope.text,
            padding:"1px 6px", borderRadius:99, fontWeight:700, fontSize:10,
          }}>{scope.label}</span>
          {ass.scope==="asset"    && asset && <span>⚙ {asset.nome}</span>}
          {ass.scope==="area"     && ass.area_nome && <span>📍 {ass.area_nome}</span>}
          {op && <span style={{display:"flex", alignItems:"center", gap:4}}>
            <span style={{width:7, height:7, borderRadius:"50%", background:op.col, display:"inline-block"}}/>
            {op.nome}
          </span>}
        </div>
      </div>

      {/* Frequenza + durata pill */}
      <div style={{display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end"}}>
        <span style={{
          fontSize:11, padding:"2px 8px", borderRadius:99,
          background:"var(--surface)", border:"1px solid var(--border)",
          color:"var(--text-2)", fontWeight:600, whiteSpace:"nowrap",
        }}>{freq?.l||ass.frequenza}</span>
        <span style={{
          fontSize:11, padding:"2px 8px", borderRadius:99,
          background:"var(--surface)", border:"1px solid var(--border)",
          color:"var(--text-3)", whiteSpace:"nowrap",
        }}>{ass.durata>=60 ? `${ass.durata/60}h` : `${ass.durata}min`}</span>
        <span style={{
          fontSize:10, padding:"2px 6px", borderRadius:99, fontWeight:700,
          background: ass.priorita==="urgente"?"#FEF2F2":ass.priorita==="alta"?"#EFF6FF":ass.priorita==="media"?"#FEF3C7":"#F1F5F9",
          color: PRI_COL[ass.priorita]||"#94A3B8",
        }}>{ass.priorita}</span>
      </div>

      {/* Azioni */}
      <div style={{display:"flex", gap:4, flexShrink:0}}>
        <button className="btn-sm btn-icon" onClick={()=>onMod(ass)}>✏</button>
        <button className="btn-sm btn-icon" onClick={()=>onToggle(ass.id,!ass.attivo)}
          title={ass.attivo?"Sospendi":"Riattiva"}>
          {ass.attivo ? "⏸" : "▶"}
        </button>
        <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(ass.id)}>✕</button>
      </div>
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────────────────
export function GestionePiani({
  piani=[], assegnazioni=[], clienti=[], assets=[], manutenzioni=[],
  operatori=[], onAgg, onMod, onDel,
  onAggAss, onModAss, onDelAss, onAttivaDisattiva, onRinnova,
}) {
  const [pianoSelId, setPianoSelId] = useState(null);
  const [showModalPiano, setShowModalPiano] = useState(false);
  const [pianoInMod, setPianoInMod]         = useState(null);
  const [showModalVoce, setShowModalVoce]   = useState(false);
  const [voceInMod, setVoceInMod]           = useState(null);
  const [filtroCl, setFiltroCl]             = useState("tutti");
  const [generando, setGenerando]           = useState(false);

  const pianoSel = piani.find(p=>p.id===pianoSelId);

  // Voci del piano selezionato
  const voci = useMemo(()=>
    assegnazioni.filter(a=>a.pianoId===pianoSelId)
  , [assegnazioni, pianoSelId]);

  // Piani filtrati per cliente
  const pianiView = useMemo(()=>{
    if (filtroCl==="tutti") return piani;
    return piani.filter(p=>String(p.clienteId)===filtroCl);
  }, [piani, filtroCl]);

  // Seleziona automaticamente il primo piano se non c'è selezione
  const pianoSelEff = pianoSelId && piani.find(p=>p.id===pianoSelId)
    ? pianoSelId
    : pianiView[0]?.id || null;

  const pianoSelEff2 = piani.find(p=>p.id===pianoSelEff);
  const vociEff = assegnazioni.filter(a=>a.pianoId===pianoSelEff);

  const clientiDistinct = useMemo(()=>{
    const ids = [...new Set(piani.map(p=>p.clienteId).filter(Boolean))];
    return ids.map(id=>clienti.find(c=>c.id===id)).filter(Boolean);
  }, [piani, clienti]);

  // Genera tutte le occorrenze di tutte le voci attive del piano
  const generaCalendario = async () => {
    if (!pianoSelEff2) return;
    const vociAttive = vociEff.filter(v=>v.attivo);
    if (!vociAttive.length) { alert("Nessuna attività attiva nel piano."); return; }
    setGenerando(true);
    let tot = 0;
    for (const v of vociAttive) {
      await onAggAss(v, pianoSelEff2);
      tot++;
    }
    setGenerando(false);
    alert(`Calendario generato — ${tot} voci elaborate!`);
  };

  // Stats piano selezionato
  const manPiano = manutenzioni.filter(m=>m.pianoId===pianoSelEff);
  const prossima = manPiano.filter(m=>m.stato==="pianificata").sort((a,b)=>a.data.localeCompare(b.data))[0];

  const apreModPiano = (p) => { setPianoInMod(p); setShowModalPiano(true); };

  return (
    <div style={{display:"grid", gridTemplateColumns:"260px 1fr", gap:16, minHeight:500}}>

      {/* ── SIDEBAR sinistra: lista piani ── */}
      <div style={{display:"flex", flexDirection:"column", gap:8}}>
        {/* Filtro per cliente */}
        {clientiDistinct.length > 1 && (
          <select value={filtroCl} onChange={e=>setFiltroCl(e.target.value)}
            style={{fontSize:12, marginBottom:4}}>
            <option value="tutti">Tutti i clienti</option>
            {clientiDistinct.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
          </select>
        )}

        {/* Lista piani */}
        <div style={{flex:1, display:"flex", flexDirection:"column", gap:4}}>
          {pianiView.map(p=>{
            const cl = clienti.find(c=>c.id===p.clienteId);
            const nVoci = assegnazioni.filter(a=>a.pianoId===p.id).length;
            const sel = p.id === pianoSelEff;
            return (
              <div key={p.id}
                onClick={()=>setPianoSelId(p.id)}
                style={{
                  padding:"10px 14px",
                  borderRadius:"var(--radius)",
                  border:`1px solid ${sel?"var(--amber)":"var(--border)"}`,
                  background: sel ? "#FFFBEB" : "var(--surface)",
                  cursor:"pointer",
                  transition:"all .15s",
                }}>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:700, fontSize:13, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.nome}</div>
                    {cl && <div style={{fontSize:11, color:"#7F77DD", fontWeight:600, marginTop:2}}>
                      🏢 {cl.rs}
                    </div>}
                    <div style={{fontSize:11, color:"var(--text-3)", marginTop:1}}>
                      {nVoci} attivit{nVoci===1?"à":"à"}
                      {p.dataInizio && ` · dal ${fmtData(p.dataInizio)}`}
                    </div>
                  </div>
                  <div style={{display:"flex", gap:3}} onClick={e=>e.stopPropagation()}>
                    <button className="btn-sm btn-icon" onClick={()=>apreModPiano(p)}
                      style={{fontSize:11}}>✏</button>
                    <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(p.id)}
                      style={{fontSize:11}}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}

          {pianiView.length===0 && (
            <div style={{textAlign:"center", padding:"32px 12px", color:"var(--text-3)", fontSize:13}}>
              <div style={{fontSize:32, marginBottom:10}}>📋</div>
              <div style={{fontWeight:700, marginBottom:6}}>Nessun piano</div>
              <div style={{fontSize:12}}>Crea il primo piano per iniziare</div>
            </div>
          )}
        </div>

        <button className="btn-primary" style={{width:"100%", marginTop:4}}
          onClick={()=>{setPianoInMod(null);setShowModalPiano(true);}}>
          + Nuovo piano
        </button>
      </div>

      {/* ── MAIN destra: voci del piano selezionato ── */}
      <div>
        {!pianoSelEff2 ? (
          <div style={{textAlign:"center", padding:"60px 20px", color:"var(--text-3)"}}>
            <div style={{fontSize:40, marginBottom:12}}>📋</div>
            <div style={{fontWeight:700, fontSize:15, marginBottom:6}}>Nessun piano selezionato</div>
            <div style={{fontSize:13}}>Seleziona un piano dalla lista, oppure creane uno nuovo.</div>
          </div>
        ) : (
          <>
            {/* Header piano selezionato */}
            <div style={{
              display:"flex", alignItems:"flex-start", justifyContent:"space-between",
              gap:12, marginBottom:16, padding:"14px 18px",
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"var(--radius-xl)",
            }}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700, fontSize:16}}>{pianoSelEff2.nome}</div>
                <div style={{fontSize:12, color:"var(--text-3)", marginTop:4, display:"flex", gap:10, flexWrap:"wrap"}}>
                  {clienti.find(c=>c.id===pianoSelEff2.clienteId) && (
                    <span style={{color:"#7F77DD", fontWeight:600}}>
                      🏢 {clienti.find(c=>c.id===pianoSelEff2.clienteId)?.rs}
                    </span>
                  )}
                  {pianoSelEff2.dataInizio && <span>📅 Dal {fmtData(pianoSelEff2.dataInizio)}{pianoSelEff2.dataFine?` al ${fmtData(pianoSelEff2.dataFine)}`:""}</span>}
                  <span>{vociEff.length} attivit{vociEff.length===1?"à":"à"}</span>
                  {prossima && <span>· Prossima: {fmtData(prossima.data)}</span>}
                </div>
                {pianoSelEff2.descrizione && (
                  <div style={{fontSize:12, color:"var(--text-2)", marginTop:6, fontStyle:"italic"}}>
                    {pianoSelEff2.descrizione}
                  </div>
                )}
              </div>
              <div style={{display:"flex", gap:8, flexShrink:0}}>
                <button className="btn-sm" onClick={()=>apreModPiano(pianoSelEff2)}>✏ Modifica</button>
                <button
                  onClick={generaCalendario}
                  disabled={generando || vociEff.filter(v=>v.attivo).length===0}
                  style={{
                    padding:"7px 14px", borderRadius:"var(--radius-sm)",
                    background:"#059669", color:"white", border:"none",
                    fontWeight:700, fontSize:13, cursor:"pointer",
                    opacity: generando || vociEff.filter(v=>v.attivo).length===0 ? 0.5 : 1,
                  }}>
                  {generando ? "⏳ Generazione..." : "⚡ Genera calendario"}
                </button>
              </div>
            </div>

            {/* Lista voci */}
            {vociEff.length===0 ? (
              <div style={{
                border:"2px dashed var(--border)", borderRadius:"var(--radius-xl)",
                padding:"40px 24px", textAlign:"center", color:"var(--text-3)",
              }}>
                <div style={{fontSize:36, marginBottom:12}}>📋</div>
                <div style={{fontWeight:700, fontSize:14, marginBottom:6}}>Nessuna attività nel piano</div>
                <div style={{fontSize:13, marginBottom:20, lineHeight:1.6}}>
                  Aggiungi le attività di manutenzione ricorrenti per questo cliente.<br/>
                  Puoi mescolare attività su asset specifici, aree/zone e attività generali.
                </div>
                <button className="btn-primary"
                  onClick={()=>{setVoceInMod(null);setShowModalVoce(true);}}>
                  + Aggiungi prima attività
                </button>
              </div>
            ) : (
              <>
                {vociEff.map(ass=>(
                  <RigaVoce key={ass.id} ass={ass} assets={assets} operatori={operatori}
                    onMod={v=>{setVoceInMod(v);setShowModalVoce(true);}}
                    onDel={id=>onDelAss(id)}
                    onToggle={onAttivaDisattiva}
                  />
                ))}
              </>
            )}

            {/* Bottone aggiungi voce */}
            <button
              onClick={()=>{setVoceInMod(null);setShowModalVoce(true);}}
              style={{
                width:"100%", marginTop:8,
                border:"1.5px dashed var(--border)", borderRadius:"var(--radius)",
                padding:"11px", background:"none", cursor:"pointer",
                color:"var(--text-3)", fontSize:13, fontWeight:600,
                transition:"background .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
            >
              + Aggiungi attività di manutenzione
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      {showModalPiano && (
        <ModalPianoContenitore
          ini={pianoInMod}
          clienti={clienti}
          onClose={()=>{setShowModalPiano(false);setPianoInMod(null);}}
          onSalva={f=>{
            if(pianoInMod) onMod({...pianoInMod,...f});
            else onAgg(f);
            setShowModalPiano(false);setPianoInMod(null);
          }}
        />
      )}

      {showModalVoce && pianoSelEff2 && (
        <ModalVoce
          ini={voceInMod}
          pianoId={pianoSelEff2.id}
          clienteId={pianoSelEff2.clienteId}
          assets={assets}
          operatori={operatori}
          onClose={()=>{setShowModalVoce(false);setVoceInMod(null);}}
          onSalva={f=>{
            if(voceInMod) onModAss({...voceInMod,...f, id:voceInMod.id});
            else onAggAss({...f, dataInizio:pianoSelEff2.dataInizio||isoDate(new Date()), dataFine:pianoSelEff2.dataFine||null, clienteId:pianoSelEff2.clienteId});
            setShowModalVoce(false);setVoceInMod(null);
          }}
        />
      )}
    </div>
  );
}

// Mantieni ModalPiano e ModalAssegnazione per retrocompatibilità con ApplicaTemplate
export function ModalPiano({ini, onClose, onSalva, userId}) {
  const vuoto = { nome:"", descrizione:"", tipo:"ordinaria", frequenza:"mensile", durata:60, priorita:"media", attivo:true };
  const [f, sf] = useState(ini || vuoto);
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"var(--surface)",borderRadius:"var(--radius-xl)",width:"min(480px,96vw)",maxHeight:"90vh",overflow:"auto",padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>{ini?"Modifica piano":"Nuovo piano"}</div>
        <Field label="Nome *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%"}}/></Field>
        <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={()=>onSalva(f)} disabled={!f.nome.trim()} className="btn-primary">Salva</button>
        </div>
      </div>
    </div>
  );
}
