import React, { useState, useMemo } from "react";
import { supabase } from "../supabase";
import { Overlay, Modal, Field } from "./ui/Atoms";
import { ChecklistEditor } from "./PianoChecklist";
import { PannelloAllegati } from "./AllegatiTemi";

const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7   },
  { v:"mensile",     l:"Mensile",     giorni:30  },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60  },
  { v:"trimestrale", l:"Trimestrale", giorni:90  },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];

function generaOccorrenze(piano, dataInizio, mesi=12) {
  if (!dataInizio) return [];
  const freq = FREQUENZE.find(f=>f.v===piano.frequenza); if (!freq) return [];
  const addMonths = (d,n) => { const dt=new Date(d+"T00:00:00"); dt.setMonth(dt.getMonth()+n); return dt.toISOString().split("T")[0]; };
  const addDays = (d,n) => { const dt=new Date(d+"T00:00:00"); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; };
  const fine = (piano.dataFine&&piano.dataFine>dataInizio) ? piano.dataFine : addMonths(dataInizio, mesi);
  const occ=[]; let cur=dataInizio;
  while (cur<=fine && occ.length<200) {
    occ.push(cur);
    const mult={mensile:1,bimestrale:2,trimestrale:3,semestrale:6,annuale:12}[piano.frequenza];
    cur = mult ? addMonths(cur,mult) : addDays(cur,freq.giorni);
  }
  return occ;
}
function conflitti(man, opId, data, escludiId=null) {
  return (man||[]).filter(m=>m.operatoreId===Number(opId)&&m.data===data&&m.stato!=="completata"&&m.id!==escludiId);
}
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const isoDate = d => d.toISOString().split("T")[0];

function ConflictiBanner({ conf }) {
  if (!conf?.length) return null;
  return (
    <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:13,color:"#92400E"}}>
      <strong>⚠ Attenzione:</strong> {conf.length} attività già pianificata/e in questa data:
      <ul style={{margin:"6px 0 0",paddingLeft:18}}>{conf.map(m=><li key={m.id}>{m.titolo} ({m.durata} min)</li>)}</ul>
    </div>
  );
}

// ─── Piani ────────────────────────────────────────────────────────────────

// Modal Piano Template (solo nome/frequenza/tipo - senza asset/cliente/operatore)
export function ModalPiano({ ini, onClose, onSalva, userId }) {
  const vuoto = { nome:"", descrizione:"", tipo:"ordinaria", frequenza:"mensile", durata:60, priorita:"media", attivo:true };
  const [f, sf] = useState(ini || vuoto);
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  return (
    <Modal title={ini?"Modifica piano":"Nuovo piano template"} onClose={onClose}
      onSave={()=>onSalva(f)} saveOk={!!f.nome.trim()} saveColor="#059669"
      saveLabel={ini?"Aggiorna":"Crea template"}>
      <Field label="Nome piano *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%"}} placeholder="Es. Revisione mensile compressori" /></Field>
      <Field label="Descrizione"><textarea value={f.descrizione} onChange={e=>s("descrizione",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select></Field>
        <Field label="Priorità"><select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}><option value="bassa">Bassa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Frequenza"><select value={f.frequenza} onChange={e=>s("frequenza",e.target.value)} style={{width:"100%"}}>{FREQUENZE.map(fr=><option key={fr.v} value={fr.v}>{fr.l}</option>)}</select></Field>
        <Field label="Durata (min)"><input type="number" value={f.durata} onChange={e=>s("durata",Number(e.target.value))} min={15} step={15} style={{width:"100%"}} /></Field>
      </div>
      <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:12,color:"var(--text-2)"}}>
        ℹ Dopo aver creato il template, aggiungi le <strong>assegnazioni</strong> per collegarlo agli asset e generare le attività.
      </div>
      {ini?.id && <ChecklistEditor pianoId={ini.id} />}
      {ini?.id && <PannelloAllegati entitaTipo="piano" entitaId={ini.id} userId={userId||""} />}
    </Modal>
  );
}

