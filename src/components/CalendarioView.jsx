import React, { useState, useMemo } from "react";
import { supabase } from "../supabase";
import { ChecklistIntervento } from "./PianoChecklist";
import { Overlay, Modal, Field, AvvisoConflitto } from "./ui/Atoms";

function conflitti(manutenzioni, operatoreId, data, escludiId=null) {
  return (manutenzioni||[]).filter(m=>m.operatoreId===Number(operatoreId)&&m.data===data&&m.stato!=="completata"&&m.id!==escludiId);
}

const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const GIORNI = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];


// ─── Calendario ───────────────────────────────────────────────────────────
export function ModalRipianifica({ manut, nuovaData, man, operatori, onConferma, onClose }) {
  const fornitori=useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"),[operatori]);
  const [data,sd]=useState(nuovaData);const [opId,sOp]=useState(manut.operatoreId||"");
  const conf=useMemo(()=>opId?conflitti(man,opId,data,manut.id):[],[man,opId,data]);
  return (
    <Overlay zIndex={2000}>
      <div className="modal-box" style={{width:"min(440px,96vw)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span className="modal-title">Ripianifica</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{fontSize:13,color:"var(--text-2)",marginBottom:16,padding:"10px 12px",background:"var(--surface-2)",borderRadius:"var(--radius-sm)",fontWeight:500}}>📌 {manut.titolo}</div>
        <div style={{display:"grid",gap:14}}>
          <Field label="Nuova data"><input type="date" value={data} onChange={e=>sd(e.target.value)} style={{width:"100%"}} /></Field>
          <Field label="Fornitore"><select value={opId} onChange={e=>sOp(Number(e.target.value))} style={{width:"100%"}}><option value="">— Nessun fornitore —</option>{fornitori.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></Field>
          <AvvisoConflitto conflitti={conf} />
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Annulla</button>
          <button className="btn-primary" onClick={()=>{onConferma(manut.id,data,opId);onClose();}}>Conferma</button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Popup dettaglio giorno ───────────────────────────────────────────────
export function PopupGiorno({ data, attivita, clienti, assets, operatori, onClose, onStato, onMod, onChiudi, onRipianifica }) {
  const STATO_COL = { pianificata:"#3B82F6", inCorso:"#F59E0B", completata:"#059669", scaduta:"#EF4444" };
  const STATO_BG  = { pianificata:"#EFF6FF", inCorso:"#FFFBEB", completata:"#ECFDF5", scaduta:"#FEF2F2" };
  const STATO_LBL = { pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };
  const totOre = Math.round(attivita.reduce((s,m)=>s+m.durata,0)/60*10)/10;
  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:"min(420px,100vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",boxShadow:"-4px 0 24px rgba(0,0,0,.15)",zIndex:500,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16}}>
            {new Date(data+"T12:00:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}
          </div>
          <div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>{attivita.length} attività · {totOre}h totali</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"var(--text-3)",padding:"4px 8px"}}>✕</button>
      </div>
      {/* Lista attività */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {attivita.length===0 && (
          <div style={{textAlign:"center",padding:"40px 0",color:"var(--text-3)"}}>
            <div style={{fontSize:28,marginBottom:8}}>📋</div>
            <div style={{fontSize:13}}>Nessuna attività questo giorno</div>
          </div>
        )}
        {attivita.map(m => {
          const cl  = clienti.find(c=>c.id===m.clienteId);
          const as  = assets.find(a=>a.id===m.assetId);
          const op  = operatori.find(o=>o.id===m.operatoreId);
          const col = STATO_COL[m.stato]||"#888";
          const bg  = STATO_BG[m.stato]||"var(--surface-2)";
          return (
            <div key={m.id} style={{background:bg,border:`1px solid ${col}30`,borderLeft:`3px solid ${col}`,borderRadius:"var(--radius-sm)",padding:"12px 14px"}}>
              {/* Titolo + badge stato */}
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>
                    {m.pianoId && <span style={{fontSize:11,color:"#059669",marginRight:5}}>🔄</span>}
                    {m.titolo}
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:col,background:col+"18",padding:"2px 8px",borderRadius:20}}>{STATO_LBL[m.stato]}</span>
                  {m.priorita==="urgente" && <span style={{fontSize:11,fontWeight:700,color:"#EF4444",marginLeft:5}}>⚡ Urgente</span>}
                </div>
              </div>
              {/* Info */}
              <div style={{display:"grid",gap:3,fontSize:12,color:"var(--text-2)",marginBottom:10}}>
                {cl && <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:"#7F77DD",fontWeight:600}}>🏢</span><span style={{fontWeight:500,color:"#7F77DD"}}>{cl.rs}</span></div>}
                {as && <div style={{display:"flex",alignItems:"center",gap:6}}><span>⚙</span><span>{as.nome}{as.tipo?` · ${as.tipo}`:""}</span></div>}
                {op && <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:op.col,display:"inline-block",flexShrink:0}}/>
                  <span>{op.nome}</span>
                  <span style={{color:"var(--text-3)"}}>· {m.durata} min</span>
                </div>}
                {!op && <div style={{color:"var(--text-3)"}}>⏱ {m.durata} min · Nessun operatore</div>}
              </div>
              {/* Azioni */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {m.stato==="pianificata" && <button className="btn-sm" onClick={()=>onStato(m.id,"inCorso")}>▶ Avvia</button>}
                {m.stato==="inCorso" && <button className="btn-sm btn-success" onClick={()=>onChiudi(m)}>✓ Chiudi</button>}
                {m.stato==="scaduta" && <button className="btn-sm btn-danger" onClick={()=>onRipianifica(m)}>↻ Ripianifica</button>}
                <button className="btn-sm btn-icon" onClick={()=>onMod(m)} title="Modifica">✏</button>
              </div>
              {/* Checklist */}
              {m.pianoId && m.stato!=="completata" && (
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)"}}>
                  {m.stato!=="inCorso" && (
                    <div style={{fontSize:11,color:"var(--text-3)",marginBottom:6,fontStyle:"italic"}}>
                      🔒 Avvia l'attività per compilare la checklist
                    </div>
                  )}
                  <ChecklistIntervento
                    manutenzione={{...m, numero_intervento: m.numeroIntervento||1}}
                    readOnly={m.stato!=="inCorso"}
                    onProgressChange={null}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Calendario({ man, clienti, assets, operatori, onRipianifica, onNuovaData, onStato, onMod, onChiudi }) {
  const oggi=new Date();
  const [anno,sA]=useState(oggi.getFullYear());const [mese,sM]=useState(oggi.getMonth());
  const [opF,sOpF]=useState(0);const [drag,sDrag]=useState(null);const [drop,sDrop]=useState(null);const [ripModal,sRip]=useState(null);
  const [popup,setPopup]=useState(null); // data ISO del giorno selezionato
  const fornitori=useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"),[operatori]);
  const primoG=new Date(anno,mese,1).getDay();const giorniN=new Date(anno,mese+1,0).getDate();
  const attPerG=useMemo(()=>{const m={};man.filter(x=>{if(opF!==0&&x.operatoreId!==opF)return false;const d=new Date(x.data);return d.getFullYear()===anno&&d.getMonth()===mese;}).forEach(x=>{const g=new Date(x.data).getDate();if(!m[g])m[g]=[];m[g].push(x);});return m;},[man,anno,mese,opF]);
  const celle=[];for(let i=0;i<(primoG===0?6:primoG-1);i++)celle.push(null);for(let g=1;g<=giorniN;g++)celle.push(g);
  const toIso=g=>`${anno}-${String(mese+1).padStart(2,"0")}-${String(g).padStart(2,"0")}`;
  const giorniConflitto=useMemo(()=>{const set=new Set();const grouped={};man.filter(x=>x.stato!=="completata").forEach(x=>{const k=`${x.operatoreId}_${x.data}`;if(!grouped[k])grouped[k]=[];grouped[k].push(x);});Object.values(grouped).filter(g=>g.length>1).forEach(g=>{const d=new Date(g[0].data);if(d.getFullYear()===anno&&d.getMonth()===mese)set.add(d.getDate());});return set;},[man,anno,mese]);

  const STATO_COL = { pianificata:"#3B82F6", inCorso:"#F59E0B", completata:"#059669", scaduta:"#EF4444" };
  const STATO_BG  = { pianificata:"#3B82F6", inCorso:"#F59E0B", completata:"#059669", scaduta:"#EF4444" };

  const apriPopup = (g) => { if(!g||drag)return; setPopup(toIso(g)); };

  return (
    <div style={{display:"grid",gap:12}}>
      <div className="cal-header">
        <button className="btn-sm" onClick={()=>{if(mese===0){sM(11);sA(a=>a-1);}else sM(m=>m-1);}}>←</button>
        <span className="cal-month">{MESI[mese]} {anno}</span>
        <button className="btn-sm" onClick={()=>{if(mese===11){sM(0);sA(a=>a+1);}else sM(m=>m+1);}}>→</button>
        <button className="btn-sm" onClick={()=>{sM(oggi.getMonth());sA(oggi.getFullYear());}}>Oggi</button>
        <div style={{flex:1}} />
        <select value={opF} onChange={e=>sOpF(Number(e.target.value))} style={{minWidth:160}}>
          <option value={0}>Tutti i fornitori</option>
          {fornitori.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>
      {/* Legenda operatori */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",padding:"8px 12px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)"}}>
        {fornitori.map(op=><div key={op.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,fontWeight:500,color:"var(--text-2)"}}><span style={{width:10,height:10,borderRadius:2,background:op.col,display:"inline-block"}} />{op.nome.split(" ")[0]}</div>)}
        <span style={{fontSize:11,color:"var(--text-3)",marginLeft:"auto"}}>🔄 piano · ⚠ conflitto · trascina per spostare · click per dettaglio</span>
      </div>
      <div className="cal-grid">
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"var(--surface-2)"}}>{["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(g=><div key={g} className="cal-day-header">{g}</div>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {celle.map((g,i)=>{
            const isOggi=g&&g===oggi.getDate()&&mese===oggi.getMonth()&&anno===oggi.getFullYear();
            const isSelected=g&&popup===toIso(g);
            const isDrop=drop===g&&!!drag;const hasConf=g&&giorniConflitto.has(g);const att=g?(attPerG[g]||[]):[];
            let cls="cal-cell";if(!g)cls+=" empty";else if(isDrop)cls+=" drop-target";else if(hasConf)cls+=" conflict";
            return (
              <div key={i} className={cls}
                style={isSelected?{outline:"2px solid var(--amber)",outlineOffset:"-2px"}:{}}
                onDragOver={e=>{if(!g||!drag)return;e.preventDefault();sDrop(g);}}
                onDragLeave={()=>sDrop(null)}
                onDrop={e=>{e.preventDefault();if(!g||!drag)return;const nd=toIso(g);if(nd!==drag.data)sRip({manut:drag,nuovaData:nd});sDrag(null);sDrop(null);}}
                onClick={()=>apriPopup(g)}>
                <div className="cal-day-num" style={isOggi?{background:"var(--amber)",color:"#0D1B2A",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}:{}}>{g}</div>
                {hasConf&&<div style={{fontSize:9,color:"#B45309",marginBottom:2,fontWeight:700}}>⚠</div>}
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {att.slice(0,3).map(m=>{
                    const op=operatori.find(o=>o.id===m.operatoreId);
                    const statoBg=STATO_COL[m.stato]||"#888";
                    const initials=op?op.nome.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase():"?";
                    return(
                      <div key={m.id} className="cal-event"
                        draggable={m.stato!=="completata"}
                        onDragStart={e=>{sDrag(m);e.dataTransfer.effectAllowed="move";e.stopPropagation();}}
                        onDragEnd={()=>{sDrag(null);sDrop(null);}}
                        onClick={e=>{e.stopPropagation();apriPopup(g);}}
                        title={`${m.titolo} · ${op?.nome||"—"} · ${m.durata}min`}
                        style={{
                          background:(op?.col||"#888")+"15",
                          borderLeft:`3px solid ${statoBg}`,
                          color:"var(--text-1)",
                          opacity:drag?.id===m.id?.4:1,
                          display:"flex",alignItems:"center",gap:4,
                          padding:"2px 4px",borderRadius:"0 4px 4px 0",
                        }}>
                        <span style={{width:14,height:14,borderRadius:"50%",background:op?.col||"#888",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:"white",flexShrink:0}}>{initials}</span>
                        <span style={{fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{m.pianoId?"🔄 ":""}{m.titolo}</span>
                        <span style={{fontSize:9,color:"var(--text-3)",flexShrink:0}}>{m.durata<60?m.durata+"m":Math.round(m.durata/60*10)/10+"h"}</span>
                      </div>
                    );
                  })}
                  {att.length>3&&<div style={{fontSize:9,color:"var(--amber)",paddingLeft:2,fontWeight:700}}>+{att.length-3} altre</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {ripModal&&<ModalRipianifica manut={ripModal.manut} nuovaData={ripModal.nuovaData} man={man} operatori={operatori} onConferma={onRipianifica} onClose={()=>sRip(null)} />}
      {popup&&(
        <>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",zIndex:499}} onClick={()=>setPopup(null)} />
          <PopupGiorno
            data={popup}
            attivita={man.filter(m=>m.data===popup).sort((a,b)=>{const ord={scaduta:0,inCorso:1,pianificata:2,completata:3};return (ord[a.stato]||2)-(ord[b.stato]||2);})}
            clienti={clienti} assets={assets} operatori={operatori}
            onClose={()=>setPopup(null)}
            onStato={(id,s)=>{onStato&&onStato(id,s);}}
            onMod={(m)=>{setPopup(null);onMod&&onMod(m);}}
            onChiudi={(m)=>{setPopup(null);onChiudi&&onChiudi(m);}}
            onRipianifica={(m)=>{setPopup(null);sRip({manut:m,nuovaData:m.data});}}
          />
        </>
      )}
    </div>
  );
}