// Modal Assegnazione (piano → asset + operatore + date)
export function ModalAssegnazione({ ini, piano, clienti, assets, operatori, manutenzioni, onClose, onSalva }) {
  const fornitori = useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"),[operatori]);
  const defOp = fornitori[0]?.id ? String(fornitori[0].id) : "";
  const vuoto = { pianoId:piano?.id||"", assetId:"", clienteId:"", operatoreId:defOp, dataInizio:isoDate(new Date()), dataFine:"", attivo:true };
  const [f, sf] = useState(ini ? {...ini, operatoreId:String(ini.operatoreId||defOp), assetId:String(ini.assetId||""), clienteId:String(ini.clienteId||"")} : vuoto);
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  const assetsCliente = useMemo(()=>f.clienteId?assets.filter(a=>String(a.clienteId)===f.clienteId):assets,[f.clienteId,assets]);
  const preview = useMemo(()=>{if(!piano||!f.dataInizio)return[];return generaOccorrenze(piano,f.dataInizio,3).slice(0,6);},[piano,f.dataInizio]);
  const conf = useMemo(()=>f.operatoreId&&f.dataInizio?conflitti(manutenzioni,Number(f.operatoreId),f.dataInizio):[],[f.operatoreId,f.dataInizio,manutenzioni]);
  return (
    <Modal title={ini?"Modifica assegnazione":"Nuova assegnazione"} onClose={onClose}
      onSave={()=>onSalva({...f,pianoId:Number(piano?.id||f.pianoId),operatoreId:f.operatoreId?Number(f.operatoreId):null,clienteId:f.clienteId?Number(f.clienteId):null,assetId:f.assetId?Number(f.assetId):null})}
      saveOk={!!f.dataInizio} saveColor="#059669"
      saveLabel={ini?"Aggiorna":"Assegna e genera attività"}>
      {piano && (
        <div style={{background:"var(--surface-2)",border:"1px solid var(--amber)",borderRadius:"var(--radius-sm)",padding:"10px 14px",marginBottom:4}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--amber)",marginBottom:2}}>Piano template</div>
          <div style={{fontSize:13,fontWeight:600}}>{piano.nome}</div>
          <div style={{fontSize:11,color:"var(--text-3)",marginTop:2}}>{FREQUENZE.find(f=>f.v===piano.frequenza)?.l} · {piano.durata} min · {piano.tipo}</div>
        </div>
      )}
      <Field label="Cliente">
        <select value={f.clienteId} onChange={e=>{s("clienteId",e.target.value);s("assetId","");}} style={{width:"100%"}}>
          <option value="">— Nessun cliente —</option>
          {clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
        </select>
      </Field>
      <Field label="Asset *">
        <select value={f.assetId} onChange={e=>s("assetId",e.target.value)} style={{width:"100%"}}>
          <option value="">— Seleziona asset —</option>
          {assetsCliente.map(a=><option key={a.id} value={String(a.id)}>{a.nome} {a.tipo?`(${a.tipo})`:""}</option>)}
        </select>
      </Field>
      <Field label="Operatore di default">
        <select value={f.operatoreId} onChange={e=>s("operatoreId",e.target.value)} style={{width:"100%"}}>
          <option value="">— Nessun operatore —</option>
          {fornitori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}{o.spec?` — ${o.spec}`:""}</option>)}
        </select>
        <div style={{fontSize:11,color:"var(--text-3)",marginTop:3}}>Può essere cambiato su ogni singola attività</div>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Data inizio *"><input type="date" value={f.dataInizio} onChange={e=>s("dataInizio",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Data fine (opzionale)"><input type="date" value={f.dataFine} onChange={e=>s("dataFine",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      {conf.length>0 && <ConflictiBanner conf={conf} />}
      {preview.length>0 && (
        <div className="preview-dates">
          <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Prime {preview.length} occorrenze:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {preview.map((data,i)=><span key={i} className="preview-tag ok">{fmtData(data)}</span>)}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function GestionePiani({ piani, assegnazioni=[], clienti, assets, manutenzioni, operatori, onAgg, onMod, onDel, onAggAss, onModAss, onDelAss, onAttivaDisattiva }) {
  const [showM, ssM] = useState(false);
  const [inMod, siM] = useState(null);
  const [showAss, setShowAss] = useState(false);
  const [inModAss, siMA] = useState(null);
  const [pianoDiAss, setPianoDiAss] = useState(null); // piano a cui stiamo aggiungendo assegnazione
  const [expanded, setExpanded] = useState({}); // { pianoId: true/false }

  const apriNuovaAss = (piano) => { setPianoDiAss(piano); siMA(null); setShowAss(true); };

  return (
    <div style={{display:"grid",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,color:"var(--text-3)"}}>I piani sono template riusabili. Ogni assegnazione collega un piano a un asset specifico.</div>
        <button className="btn-green-outline" style={{fontWeight:600,flexShrink:0}} onClick={()=>{siM(null);ssM(true);}}>+ Nuovo piano</button>
      </div>

      {!piani.length && <div className="empty"><div className="empty-icon">🔄</div><div className="empty-text">Nessun piano. Crea il primo template per iniziare.</div></div>}

      {piani.map(p => {
        const assP = assegnazioni.filter(a => a.pianoId === p.id);
        const freq = FREQUENZE.find(f=>f.v===p.frequenza);
        const isOpen = expanded[p.id];
        return (
          <div key={p.id} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-xl)",overflow:"hidden"}}>
            {/* Header piano */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:assP.length&&isOpen?"1px solid var(--border)":"none",cursor:"pointer"}}
              onClick={()=>setExpanded(e=>({...e,[p.id]:!e[p.id]}))}>
              <div style={{width:38,height:38,borderRadius:"var(--radius)",background:"#ECFDF5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🔄</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14}}>{p.nome}</div>
                <div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>{freq?.l} · {p.durata} min · {p.tipo} · {assP.length} assegnazione{assP.length!==1?"i":""}</div>
              </div>
              {p.descrizione && <div style={{fontSize:12,color:"var(--text-2)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.descrizione}</div>}
              <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                <button className="btn-sm" style={{background:"#ECFDF5",color:"#059669",borderColor:"#A7F3D0",fontWeight:600}} onClick={()=>apriNuovaAss(p)}>+ Assegna</button>
                <button className="btn-sm btn-icon" onClick={()=>{siM(p);ssM(true);}}>✏</button>
                <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(p.id)}>✕</button>
              </div>
              <span style={{fontSize:12,color:"var(--text-3)",marginLeft:4}}>{isOpen?"▲":"▼"}</span>
            </div>

            {/* Assegnazioni */}
            {isOpen && (
              <div style={{padding:"8px 18px 14px"}}>
                {assP.length === 0 && (
                  <div style={{textAlign:"center",padding:"16px 0",color:"var(--text-3)",fontSize:13}}>
                    Nessuna assegnazione. <button className="btn-sm" style={{marginLeft:8}} onClick={()=>apriNuovaAss(p)}>+ Aggiungi</button>
                  </div>
                )}
                {assP.map(a => {
                  const cl = clienti.find(c=>c.id===a.clienteId);
                  const as = assets.find(x=>x.id===a.assetId);
                  const op = operatori.find(o=>o.id===a.operatoreId);
                  const manA = manutenzioni.filter(m=>m.assegnazioneId===a.id||m.pianoId===p.id&&m.assetId===a.assetId);
                  const prossima = manA.filter(m=>m.stato==="pianificata").sort((x,y)=>x.data.localeCompare(y.data))[0];
                  return (
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface-2)",borderRadius:"var(--radius-sm)",border:`1px solid ${a.attivo?"var(--border)":"var(--border-dim)"}`,marginBottom:6,opacity:a.attivo?1:0.6}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                          {cl && <span style={{fontSize:13,fontWeight:600,color:"#7F77DD"}}>🏢 {cl.rs}</span>}
                          {as && <span style={{fontSize:13,color:"var(--text-2)"}}>⚙ {as.nome}</span>}
                          {op && <span style={{fontSize:12,color:"var(--text-3)",display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:op.col,display:"inline-block"}}/>{op.nome}</span>}
                        </div>
                        <div style={{fontSize:11,color:"var(--text-3)",marginTop:3}}>
                          Dal {fmtData(a.dataInizio)}{a.dataFine?` al ${fmtData(a.dataFine)}`:""} · {manA.length} attività
                          {prossima && <span> · Prossima: {fmtData(prossima.data)}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        <button className={"btn-sm"+(a.attivo?"":" btn-green-outline")} onClick={()=>onAttivaDisattiva(a.id,!a.attivo)}>{a.attivo?"Sospendi":"▶ Riattiva"}</button>
                        <button className="btn-sm btn-icon" onClick={()=>{siMA(a);setPianoDiAss(p);setShowAss(true);}}>✏</button>
                        <button className="btn-sm btn-icon btn-danger" onClick={()=>onDelAss(a.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {showM && <ModalPiano key={inMod?.id??'new'} ini={inMod} userId={inMod?.userId||""} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...f,id:inMod.id}):onAgg(f)} />}
      {showAss && <ModalAssegnazione key={inModAss?.id??'new-ass'} ini={inModAss} piano={pianoDiAss} clienti={clienti} assets={assets} operatori={operatori} manutenzioni={manutenzioni} onClose={()=>{setShowAss(false);siMA(null);}} onSalva={f=>inModAss?onModAss({...f,id:inModAss.id}):onAggAss(f)} />}
    </div>
  );
}

