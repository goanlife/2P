import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";
import { DashboardFornitore } from "./components/DashboardFornitore";
import { ChiudiIntervento } from "./components/ChiudiIntervento";
import { ChecklistEditor } from "./components/PianoChecklist";
import { CampanellaNotifiche, useNotifiche } from "./components/Notifiche";
import { RicercaGlobale } from "./components/RicercaGlobale";
import { Statistiche } from "./components/Statistiche";
import { KanbanView } from "./components/KanbanView";
import { QRCodeAsset, stampaVerbale, exportCSV, logAction } from "./utils/features.jsx";
import Onboarding from "./components/Onboarding";
import Azienda from "./components/Azienda";

const GIORNI = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const MESI   = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7   },
  { v:"mensile",     l:"Mensile",     giorni:30  },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60  },
  { v:"trimestrale", l:"Trimestrale", giorni:90  },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];
const COLORI_OP = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6"];
const OP_DEFAULT = [
  { nome:"Marco Rossi",   spec:"Elettrico",  col:"#378ADD", tipo:"fornitore" },
  { nome:"Laura Bianchi", spec:"Meccanico",  col:"#1D9E75", tipo:"fornitore" },
  { nome:"Giorgio Ferri", spec:"Idraulico",  col:"#D85A30", tipo:"fornitore" },
  { nome:"Anna Conti",    spec:"Generico",   col:"#7F77DD", tipo:"interno"   },
];
const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
const STATO_LABEL = { pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };
const TIPO_OP = {
  fornitore: { label:"Fornitore", cls:"badge", style:{background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE"} },
  cliente:   { label:"Cliente",   cls:"badge", style:{background:"#EEEDFE",color:"#4F46E5",border:"1px solid #C4B5FD"} },
  interno:   { label:"Interno",   cls:"badge", style:{background:"#ECFDF5",color:"#065F46",border:"1px solid #A7F3D0"} },
};
const COLORI_GRUPPI = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6","#0EA5E9","#84CC16"];

const TABS = [
  {id:"dashboard",   l:"Dashboard",    icon:"◈"},
  {id:"manutenzioni",l:"Manutenzioni", icon:"⚡"},
  {id:"piani",       l:"Piani",        icon:"🔄"},
  {id:"calendario",  l:"Calendario",   icon:"📅"},
  {id:"assets",      l:"Asset",        icon:"⚙"},
  {id:"utenti",      l:"Utenti",       icon:"👥"},
  {id:"gruppi",      l:"Gruppi",       icon:"🗂"},
  {id:"clienti",     l:"Clienti",      icon:"🏢"},
  {id:"statistiche", l:"Statistiche",  icon:"📊"},
  {id:"kanban",      l:"Kanban",        icon:"🗂"},
  {id:"azienda",     l:"Azienda",       icon:"🏛"},
];

// ─── Mappers ──────────────────────────────────────────────────────────────
const mapM  = r => ({ id:r.id, titolo:r.titolo, tipo:r.tipo, stato:r.stato, priorita:r.priorita, operatoreId:r.operatore_id, clienteId:r.cliente_id, assetId:r.asset_id, pianoId:r.piano_id, assegnazioneId:r.assegnazione_id||null, data:r.data, durata:r.durata, note:r.note||"", userId:r.user_id||"", noteChiusura:r.note_chiusura||"", oreEffettive:r.ore_effettive||null, partiUsate:r.parti_usate||"", firmaSvg:r.firma_svg||"", chiusoAt:r.chiuso_at||null, numeroIntervento:r.numero_intervento||1 });
const mapC  = r => ({ id:r.id, rs:r.rs, piva:r.piva||"", contatto:r.contatto||"", tel:r.tel||"", email:r.email||"", ind:r.ind||"", settore:r.settore||"", note:r.note||"", userId:r.user_id||"" });
const mapA  = r => ({ id:r.id, nome:r.nome, tipo:r.tipo||"", clienteId:r.cliente_id, ubicazione:r.ubicazione||"", matricola:r.matricola||"", marca:r.marca||"", modello:r.modello||"", dataInst:r.data_inst||"", stato:r.stato||"attivo", note:r.note||"", userId:r.user_id||"" });
const mapP  = r => ({ id:r.id, nome:r.nome, descrizione:r.descrizione||"", tipo:r.tipo||"ordinaria", frequenza:r.frequenza||"mensile", durata:r.durata||60, priorita:r.priorita||"media", attivo:r.attivo, userId:r.user_id||"" });
const mapAss = r => ({ id:r.id, pianoId:r.piano_id, assetId:r.asset_id, clienteId:r.cliente_id, operatoreId:r.operatore_id, dataInizio:r.data_inizio||"", dataFine:r.data_fine||"", attivo:r.attivo, userId:r.user_id||"" });
const mapOp = r => ({ id:r.id, nome:r.nome, spec:r.spec||"", col:r.col||"#378ADD", tipo:r.tipo||"fornitore", email:r.email||"", authUserId:r.auth_user_id||null, tema:r.tema||"navy" });
const mapSito   = r => ({ id:r.id, operatoreId:r.operatore_id, clienteId:r.cliente_id });
const mapGruppo = r => ({ id:r.id, nome:r.nome, descrizione:r.descrizione||'', col:r.col||'#378ADD' });
const mapGOp    = r => ({ id:r.id, gruppoId:r.gruppo_id, operatoreId:r.operatore_id });
const mapGSito  = r => ({ id:r.id, gruppoId:r.gruppo_id, clienteId:r.cliente_id });
const mapAllegato = r => ({ id:r.id, nome:r.nome, storagePath:r.storage_path, mimeType:r.mime_type||"", dimensione:r.dimensione||0, createdAt:r.created_at||"" });

const toDbM  = (f,uid) => ({ titolo:f.titolo, tipo:f.tipo||"ordinaria", stato:f.stato||"pianificata", priorita:f.priorita||"media", operatore_id:f.operatoreId?Number(f.operatoreId):null, cliente_id:f.clienteId?Number(f.clienteId):null, asset_id:f.assetId?Number(f.assetId):null, piano_id:f.pianoId?Number(f.pianoId):null, data:f.data, durata:Number(f.durata)||60, note:f.note||"", user_id:uid });
const toDbC  = (f,uid) => ({ rs:f.rs, piva:f.piva||"", contatto:f.contatto||"", tel:f.tel||"", email:f.email||"", ind:f.ind||"", settore:f.settore||"", note:f.note||"", user_id:uid });
const toDbA  = (f,uid) => ({ nome:f.nome, tipo:f.tipo||"", cliente_id:f.clienteId?Number(f.clienteId):null, ubicazione:f.ubicazione||"", matricola:f.matricola||"", marca:f.marca||"", modello:f.modello||"", data_inst:f.dataInst||null, stato:f.stato||"attivo", note:f.note||"", user_id:uid });
const toDbP  = (f,uid) => ({ nome:f.nome, descrizione:f.descrizione||"", tipo:f.tipo||"ordinaria", frequenza:f.frequenza||"mensile", durata:Number(f.durata)||60, priorita:f.priorita||"media", attivo:f.attivo!==false, user_id:uid });
const toDbAss = (f,uid) => ({ piano_id:Number(f.pianoId), asset_id:f.assetId?Number(f.assetId):null, cliente_id:f.clienteId?Number(f.clienteId):null, operatore_id:f.operatoreId?Number(f.operatoreId):null, data_inizio:f.dataInizio||null, data_fine:f.dataFine||null, attivo:f.attivo!==false, user_id:uid });
const toDbOp    = (f,uid) => ({ nome:f.nome, spec:f.spec||"", col:f.col||"#378ADD", tipo:f.tipo||"fornitore", user_id:uid });
const toDbGruppo = (f,uid) => ({ nome:f.nome, descrizione:f.descrizione||"", col:f.col||"#378ADD", user_id:uid });

// ─── Utils ────────────────────────────────────────────────────────────────
const fmtData  = d => d ? new Date(d).toLocaleDateString("it-IT") : "—";
const isoDate  = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const addDays  = (iso,n) => { const d=new Date(iso); d.setDate(d.getDate()+n); return isoDate(d); };
const addMonths= (iso,n) => { const d=new Date(iso); d.setMonth(d.getMonth()+n); return isoDate(d); };

const LIVELLI_PIANO = [
  { v:"standard", l:"Standard",    col:"#378ADD", desc:"Piano normale senza livello" },
  { v:"L1",       l:"L1 — Base",   col:"#059669", desc:"Controllo rapido (es. settimanale)" },
  { v:"L2",       l:"L2 — Medio",  col:"#F59E0B", desc:"Controllo completo (es. mensile)" },
  { v:"L3",       l:"L3 — Completo", col:"#EF4444", desc:"Revisione totale (es. annuale)" },
];
function generaOccorrenze(piano, dataInizio, mesi=12) {
  if (!dataInizio) return [];
  const freq = FREQUENZE.find(f=>f.v===piano.frequenza); if (!freq) return [];
  const fine = (piano.dataFine&&piano.dataFine>dataInizio) ? piano.dataFine : addMonths(dataInizio, mesi);
  const occ=[]; let cur=dataInizio;
  while (cur<=fine && occ.length<200) {
    occ.push(cur);
    const mult={mensile:1,bimestrale:2,trimestrale:3,semestrale:6,annuale:12}[piano.frequenza];
    cur = mult ? addMonths(cur,mult) : addDays(cur,freq.giorni);
  }
  return occ;
}
function conflitti(manutenzioni,operatoreId,data,escludiId=null) {
  return manutenzioni.filter(m=>m.operatoreId===Number(operatoreId)&&m.data===data&&m.stato!=="completata"&&m.id!==escludiId);
}

// ─── Atoms ───────────────────────────────────────────────────────────────
function Av({ nome, col, size=36 }) {
  const initials = (nome||"?").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
  return <div className="av" style={{width:size,height:size,background:(col||"#888")+"22",color:col||"#888",fontSize:Math.round(size*.34)}}>{initials}</div>;
}
function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function Toast({ msg, type="error", onDismiss }) {
  const bg = type==="success"?"#ECFDF5":type==="warning"?"#FFFBEB":"#FEF2F2";
  const border = type==="success"?"#A7F3D0":type==="warning"?"#FDE68A":"#FECACA";
  const color = type==="success"?"#065F46":type==="warning"?"#92400E":"#991B1B";
  const icon = type==="success"?"✅":type==="warning"?"⚠":"❌";
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:bg,border:`1px solid ${border}`,borderRadius:"var(--radius-sm)",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,.15)",maxWidth:360}}>
      <span style={{fontSize:16}}>{icon}</span>
      <span style={{flex:1,fontSize:13,fontWeight:500,color}}>{msg}</span>
      <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",color,fontSize:16,padding:"0 4px"}}>✕</button>
    </div>
  );
}

function ConflictiBanner({ conf }) {
  if (!conf?.length) return null;
  return (
    <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:13,color:"#92400E"}}>
      <strong>⚠ Attenzione:</strong> {conf.length} attività già pianificata/e in questa data:
      <ul style={{margin:"6px 0 0",paddingLeft:18}}>{conf.map(m=><li key={m.id}>{m.titolo} ({m.durata} min)</li>)}</ul>
    </div>
  );
}

function Overlay({ children, zIndex=1000 }) {
  return <div className="overlay" style={{zIndex}}>{children}</div>;
}
function Modal({ title, onClose, onSave, saveLabel="Salva", saveColor, saveOk=true, children }) {
  return (
    <Overlay>
      <div className="modal-box">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{display:"grid",gap:14}}>{children}</div>
        <div className="modal-footer">
          <button onClick={onClose}>Annulla</button>
          <button disabled={!saveOk} onClick={()=>{onSave();onClose();}}
            style={saveOk&&saveColor?{background:saveColor,color:"white",borderColor:saveColor}:{}}
            className={saveOk&&!saveColor?"btn-primary":""}
          >{saveLabel}</button>
        </div>
      </div>
    </Overlay>
  );
}
function AvvisoConflitto({ conflitti: conf }) {
  if (!conf||!conf.length) return null;
  return (
    <div className="conflict-banner">
      <strong>⚠ Conflitto:</strong> {conf.length} attività già pianificata/e in questa data:
      <ul style={{margin:"6px 0 0",paddingLeft:18}}>{conf.map(m=><li key={m.id}>{m.titolo} ({m.durata} min)</li>)}</ul>
    </div>
  );
}

// ─── Modal Siti Cliente ───────────────────────────────────────────────────
function ModalSitiCliente({ operatore, clienti, siti, onClose, onSave }) {
  // siti = array di {operatoreId, clienteId} già salvati per questo operatore
  const mieiSiti = useMemo(()=>siti.filter(s=>s.operatoreId===operatore.id).map(s=>s.clienteId),[siti,operatore.id]);
  const [sel, setSel] = useState(new Set(mieiSiti));
  const toggle = id => setSel(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  return (
    <Overlay>
      <div className="modal-box" style={{width:"min(520px,96vw)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div className="modal-title">Siti associati</div>
            <div style={{fontSize:13,color:"var(--text-3)",marginTop:3}}>Cliente: <strong>{operatore.nome}</strong></div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{fontSize:12,color:"var(--text-2)",marginBottom:14,padding:"10px 12px",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}}>
          ℹ Seleziona i clienti/siti che questo utente potrà visualizzare nella propria vista.
        </div>
        {clienti.length===0&&<div style={{textAlign:"center",padding:"24px 0",color:"var(--text-3)"}}>Nessun cliente disponibile. Crea prima un cliente.</div>}
        <div style={{display:"grid",gap:6,maxHeight:340,overflowY:"auto"}}>
          {clienti.map(c=>{
            const checked = sel.has(c.id);
            return (
              <label key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:"var(--radius-sm)",border:`1px solid ${checked?"#C4B5FD":"var(--border)"}`,background:checked?"#EEEDFE":"var(--surface)",cursor:"pointer",transition:"all .15s"}}>
                <input type="checkbox" checked={checked} onChange={()=>toggle(c.id)} style={{width:16,height:16,accentColor:"#7F77DD",cursor:"pointer"}} />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13}}>{c.rs}</div>
                  {c.settore&&<div style={{fontSize:11,color:"var(--text-3)"}}>{c.settore}</div>}
                </div>
                {checked&&<span style={{fontSize:11,fontWeight:700,color:"#4F46E5",background:"#EDE9FE",padding:"2px 7px",borderRadius:10}}>✓ Associato</span>}
              </label>
            );
          })}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Annulla</button>
          <button className="btn-primary" onClick={()=>{onSave(operatore.id,[...sel]);onClose();}}>
            Salva associazioni ({sel.size})
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Vista Cliente ────────────────────────────────────────────────────────
function VistaCliente({ operatore, clienti=[], assets=[], manutenzioni=[], piani=[], siti=[], onClose }) {
  const clientiIds = useMemo(()=>(siti||[]).filter(s=>s.operatoreId===operatore.id).map(s=>s.clienteId),[siti,operatore.id]);
  const myClienti  = useMemo(()=>(clienti||[]).filter(c=>clientiIds.includes(c.id)),[clienti,clientiIds]);
  const myAssets   = useMemo(()=>(assets||[]).filter(a=>clientiIds.includes(a.clienteId)),[assets,clientiIds]);
  const myMan      = useMemo(()=>(manutenzioni||[]).filter(m=>clientiIds.includes(m.clienteId)),[manutenzioni,clientiIds]);
  const myPiani    = useMemo(()=>(piani||[]).filter(p=>clientiIds.includes(p.clienteId)),[piani,clientiIds]);
  const [tab,setTab] = useState("manutenzioni");

  return (
    <Overlay>
      <div className="modal-box" style={{width:"min(860px,98vw)",maxHeight:"95vh"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,paddingBottom:16,borderBottom:"1px solid var(--border)"}}>
          <div style={{width:44,height:44,borderRadius:"var(--radius)",background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👁</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16}}>Vista Cliente — {operatore.nome}</div>
            <div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>{clientiIds.length} siti associati · Anteprima di ciò che vede questo utente</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {clientiIds.length===0?(
          <div style={{textAlign:"center",padding:"40px 20px",color:"var(--text-3)"}}>
            <div style={{fontSize:32,marginBottom:12}}>🔗</div>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Nessun sito associato</div>
            <div style={{fontSize:13}}>Associa almeno un cliente/sito a questo utente per attivarne la vista.</div>
          </div>
        ):(
          <>
            {/* KPI bar */}
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
              {[{v:myClienti.length,l:"Siti",c:"#7F77DD"},{v:myAssets.length,l:"Asset",c:"#2563EB"},{v:myMan.filter(m=>m.stato==="pianificata").length,l:"Pianificate",c:"#F59E0B"},{v:myMan.filter(m=>m.stato==="inCorso").length,l:"In corso",c:"#D97706"},{v:myMan.filter(m=>m.stato==="scaduta").length,l:"Scadute",c:"#DC2626"}].map(k=>(
                <div key={k.l} style={{flex:1,minWidth:90,background:"var(--surface-2)",borderRadius:"var(--radius-sm)",padding:"12px 14px",border:"1px solid var(--border)"}}>
                  <div style={{fontFamily:"var(--font-head)",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</div>
                  <div style={{fontSize:11,color:"var(--text-3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em",marginTop:2}}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:"1px solid var(--border)",paddingBottom:0}}>
              {[{id:"manutenzioni",l:"Manutenzioni"},{id:"assets",l:"Asset"},{id:"piani",l:"Piani"},{id:"siti",l:"Siti associati"}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{border:"none",borderBottom:tab===t.id?"2px solid #7F77DD":"2px solid transparent",background:"none",padding:"8px 14px",fontWeight:tab===t.id?600:400,color:tab===t.id?"#7F77DD":"var(--text-3)",borderRadius:0,cursor:"pointer",fontSize:13}}>{t.l}</button>
              ))}
            </div>

            {/* Content */}
            <div style={{overflowY:"auto",maxHeight:380}}>
              {tab==="manutenzioni"&&(
                <div style={{display:"grid",gap:6}}>
                  {myMan.length===0&&<div style={{textAlign:"center",padding:"24px 0",color:"var(--text-3)"}}>Nessuna manutenzione</div>}
                  {myMan.sort((a,b)=>a.data.localeCompare(b.data)).map(m=>{
                    const cl=myClienti.find(c=>c.id===m.clienteId);const as=myAssets.find(a=>a.id===m.assetId);
                    return (
                      <div key={m.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"11px 14px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface)"}}>
                        <div style={{width:3,borderRadius:99,background:PRI_COLOR[m.priorita]||"#ccc",alignSelf:"stretch",flexShrink:0}} />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{m.titolo}</div>
                          <div style={{fontSize:11.5,color:"var(--text-3)",display:"flex",gap:10,flexWrap:"wrap"}}>
                            {cl&&<span style={{color:"#7F77DD",fontWeight:500}}>🏢 {cl.rs}</span>}
                            {as&&<span>⚙ {as.nome}</span>}
                            <span>📅 {fmtData(m.data)}</span>
                            <span>⏱ {m.durata} min</span>
                          </div>
                        </div>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:600,...(m.stato==="completata"?{background:"#ECFDF5",color:"#065F46"}:m.stato==="scaduta"?{background:"#FEF2F2",color:"#991B1B"}:m.stato==="inCorso"?{background:"#FFFBEB",color:"#B45309"}:{background:"#EFF6FF",color:"#1D4ED8"})}}>{STATO_LABEL[m.stato]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {tab==="assets"&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
                  {myAssets.map(a=>{const cl=myClienti.find(c=>c.id===a.clienteId);return(
                    <div key={a.id} style={{padding:"12px 14px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface)"}}>
                      <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>⚙ {a.nome}</div>
                      {a.tipo&&<div style={{fontSize:11.5,color:"var(--text-3)"}}>{a.tipo}</div>}
                      {cl&&<div style={{fontSize:11.5,color:"#7F77DD",fontWeight:500,marginTop:3}}>🏢 {cl.rs}</div>}
                      {a.ubicazione&&<div style={{fontSize:11,color:"var(--text-3)",marginTop:2}}>📍 {a.ubicazione}</div>}
                    </div>
                  );})}
                  {myAssets.length===0&&<div style={{textAlign:"center",padding:"24px 0",color:"var(--text-3)"}}>Nessun asset</div>}
                </div>
              )}
              {tab==="piani"&&(
                <div style={{display:"grid",gap:6}}>
                  {myPiani.map(p=>{const cl=myClienti.find(c=>c.id===p.clienteId);const freq=FREQUENZE.find(f=>f.v===p.frequenza);return(
                    <div key={p.id} style={{padding:"11px 14px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface)",display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:18}}>🔄</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{p.nome}</div>
                        <div style={{fontSize:11.5,color:"var(--text-3)",marginTop:2}}>{freq?.l}{cl?` · ${cl.rs}`:""} · Dal {fmtData(p.dataInizio)}</div>
                      </div>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:600,...(p.attivo?{background:"#ECFDF5",color:"#065F46"}:{background:"var(--surface-3)",color:"var(--text-2)"})}}>{p.attivo?"Attivo":"Sospeso"}</span>
                    </div>
                  );})}
                  {myPiani.length===0&&<div style={{textAlign:"center",padding:"24px 0",color:"var(--text-3)"}}>Nessun piano</div>}
                </div>
              )}
              {tab==="siti"&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                  {myClienti.map(c=>(
                    <div key={c.id} style={{padding:"12px 14px",borderRadius:"var(--radius-sm)",border:"1px solid #C4B5FD",background:"#EEEDFE",display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:36,height:36,borderRadius:"var(--radius-sm)",background:"#DDD6FE",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:"#4F46E5",flexShrink:0}}>{c.rs.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()}</div>
                      <div><div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.rs}</div>{c.settore&&<div style={{fontSize:11,color:"#6D28D9"}}>{c.settore}</div>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

// ─── Modal Utente (ex Operatore) ──────────────────────────────────────────
function ModalUtente({ ini, onClose, onSalva }) {
  const [f,sf]=useState(ini||{nome:"",spec:"",col:"#378ADD",tipo:"fornitore",email:"",tema:"navy"});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <Modal title={ini?"Modifica utente":"Nuovo utente"} onClose={onClose} onSave={()=>onSalva(f)} saveOk={!!f.nome.trim()} saveLabel={ini?"Aggiorna":"Aggiungi"}>
      <Field label="Nome e cognome *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} placeholder="Es. Mario Rossi..." style={{width:"100%"}} /></Field>
      <Field label="Email (per accesso app)"><input type="email" value={f.email||""} onChange={e=>s("email",e.target.value)} placeholder="nome@azienda.it" style={{width:"100%"}} /></Field>
      <Field label="Tipologia utente *">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {["fornitore","cliente","interno"].map(t=>{
            const desc={fornitore:"Assegnabile alle manutenzioni",cliente:"Vista limitata ai propri siti",interno:"Accesso interno, non assegnabile"}[t];
            const label={fornitore:"Fornitore",cliente:"Cliente",interno:"Interno"}[t];
            const color={fornitore:"#1D4ED8",cliente:"#4F46E5",interno:"#065F46"}[t];
            const bg={fornitore:"#EFF6FF",cliente:"#EEEDFE",interno:"#ECFDF5"}[t];
            const bd={fornitore:"#BFDBFE",cliente:"#C4B5FD",interno:"#A7F3D0"}[t];
            return (
              <label key={t} style={{display:"flex",flexDirection:"column",gap:4,padding:"10px 12px",borderRadius:"var(--radius-sm)",border:`1.5px solid ${f.tipo===t?color:"var(--border)"}`,background:f.tipo===t?bg:"var(--surface)",cursor:"pointer",transition:"all .15s"}}>
                <input type="radio" name="tipo" value={t} checked={f.tipo===t} onChange={()=>s("tipo",t)} style={{display:"none"}} />
                <span style={{fontWeight:700,fontSize:12,color:f.tipo===t?color:"var(--text-2)"}}>{f.tipo===t?"✓ ":""}{label}</span>
                <span style={{fontSize:10.5,color:"var(--text-3)",lineHeight:1.3}}>{desc}</span>
              </label>
            );
          })}
        </div>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Specializzazione / Ruolo">
          <input value={f.spec} onChange={e=>s("spec",e.target.value)} placeholder="Es. Elettrico, Meccanico..." style={{width:"100%"}} />
        </Field>
        <Field label="Colore calendario">
          <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:4}}>
            {COLORI_OP.map(c=><div key={c} className={"color-dot"+(f.col===c?" selected":"")} style={{background:c}} onClick={()=>s("col",c)} />)}
          </div>
        </Field>
      </div>
      <Field label="Tema colore preferito">
        <SelettoreTema value={f.tema||"navy"} onChange={v=>s("tema",v)} />
      </Field>
    </Modal>
  );
}

// ─── Modal Manutenzione ───────────────────────────────────────────────────
function ModalManut({ ini, clienti, assets, manutenzioni, operatori, onClose, onSalva, userId }) {
  // Solo i fornitori sono assegnabili
  const fornitori = useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"),[operatori]);
  const defOp = fornitori[0]?.id||"";
  const [f,sf]=useState(ini||{titolo:"",tipo:"ordinaria",priorita:"media",operatoreId:defOp,clienteId:"",assetId:"",data:"",durata:60,note:"",stato:"pianificata",pianoId:null});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const ok=f.titolo.trim()&&f.data;
  const assetsCliente=useMemo(()=>f.clienteId?assets.filter(a=>a.clienteId===Number(f.clienteId)):assets,[f.clienteId,assets]);
  const conf=useMemo(()=>f.operatoreId&&f.data?conflitti(manutenzioni,f.operatoreId,f.data,ini?.id):[],[f.operatoreId,f.data,manutenzioni]);
  return (
    <Modal title={ini?"Modifica manutenzione":"Nuova manutenzione"} onClose={onClose} onSave={()=>onSalva({...f,operatoreId:f.operatoreId?Number(f.operatoreId):null,clienteId:f.clienteId?Number(f.clienteId):null,assetId:f.assetId?Number(f.assetId):null})} saveOk={!!ok}>
      <Field label="Titolo *"><input value={f.titolo} onChange={e=>s("titolo",e.target.value)} placeholder="Descrizione attività..." style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select></Field>
        <Field label="Priorità"><select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}><option value="bassa">Bassa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></Field>
      </div>
      <Field label="Cliente"><select value={f.clienteId||""} onChange={e=>{s("clienteId",e.target.value?Number(e.target.value):"");s("assetId","");}} style={{width:"100%"}}><option value="">— Nessun cliente —</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select></Field>
      <Field label="Asset"><select value={f.assetId||""} onChange={e=>s("assetId",e.target.value?Number(e.target.value):"")} style={{width:"100%"}}><option value="">— Nessun asset —</option>{assetsCliente.map(a=><option key={a.id} value={a.id}>{a.nome} ({a.tipo})</option>)}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Data *"><input type="date" value={f.data} onChange={e=>s("data",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Durata (min)"><input type="number" value={f.durata} onChange={e=>s("durata",Number(e.target.value))} min={15} step={15} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Fornitore assegnato">
        <select value={f.operatoreId||""} onChange={e=>s("operatoreId",Number(e.target.value))} style={{width:"100%"}}>
          <option value="">— Nessun fornitore —</option>
          {fornitori.map(o=><option key={o.id} value={o.id}>{o.nome}{o.spec?` — ${o.spec}`:""}</option>)}
        </select>
        {fornitori.length===0&&<div style={{fontSize:11,color:"var(--text-3)",marginTop:4}}>⚠ Nessun fornitore disponibile. Crea un utente di tipo Fornitore.</div>}
      </Field>
      <AvvisoConflitto conflitti={conf} />
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
      {ini?.id&&<PannelloAllegati entitaTipo="manutenzione" entitaId={ini.id} userId={userId||""} />}
    </Modal>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ man, clienti, assets, piani, operatori, onNavigate }) {
  const stats=useMemo(()=>({tot:man.length,pi:man.filter(m=>m.stato==="pianificata").length,ic:man.filter(m=>m.stato==="inCorso").length,sc:man.filter(m=>m.stato==="scaduta").length,ur:man.filter(m=>m.priorita==="urgente"&&m.stato!=="completata").length}),[man]);
  const prossime=useMemo(()=>man.filter(m=>m.stato==="pianificata").sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6),[man]);
  const fornitori=useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"),[operatori]);
  const carichi=useMemo(()=>fornitori.map(op=>({...op,att:man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").length,ore:Math.round(man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").reduce((a,m)=>a+m.durata,0)/60*10)/10})),[man,fornitori]);
  const maxOre=Math.max(...carichi.map(c=>c.ore),1);
  const confMap=useMemo(()=>{const m={};man.filter(x=>x.stato!=="completata").forEach(x=>{const k=`${x.operatoreId}_${x.data}`;if(!m[k])m[k]=[];m[k].push(x);});return Object.values(m).filter(g=>g.length>1);},[man]);
  const kpis=[
    {v:stats.tot, l:"Totale attività", c:"#0D1B2A", action:()=>onNavigate("manutenzioni",{})},
    {v:clienti.length, l:"Clienti", c:"#7F77DD", action:()=>onNavigate("clienti",{})},
    {v:assets.length, l:"Asset", c:"#2563EB", action:()=>onNavigate("assets",{})},
    {v:piani.filter(p=>p.attivo).length, l:"Piani attivi", c:"#059669", action:()=>onNavigate("piani",{})},
    {v:stats.pi, l:"Pianificate", c:"#3B82F6", action:()=>onNavigate("manutenzioni",{stato:"pianificata"})},
    {v:stats.ic, l:"In corso",    c:"#D97706", action:()=>onNavigate("manutenzioni",{stato:"inCorso"})},
    {v:stats.sc, l:"Scadute",     c:"#DC2626", action:()=>onNavigate("manutenzioni",{stato:"scaduta"})},
    {v:stats.ur, l:"Urgenti",     c:"#EF4444", action:()=>onNavigate("manutenzioni",{priorita:"urgente"})},
  ];
  return (
    <div style={{display:"grid",gap:20}}>
      {confMap.length>0&&(<div className="global-conflict"><div className="global-conflict-title">⚠ {confMap.length} conflitto/i di calendario</div>{confMap.map((g,i)=>{const op=operatori.find(o=>o.id===g[0].operatoreId);return <div key={i} className="global-conflict-item">→ {op?.nome||"—"}: {g.length} attività il {fmtData(g[0].data)}</div>;})}</div>)}
      <div className="kpi-grid">{kpis.map(k=>(
        <div key={k.l} className="kpi-card" style={{"--c":k.c, cursor:"pointer"}}
          onClick={k.action}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="var(--shadow-lg)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
          <div className="kpi-value">{k.v}</div>
          <div className="kpi-label">{k.l}</div>
          <div style={{fontSize:10,color:"var(--c, var(--text-3))",opacity:.6,marginTop:4,fontWeight:600}}>Vai →</div>
        </div>
      ))}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        <div className="card">
          <div className="section-head"><span className="section-title">📋 Prossime attività</span></div>
          {prossime.map(m=>{const op=fornitori.find(o=>o.id===m.operatoreId)||operatori.find(o=>o.id===m.operatoreId);const cl=clienti.find(c=>c.id===m.clienteId);return(
            <div key={m.id}
              onClick={()=>onNavigate("manutenzioni",{stato:"pianificata"})}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)",cursor:"pointer",transition:"background .12s",borderRadius:4}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
              onMouseLeave={e=>e.currentTarget.style.background=""}>
              <Av nome={op?.nome||"?"} col={op?.col||"#888"} size={32} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.titolo||"(senza titolo)"}</div>
                <div style={{fontSize:11,color:"var(--text-3)",marginTop:1}}>{fmtData(m.data)} · {m.durata}min{cl?` · ${cl.rs}`:""}</div>
              </div>
              {m.pianoId&&<span style={{fontSize:9,fontWeight:700,color:"var(--green)",letterSpacing:".04em",background:"#ECFDF5",padding:"2px 5px",borderRadius:3}}>PIANO</span>}
              <span style={{fontSize:11,color:"var(--text-3)"}}>›</span>
            </div>
          );})}
          {!prossime.length&&<div style={{textAlign:"center",padding:"24px 0",color:"var(--text-3)",fontSize:13}}>Nessuna attività pianificata</div>}
        </div>
        <div className="card">
          <div className="section-head"><span className="section-title">🔧 Carico fornitori</span></div>
          {carichi.map(op=>(<div key={op.id} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:8}}><Av nome={op.nome} col={op.col} size={28} /><span style={{fontSize:13,fontWeight:600}}>{op.nome}</span></div><span style={{fontSize:11,color:"var(--text-3)",fontWeight:500}}>{op.att} att · {op.ore}h</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${(op.ore/maxOre)*100}%`,background:op.col}} /></div></div>))}
          {carichi.length===0&&<div style={{fontSize:13,color:"var(--text-3)",textAlign:"center",padding:"12px 0"}}>Nessun fornitore attivo</div>}
        </div>
        <div className="card">
          <div className="section-head"><span className="section-title">⚙ Asset per stato</span></div>
          {[{s:"attivo",l:"Attivi",c:"#059669"},{s:"manutenzione",l:"In manutenzione",c:"#D97706"},{s:"inattivo",l:"Inattivi",c:"#DC2626"}].map(({s:st,l,c})=>{const n=assets.filter(a=>a.stato===st).length;return n>0?<div key={st} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border)"}}><span style={{fontSize:13,color:"var(--text-2)"}}>{l}</span><span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16,color:c}}>{n}</span></div>:null;})}
          <div style={{marginTop:16}}><div className="section-title" style={{marginBottom:10}}>👥 Utenti per tipo</div>
            {["fornitore","cliente","interno"].map(t=>{const n=operatori.filter(o=>o.tipo===t).length;const cfg=TIPO_OP[t];return <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--border)"}}><span className="badge" style={cfg.style}>{cfg.label}</span><span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16}}>{n}</span></div>;})}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lista manutenzioni ───────────────────────────────────────────────────
function ListaManut({ man, clienti, assets, operatori, onStato, onDel, onMod, initialFilters, onChiudi, onVerbale }) {
  const [fT,sfT]=useState(initialFilters?.tipo||"tutti");
  const [fS,sfS]=useState(initialFilters?.stato||"tutti");
  const [fC,sfC]=useState("tutti");
  const [cerca,sCerca]=useState("");
  const [fPri,sfPri]=useState(initialFilters?.priorita||"tutti");
  const filtrate=useMemo(()=>man.filter(m=>{if(fT!=="tutti"&&m.tipo!==fT)return false;if(fS!=="tutti"&&m.stato!==fS)return false;if(fC!=="tutti"&&String(m.clienteId)!==fC)return false;if(fPri!=="tutti"&&m.priorita!==fPri)return false;if(cerca&&!m.titolo.toLowerCase().includes(cerca.toLowerCase()))return false;return true;}),[man,fT,fS,fC,fPri,cerca]);
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca manutenzione..." style={{flex:1,minWidth:140}} />
        <select value={fT} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select>
        <select value={fS} onChange={e=>sfS(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="pianificata">Pianificata</option><option value="inCorso">In corso</option><option value="completata">Completata</option><option value="scaduta">Scaduta</option></select>
        <select value={fC} onChange={e=>sfC(e.target.value)}><option value="tutti">Tutti i clienti</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select>
        <select value={fPri} onChange={e=>sfPri(e.target.value)}><option value="tutti">Tutte le priorità</option><option value="urgente">⚡ Urgente</option><option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option></select>
        <span style={{fontSize:12,color:"var(--text-3)",alignSelf:"center",whiteSpace:"nowrap"}}>{filtrate.length} risultati</span>
        <button onClick={()=>exportCSV(man,clienti,assets,operatori,filtrate)}
          style={{fontSize:12,padding:"6px 12px",background:"#ECFDF5",color:"#065F46",borderColor:"#A7F3D0",fontWeight:600,whiteSpace:"nowrap"}}>
          ⬇ CSV
        </button>
      </div>
      <div style={{display:"grid",gap:8}}>
        {filtrate.map(m=>{
          const op=operatori.find(o=>o.id===m.operatoreId);const cl=clienti.find(c=>c.id===m.clienteId);const as=assets.find(a=>a.id===m.assetId);
          const haConf=man.some(x=>x.id!==m.id&&x.operatoreId===m.operatoreId&&x.data===m.data&&x.stato!=="completata");
          return (
            <div key={m.id} className={"maint-row"+(haConf?" conflict":"")}>
              <div className="maint-pri-bar" style={{background:PRI_COLOR[m.priorita]||"#ccc"}} />
              {op&&<Av nome={op.nome} col={op.col} size={36} />}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:5}}>
                  {haConf&&<span style={{fontSize:12}}>⚠️</span>}
                  <span style={{fontWeight:600,fontSize:14}}>{m.titolo}</span>
                  <span className={"badge "+(m.tipo==="ordinaria"?"badge-ordinaria":"badge-straord")}>{m.tipo==="ordinaria"?"Ordinaria":"Straord."}</span>
                  <span className={"badge badge-"+m.stato}>{STATO_LABEL[m.stato]}</span>
                  {m.priorita==="urgente"&&<span className="badge badge-urgente">⚡ Urgente</span>}
                  {m.pianoId&&<span style={{fontSize:10,fontWeight:700,color:"var(--green)",background:"#ECFDF5",padding:"2px 6px",borderRadius:4}}>🔄 PIANO</span>}
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:12,color:"var(--text-3)"}}>
                  {cl&&<span style={{color:"#7F77DD",fontWeight:600}}>🏢 {cl.rs}</span>}
                  {as&&<span>⚙ {as.nome}</span>}
                  <span>📅 {fmtData(m.data)}</span><span>⏱ {m.durata} min</span>
                  {op&&<span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:op.col,display:"inline-block"}} />{op.nome}</span>}
                </div>
                {m.note&&<div style={{fontSize:11.5,color:"var(--text-3)",marginTop:4,fontStyle:"italic"}}>{m.note}</div>}
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0,alignItems:"center"}}>
                {m.stato==="pianificata"&&<button className="btn-sm" onClick={()=>onStato(m.id,"inCorso")}>Avvia ▶</button>}
                {m.stato==="inCorso"&&<button className="btn-sm btn-success" onClick={()=>onChiudi?onChiudi(m):onStato(m.id,"completata")}>✓ Chiudi</button>}
                <button className="btn-sm btn-icon" onClick={()=>onMod(m)}>✏</button>
                <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(m.id)}>✕</button>
              </div>
            </div>
          );
        })}
        {!filtrate.length&&<div className="empty"><div className="empty-icon">📋</div><div className="empty-text">Nessuna attività trovata</div></div>}
      </div>
    </div>
  );
}

// ─── Calendario ───────────────────────────────────────────────────────────
function ModalRipianifica({ manut, nuovaData, man, operatori, onConferma, onClose }) {
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

function Calendario({ man, clienti, assets, operatori, onRipianifica, onNuovaData }) {
  const oggi=new Date();
  const [anno,sA]=useState(oggi.getFullYear());const [mese,sM]=useState(oggi.getMonth());
  const [opF,sOpF]=useState(0);const [drag,sDrag]=useState(null);const [drop,sDrop]=useState(null);const [ripModal,sRip]=useState(null);
  const fornitori=useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"),[operatori]);
  const primoG=new Date(anno,mese,1).getDay();const giorniN=new Date(anno,mese+1,0).getDate();
  const attPerG=useMemo(()=>{const m={};man.filter(x=>{if(opF!==0&&x.operatoreId!==opF)return false;const d=new Date(x.data);return d.getFullYear()===anno&&d.getMonth()===mese;}).forEach(x=>{const g=new Date(x.data).getDate();if(!m[g])m[g]=[];m[g].push(x);});return m;},[man,anno,mese,opF]);
  const celle=[];for(let i=0;i<primoG;i++)celle.push(null);for(let g=1;g<=giorniN;g++)celle.push(g);
  const toIso=g=>`${anno}-${String(mese+1).padStart(2,"0")}-${String(g).padStart(2,"0")}`;
  const giorniConflitto=useMemo(()=>{const set=new Set();const grouped={};man.filter(x=>x.stato!=="completata").forEach(x=>{const k=`${x.operatoreId}_${x.data}`;if(!grouped[k])grouped[k]=[];grouped[k].push(x);});Object.values(grouped).filter(g=>g.length>1).forEach(g=>{const d=new Date(g[0].data);if(d.getFullYear()===anno&&d.getMonth()===mese)set.add(d.getDate());});return set;},[man,anno,mese]);
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
      <div style={{display:"flex",gap:12,flexWrap:"wrap",padding:"8px 12px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)"}}>
        {fornitori.map(op=><div key={op.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,fontWeight:500,color:"var(--text-2)"}}><span style={{width:10,height:10,borderRadius:2,background:op.col,display:"inline-block"}} />{op.nome.split(" ")[0]}</div>)}
        <span style={{fontSize:11,color:"var(--text-3)",marginLeft:"auto"}}>🔄 piano · ⚠ conflitto · trascina per spostare</span>
      </div>
      <div className="cal-grid">
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"var(--surface-2)"}}>{GIORNI.map(g=><div key={g} className="cal-day-header">{g}</div>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {celle.map((g,i)=>{
            const isOggi=g&&g===oggi.getDate()&&mese===oggi.getMonth()&&anno===oggi.getFullYear();
            const isDrop=drop===g&&!!drag;const hasConf=g&&giorniConflitto.has(g);const att=g?(attPerG[g]||[]):[];
            let cls="cal-cell";if(!g)cls+=" empty";else if(isDrop)cls+=" drop-target";else if(hasConf)cls+=" conflict";
            return (
              <div key={i} className={cls} onDragOver={e=>{if(!g||!drag)return;e.preventDefault();sDrop(g);}} onDragLeave={()=>sDrop(null)} onDrop={e=>{e.preventDefault();if(!g||!drag)return;const nd=toIso(g);if(nd!==drag.data)sRip({manut:drag,nuovaData:nd});sDrag(null);sDrop(null);}} onClick={()=>g&&!drag&&onNuovaData(toIso(g))}>
                <div className="cal-day-num" style={isOggi?{background:"var(--navy)",color:"white",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center"}:{}}>{g}</div>
                {hasConf&&<div style={{fontSize:9,color:"#B45309",marginBottom:2,fontWeight:700}}>⚠</div>}
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {att.slice(0,3).map(m=>{const op=operatori.find(o=>o.id===m.operatoreId);return(<div key={m.id} className="cal-event" draggable={m.stato!=="completata"} onDragStart={e=>{sDrag(m);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>{sDrag(null);sDrop(null);}} onClick={e=>e.stopPropagation()} title={m.titolo} style={{background:(op?.col||"#888")+"18",color:op?.col||"#888",borderLeftColor:op?.col||"#888",opacity:drag?.id===m.id?.4:1}}>{m.pianoId?"🔄 ":""}{m.titolo}</div>);})}
                  {att.length>3&&<div style={{fontSize:9,color:"var(--text-3)",paddingLeft:2,fontWeight:600}}>+{att.length-3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {ripModal&&<ModalRipianifica manut={ripModal.manut} nuovaData={ripModal.nuovaData} man={man} operatori={operatori} onConferma={onRipianifica} onClose={()=>sRip(null)} />}
    </div>
  );
}

// ─── Asset ────────────────────────────────────────────────────────────────
function ModalAsset({ ini, clienti, onClose, onSalva, userId }) {
  const [f,sf]=useState(ini||{nome:"",tipo:"",clienteId:"",ubicazione:"",matricola:"",marca:"",modello:"",dataInst:"",stato:"attivo",note:""});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const TIPI=["Impianto elettrico","Linea produzione","Impianto termico","Impianto pneumatico","Impianto idraulico","Sicurezza","Meccanico","Altro"];
  return (
    <Modal title={ini?"Modifica asset":"Nuovo asset"} onClose={onClose} onSave={()=>onSalva({...f,clienteId:f.clienteId?Number(f.clienteId):null})} saveOk={!!f.nome.trim()}>
      <Field label="Nome asset *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="">— Seleziona —</option>{TIPI.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Stato"><select value={f.stato} onChange={e=>s("stato",e.target.value)} style={{width:"100%"}}><option value="attivo">Attivo</option><option value="manutenzione">In manutenzione</option><option value="inattivo">Inattivo</option></select></Field>
      </div>
      <Field label="Cliente"><select value={f.clienteId||""} onChange={e=>s("clienteId",e.target.value?Number(e.target.value):"")} style={{width:"100%"}}><option value="">— Nessun cliente —</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select></Field>
      <Field label="Ubicazione"><input value={f.ubicazione} onChange={e=>s("ubicazione",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <Field label="Matricola"><input value={f.matricola} onChange={e=>s("matricola",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Marca"><input value={f.marca} onChange={e=>s("marca",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Modello"><input value={f.modello} onChange={e=>s("modello",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Data installazione"><input type="date" value={f.dataInst} onChange={e=>s("dataInst",e.target.value)} style={{width:"100%"}} /></Field>
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
      {ini?.id&&<PannelloAllegati entitaTipo="asset" entitaId={ini.id} userId={userId||""} />}
    </Modal>
  );
}

function GestioneAssets({ assets, clienti, manutenzioni, onAgg, onMod, onDel, onQR }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [cerca,sCerca]=useState("");const [fTipo,sfT]=useState("tutti");const [fSt,sfSt]=useState("tutti");
  const tipi=[...new Set(assets.map(a=>a.tipo).filter(Boolean))];
  const filtrati=useMemo(()=>assets.filter(a=>{if(fTipo!=="tutti"&&a.tipo!==fTipo)return false;if(fSt!=="tutti"&&a.stato!==fSt)return false;if(cerca&&!a.nome.toLowerCase().includes(cerca.toLowerCase())&&!(a.matricola||"").toLowerCase().includes(cerca.toLowerCase()))return false;return true;}),[assets,fTipo,fSt,cerca]);
  const STATO_ASSET={attivo:{cls:"badge badge-attivo",l:"Attivo"},manutenzione:{cls:"badge badge-inCorso",l:"In manutenzione"},inattivo:{cls:"badge badge-scaduta",l:"Inattivo"}};
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca asset o matricola..." style={{flex:1,minWidth:140}} />
        <select value={fTipo} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option>{tipi.map(t=><option key={t} value={t}>{t}</option>)}</select>
        <select value={fSt} onChange={e=>sfSt(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="attivo">Attivo</option><option value="manutenzione">In manutenzione</option><option value="inattivo">Inattivo</option></select>
        <button className="btn-primary" onClick={()=>{siM(null);ssM(true);}}>+ Nuovo asset</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {filtrati.map(a=>{const cl=clienti.find(c=>c.id===a.clienteId);const manAss=manutenzioni.filter(m=>m.assetId===a.id);const sc=STATO_ASSET[a.stato]||STATO_ASSET.inattivo;
          return(<div key={a.id} className="asset-card">
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
              <div style={{width:44,height:44,borderRadius:"var(--radius)",background:"var(--blue-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:"1px solid var(--blue-bd)"}}>⚙</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nome}</div><div style={{fontSize:11.5,color:"var(--text-3)",marginTop:2}}>{a.tipo}</div></div>
              <div style={{display:"flex",gap:4}}><button className="btn-sm btn-icon" onClick={()=>{siM(a);ssM(true);}}>✏</button><button className="btn-sm btn-icon" onClick={()=>onQR&&onQR(a)} title="QR Code" style={{fontSize:12}}>QR</button><button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(a.id)}>✕</button></div>
            </div>
            <div style={{display:"grid",gap:4,fontSize:12,color:"var(--text-2)",marginBottom:12}}>
              {cl&&<div style={{color:"#7F77DD",fontWeight:600}}>🏢 {cl.rs}</div>}
              {a.ubicazione&&<div>📍 {a.ubicazione}</div>}
              {a.matricola&&<div>🔖 {a.matricola}{a.marca?` · ${a.marca}`:""}{a.modello?` ${a.modello}`:""}</div>}
              {a.dataInst&&<div>📅 Installato: {fmtData(a.dataInst)}</div>}
            </div>
            {a.note&&<div style={{fontSize:11.5,color:"var(--text-3)",fontStyle:"italic",marginBottom:10}}>{a.note}</div>}
            <div style={{display:"flex",alignItems:"center",gap:8,borderTop:"1px solid var(--border)",paddingTop:10}}>
              <span className={sc.cls}>{sc.l}</span><span style={{flex:1}} />
              <span style={{fontSize:11.5,color:"var(--text-3)",fontWeight:500}}>{manAss.filter(m=>m.stato!=="completata").length} attive · {manAss.length} tot.</span>
            </div>
          </div>);
        })}
      </div>
      {!filtrati.length&&<div className="empty"><div className="empty-icon">⚙</div><div className="empty-text">Nessun asset trovato</div></div>}
      {showM&&<ModalAsset ini={inMod} clienti={clienti} userId={inMod?.userId||""} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

// ─── Piani ────────────────────────────────────────────────────────────────

// Modal Piano Template (solo nome/frequenza/tipo - senza asset/cliente/operatore)
function ModalPiano({ ini, onClose, onSalva, userId }) {
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
function ModalAssegnazione({ ini, piano, clienti, assets, operatori, manutenzioni, onClose, onSalva }) {
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

function GestionePiani({ piani, assegnazioni=[], clienti, assets, manutenzioni, operatori, onAgg, onMod, onDel, onAggAss, onModAss, onDelAss, onAttivaDisattiva }) {
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

// ─── Clienti ──────────────────────────────────────────────────────────────
function ModalCliente({ ini, onClose, onSalva, userId }) {
  const [f,sf]=useState(ini||{rs:"",piva:"",contatto:"",tel:"",email:"",ind:"",settore:"",note:""});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <Modal title={ini?"Modifica cliente":"Nuovo cliente"} onClose={onClose} onSave={()=>onSalva(f)} saveOk={!!f.rs.trim()} saveColor="#7F77DD" saveLabel={ini?"Aggiorna":"Aggiungi"}>
      <Field label="Ragione sociale *"><input value={f.rs} onChange={e=>s("rs",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="P.IVA"><input value={f.piva} onChange={e=>s("piva",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Settore"><input value={f.settore} onChange={e=>s("settore",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Contatto"><input value={f.contatto} onChange={e=>s("contatto",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Telefono"><input value={f.tel} onChange={e=>s("tel",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={e=>s("email",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Indirizzo"><input value={f.ind} onChange={e=>s("ind",e.target.value)} style={{width:"100%"}} /></Field>
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
      {ini?.id&&<PannelloAllegati entitaTipo="cliente" entitaId={ini.id} userId={userId||""} />}
    </Modal>
  );
}

function GestioneClienti({ clienti, manutenzioni, assets, onAgg, onMod, onDel }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [cerca,sCerca]=useState("");
  const filtrati=useMemo(()=>clienti.filter(c=>!cerca||c.rs.toLowerCase().includes(cerca.toLowerCase())||c.contatto.toLowerCase().includes(cerca.toLowerCase())),[clienti,cerca]);
  const BG=["#EEEDFE","#E6F1FB","#ECFDF5","#FEF3C7","#FEF2F2","#F0F4FF"];const TX=["#534AB7","#1E40AF","#065F46","#92400E","#991B1B","#3730A3"];
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca cliente o contatto..." style={{flex:1}} />
        <button style={{color:"#7F77DD",borderColor:"#C4B5FD",background:"#EEEDFE",fontWeight:600}} onClick={()=>{siM(null);ssM(true);}}>+ Nuovo cliente</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {filtrati.map((c,idx)=>{const nAtt=manutenzioni.filter(m=>m.clienteId===c.id&&m.stato!=="completata").length;const nAs=assets.filter(a=>a.clienteId===c.id).length;const ur=manutenzioni.filter(m=>m.clienteId===c.id&&m.priorita==="urgente"&&m.stato!=="completata").length;const ini=c.rs.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
          return(<div key={c.id} className="client-card">
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <div style={{width:46,height:46,borderRadius:"var(--radius)",background:BG[idx%BG.length],display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,color:TX[idx%TX.length],flexShrink:0}}>{ini}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.rs}</div>{c.settore&&<div style={{fontSize:11.5,color:"#7F77DD",fontWeight:500,marginTop:2}}>{c.settore}</div>}</div>
              <div style={{display:"flex",gap:4}}><button className="btn-sm btn-icon" onClick={()=>{siM(c);ssM(true);}}>✏</button><button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(c.id)}>✕</button></div>
            </div>
            <div style={{fontSize:12,color:"var(--text-2)",display:"grid",gap:3,marginBottom:12}}>{c.contatto&&<div>👤 {c.contatto}</div>}{c.tel&&<div>📞 {c.tel}</div>}{c.email&&<div>✉ {c.email}</div>}</div>
            <div style={{display:"flex",borderTop:"1px solid var(--border)",paddingTop:10}}>
              {[{v:nAtt,l:"Attive",c:"#2563EB"},{v:nAs,l:"Asset",c:"var(--text-1)"},{v:ur>0?ur:null,l:"Urgenti",c:"#DC2626"}].map(({v,l,c})=>v!=null?<div key={l} style={{flex:1,textAlign:"center",padding:"4px 0"}}><div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:18,color:c}}>{v}</div><div style={{fontSize:10,color:"var(--text-3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{l}</div></div>:null)}
            </div>
          </div>);
        })}
      </div>
      {showM&&<ModalCliente ini={inMod} userId={inMod?.userId||""} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

// ─── Gestione Utenti ──────────────────────────────────────────────────────
function GestioneUtenti({ operatori, man, clienti, siti, onAgg, onMod, onDel, onSaveSiti, onCreaAccesso }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);
  const [sitiModal,setSitiModal]=useState(null);const [vistaModal,setVistaModal]=useState(null);
  const [accessoModal,setAccessoModal]=useState(null);
  const [filtroTipo,setFiltroTipo]=useState("tutti");
  const assets=[];// passed through but not needed here
  const filtrati=useMemo(()=>operatori.filter(o=>filtroTipo==="tutti"||o.tipo===filtroTipo),[operatori,filtroTipo]);

  return (
    <div style={{display:"grid",gap:12}}>
      {/* Toolbar */}
      <div className="filters">
        <div style={{display:"flex",gap:6}}>
          {["tutti","fornitore","cliente","interno"].map(t=>{
            const label={tutti:"Tutti",fornitore:"Fornitori",cliente:"Clienti",interno:"Interni"}[t];
            const count=t==="tutti"?operatori.length:operatori.filter(o=>o.tipo===t).length;
            return <button key={t} onClick={()=>setFiltroTipo(t)} style={{fontWeight:filtroTipo===t?700:400,background:filtroTipo===t?"var(--navy)":"var(--surface)",color:filtroTipo===t?"white":"var(--text-2)",borderColor:filtroTipo===t?"var(--navy)":"var(--border)",fontSize:12,padding:"5px 12px"}}>{label} <span style={{opacity:.6}}>({count})</span></button>;
          })}
        </div>
        <span style={{flex:1}} />
        <button className="btn-primary" onClick={()=>{siM(null);ssM(true);}}>+ Nuovo utente</button>
      </div>

      {/* Leggenda */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",fontSize:12}}>
        {Object.entries(TIPO_OP).map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:6}}>
            <span className="badge" style={v.style}>{v.label}</span>
            <span style={{color:"var(--text-3)"}}>{k==="fornitore"?"→ assegnabile alle manutenzioni":k==="cliente"?"→ vista limitata ai propri siti":"→ accesso interno"}</span>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {filtrati.map(op=>{
          const sue=man.filter(m=>m.operatoreId===op.id);const att=sue.filter(m=>m.stato!=="completata");
          const ore=Math.round(att.reduce((s,m)=>s+m.durata,0)/60*10)/10;const urg=att.filter(m=>m.priorita==="urgente");
          const mieiSiti=siti.filter(s=>s.operatoreId===op.id);
          const cfg=TIPO_OP[op.tipo]||TIPO_OP.interno;
          return (
            <div key={op.id} className="op-card">
              <div className="op-card-accent" style={{background:op.col}} />
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,marginTop:4}}>
                <Av nome={op.nome} col={op.col} size={44} />
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:14}}>{op.nome}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3}}>
                    <span className="badge" style={cfg.style}>{cfg.label}</span>
                    {op.spec&&<span style={{fontSize:11.5,color:"var(--text-3)"}}>{op.spec}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button className="btn-sm btn-icon" onClick={()=>{siM(op);ssM(true);}}>✏</button>
                  <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(op.id)}>✕</button>
                </div>
              </div>

              {/* Stats (solo fornitori/interni hanno senso) */}
              {op.tipo!=="cliente"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[{v:att.length,l:"Attive",c:op.col},{v:sue.filter(m=>m.stato==="completata").length,l:"Completate",c:"#059669"},{v:ore+"h",l:"Ore"}].map(({v,l,c})=>(
                    <div key={l} className="stat-mini"><div className="stat-mini-value" style={{color:c}}>{v}</div><div className="stat-mini-label">{l}</div></div>
                  ))}
                </div>
              )}

              {/* Siti cliente */}
              {op.tipo==="cliente"&&(
                <div style={{marginBottom:12,padding:"10px 12px",background:mieiSiti.length>0?"#EEEDFE":"var(--surface-2)",borderRadius:"var(--radius-sm)",border:`1px solid ${mieiSiti.length>0?"#C4B5FD":"var(--border)"}`}}>
                  <div style={{fontSize:12,fontWeight:600,color:mieiSiti.length>0?"#4F46E5":"var(--text-3)",marginBottom:mieiSiti.length>0?6:0}}>
                    {mieiSiti.length>0?`🔗 ${mieiSiti.length} sito/i associato/i`:"🔗 Nessun sito associato"}
                  </div>
                  {mieiSiti.slice(0,3).map(s=>{const c=clienti.find(x=>x.id===s.clienteId);return c?<div key={s.id} style={{fontSize:11.5,color:"#6D28D9",marginTop:2}}>· {c.rs}</div>:null;})}
                  {mieiSiti.length>3&&<div style={{fontSize:11,color:"var(--text-3)",marginTop:2}}>+{mieiSiti.length-3} altri</div>}
                </div>
              )}

              {urg.length>0&&<div style={{background:"#FFF1F2",border:"1px solid #FECDD3",borderLeft:"3px solid #EF4444",borderRadius:"var(--radius-sm)",padding:"7px 10px",fontSize:12,color:"#9F1239",marginBottom:10}}>⚡ {urg.length} urgente{urg.length>1?"i":""}</div>}

              {/* Attività recenti (non clienti) */}
              {op.tipo!=="cliente"&&att.slice(0,2).map(m=>(
                <div key={m.id} style={{fontSize:12,padding:"7px 10px",borderRadius:"var(--radius-sm)",background:"var(--surface-2)",border:"1px solid var(--border)",marginBottom:4}}>
                  <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.pianoId?"🔄 ":""}{m.titolo}</div>
                  <div style={{color:"var(--text-3)",fontSize:11,marginTop:2}}>{fmtData(m.data)} · {m.durata} min</div>
                </div>
              ))}
              {op.tipo!=="cliente"&&att.length>2&&<div style={{fontSize:11,color:"var(--text-3)",textAlign:"center",fontWeight:500}}>+{att.length-2} altre attività</div>}
              {op.tipo!=="cliente"&&att.length===0&&<div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"8px 0"}}>Nessuna attività attiva</div>}

              {/* Tema badge */}
              {op.tema&&op.tema!=="navy"&&(
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,padding:"6px 10px",borderRadius:"var(--radius-sm)",background:"var(--surface-2)",border:"1px solid var(--border)"}}>
                  {TEMI.find(t=>t.id===op.tema)&&(
                    <>
                      <div style={{width:16,height:16,borderRadius:3,background:TEMI.find(t=>t.id===op.tema).top,flexShrink:0}} />
                      <div style={{width:8,height:16,borderRadius:2,background:TEMI.find(t=>t.id===op.tema).bot,flexShrink:0}} />
                      <span style={{fontSize:11.5,fontWeight:600,color:"var(--text-2)"}}>Tema: {TEMI.find(t=>t.id===op.tema).nome}</span>
                    </>
                  )}
                </div>
              )}

              {/* Stato accesso */}
              <div style={{marginBottom:10,padding:"7px 10px",borderRadius:"var(--radius-sm)",background:op.email?"#ECFDF5":"var(--surface-2)",border:`1px solid ${op.email?"#A7F3D0":"var(--border)"}`,fontSize:12}}>
                {op.email
                  ? <span style={{color:"#065F46",fontWeight:500}}>✅ Accesso attivo — {op.email}</span>
                  : <span style={{color:"var(--text-3)"}}>⭕ Nessun accesso configurato</span>
                }
              </div>

              {/* Azioni specifiche per tipo */}
              <div style={{borderTop:"1px solid var(--border)",paddingTop:10,marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                {op.tipo==="cliente"&&<>
                  <button className="btn-sm btn-green-outline" style={{flex:1}} onClick={()=>setSitiModal(op)}>🔗 Gestisci siti</button>
                  <button className="btn-sm" style={{flex:1,background:"#EEEDFE",color:"#4F46E5",borderColor:"#C4B5FD"}} onClick={()=>setVistaModal(op)}>👁 Anteprima vista</button>
                </>}
                <button className="btn-sm" style={{flex:1,background:"#FFF7ED",color:"#C2410C",borderColor:"#FED7AA",fontWeight:600}} onClick={()=>setAccessoModal(op)}>
                  🔑 {op.email?"Modifica accesso":"Crea accesso"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!filtrati.length&&<div className="empty"><div className="empty-icon">👥</div><div className="empty-text">Nessun utente trovato</div></div>}

      {showM&&<ModalUtente ini={inMod} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
      {sitiModal&&<ModalSitiCliente operatore={sitiModal} clienti={clienti} siti={siti} onClose={()=>setSitiModal(null)} onSave={onSaveSiti} />}
      {vistaModal&&<VistaCliente operatore={vistaModal} clienti={clienti} assets={[]} manutenzioni={man} piani={[]} siti={siti} onClose={()=>setVistaModal(null)} />}
      {accessoModal&&<ModalCreaAccesso operatore={accessoModal} onClose={()=>setAccessoModal(null)} onSuccess={onCreaAccesso} />}
    </div>
  );
}


// ─── Gestione Gruppi ──────────────────────────────────────────────────────
function ModalGruppo({ ini, onClose, onSalva }) {
  const [f,sf] = useState(ini||{nome:"",descrizione:"",col:"#378ADD"});
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  return (
    <Modal title={ini?"Modifica gruppo":"Nuovo gruppo"} onClose={onClose} onSave={()=>onSalva(f)} saveOk={!!f.nome.trim()} saveLabel={ini?"Aggiorna":"Crea gruppo"}>
      <Field label="Nome gruppo *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} placeholder="Es. Reparto Elettrico..." style={{width:"100%"}} /></Field>
      <Field label="Descrizione"><textarea value={f.descrizione} onChange={e=>s("descrizione",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} placeholder="Descrizione opzionale..." /></Field>
      <Field label="Colore">
        <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:4}}>
          {COLORI_GRUPPI.map(c=><div key={c} className={"color-dot"+(f.col===c?" selected":"")} style={{background:c}} onClick={()=>s("col",c)} />)}
        </div>
      </Field>
    </Modal>
  );
}

function ModalAssegnaGruppo({ gruppo, operatori, clienti, gOps, gSiti, onClose, onSave }) {
  const meiOps   = useMemo(()=>new Set(gOps.filter(g=>g.gruppoId===gruppo.id).map(g=>g.operatoreId)),[gOps,gruppo.id]);
  const meiSiti  = useMemo(()=>new Set(gSiti.filter(g=>g.gruppoId===gruppo.id).map(g=>g.clienteId)),[gSiti,gruppo.id]);
  const [selOps,  setSelOps]  = useState(new Set(meiOps));
  const [selSiti, setSelSiti] = useState(new Set(meiSiti));
  const [tab, setTab] = useState("utenti");

  const toggleOp   = id => setSelOps(p  => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleSito = id => setSelSiti(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  return (
    <Overlay>
      <div className="modal-box" style={{width:"min(580px,96vw)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:14,height:14,borderRadius:"50%",background:gruppo.col,display:"inline-block"}} />
              {gruppo.nome}
            </div>
            <div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>Assegna utenti e siti al gruppo</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:"1px solid var(--border)"}}>
          {[{id:"utenti",l:`Utenti (${selOps.size})`},{id:"siti",l:`Siti (${selSiti.size})`}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{border:"none",borderBottom:tab===t.id?"2px solid var(--navy)":"2px solid transparent",background:"none",padding:"8px 16px",fontWeight:tab===t.id?700:400,color:tab===t.id?"var(--navy)":"var(--text-3)",borderRadius:0,cursor:"pointer",fontSize:13}}>{t.l}</button>
          ))}
        </div>

        <div style={{maxHeight:340,overflowY:"auto",display:"grid",gap:6}}>
          {tab==="utenti"&&operatori.map(o=>{
            const checked=selOps.has(o.id); const cfg=TIPO_OP[o.tipo]||TIPO_OP.interno;
            return (
              <label key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:"var(--radius-sm)",border:`1px solid ${checked?gruppo.col:"var(--border)"}`,background:checked?gruppo.col+"10":"var(--surface)",cursor:"pointer",transition:"all .15s"}}>
                <input type="checkbox" checked={checked} onChange={()=>toggleOp(o.id)} style={{width:15,height:15,cursor:"pointer"}} />
                <Av nome={o.nome} col={o.col} size={28} />
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{o.nome}</div><div style={{fontSize:11,color:"var(--text-3)"}}>{o.spec}</div></div>
                <span className="badge" style={cfg.style}>{cfg.label}</span>
              </label>
            );
          })}
          {tab==="siti"&&clienti.map(c=>{
            const checked=selSiti.has(c.id);
            return (
              <label key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:"var(--radius-sm)",border:`1px solid ${checked?gruppo.col:"var(--border)"}`,background:checked?gruppo.col+"10":"var(--surface)",cursor:"pointer",transition:"all .15s"}}>
                <input type="checkbox" checked={checked} onChange={()=>toggleSito(c.id)} style={{width:15,height:15,cursor:"pointer"}} />
                <div style={{width:32,height:32,borderRadius:"var(--radius-sm)",background:gruppo.col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,color:gruppo.col,flexShrink:0}}>{c.rs.slice(0,2).toUpperCase()}</div>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{c.rs}</div>{c.settore&&<div style={{fontSize:11,color:"var(--text-3)"}}>{c.settore}</div>}</div>
              </label>
            );
          })}
          {tab==="utenti"&&operatori.length===0&&<div style={{textAlign:"center",padding:"24px",color:"var(--text-3)"}}>Nessun utente disponibile</div>}
          {tab==="siti"&&clienti.length===0&&<div style={{textAlign:"center",padding:"24px",color:"var(--text-3)"}}>Nessun sito disponibile</div>}
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Annulla</button>
          <button className="btn-primary" onClick={()=>{onSave(gruppo.id,[...selOps],[...selSiti]);onClose();}}>
            Salva ({selOps.size} utenti, {selSiti.size} siti)
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function GestioneGruppi({ gruppi, operatori, clienti, man, gOps, gSiti, onAgg, onMod, onDel, onSaveAssoc }) {
  const [showM,  ssM]  = useState(false);
  const [inMod,  siM]  = useState(null);
  const [assocModal, setAssoc] = useState(null);
  const [filtroGruppo, setFiltroGruppo] = useState(null); // null = tutti

  // Filtra manutenzioni per gruppo selezionato
  const manFiltrate = useMemo(()=>{
    if (!filtroGruppo) return man;
    const gSitiIds = gSiti.filter(g=>g.gruppoId===filtroGruppo).map(g=>g.clienteId);
    const gOpsIds  = gOps.filter(g=>g.gruppoId===filtroGruppo).map(g=>g.operatoreId);
    return man.filter(m=>gSitiIds.includes(m.clienteId)||gOpsIds.includes(m.operatoreId));
  },[man,filtroGruppo,gSiti,gOps]);

  return (
    <div style={{display:"grid",gap:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:18}}>Gruppi</div>
          <div style={{fontSize:13,color:"var(--text-3)",marginTop:2}}>Organizza utenti e siti in gruppi per filtrare la visibilità</div>
        </div>
        <button className="btn-primary" onClick={()=>{siM(null);ssM(true);}}>+ Nuovo gruppo</button>
      </div>

      {/* Filtro visibilità rapido */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",alignItems:"center"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text-2)"}}>Filtra visibilità:</span>
        <button onClick={()=>setFiltroGruppo(null)} style={{fontSize:12,fontWeight:filtroGruppo===null?700:400,background:filtroGruppo===null?"var(--navy)":"var(--surface)",color:filtroGruppo===null?"white":"var(--text-2)",borderColor:filtroGruppo===null?"var(--navy)":"var(--border)",padding:"4px 12px"}}>
          Tutti ({man.length})
        </button>
        {gruppi.map(g=>{
          const n = gSiti.filter(s=>s.gruppoId===g.id).reduce((acc,s)=>acc+man.filter(m=>m.clienteId===s.clienteId).length,0);
          return (
            <button key={g.id} onClick={()=>setFiltroGruppo(filtroGruppo===g.id?null:g.id)}
              style={{fontSize:12,fontWeight:filtroGruppo===g.id?700:400,background:filtroGruppo===g.id?g.col:"var(--surface)",color:filtroGruppo===g.id?"white":"var(--text-2)",borderColor:filtroGruppo===g.id?g.col:"var(--border)",padding:"4px 12px",display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:filtroGruppo===g.id?"white":g.col,display:"inline-block"}} />
              {g.nome} ({n})
            </button>
          );
        })}
      </div>

      {/* Anteprima manutenzioni filtrate */}
      {filtroGruppo&&(
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"16px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>
            📋 Manutenzioni visibili — {gruppi.find(g=>g.id===filtroGruppo)?.nome} ({manFiltrate.length})
          </div>
          <div style={{display:"grid",gap:6,maxHeight:280,overflowY:"auto"}}>
            {manFiltrate.slice(0,20).map(m=>{
              const op=operatori.find(o=>o.id===m.operatoreId); const cl=clienti.find(c=>c.id===m.clienteId);
              return (
                <div key={m.id} style={{display:"flex",gap:10,padding:"9px 12px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--surface-2)",alignItems:"center"}}>
                  <div style={{width:3,borderRadius:99,background:PRI_COLOR[m.priorita]||"#ccc",alignSelf:"stretch",flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.titolo}</div>
                    <div style={{fontSize:11,color:"var(--text-3)",marginTop:1}}>{fmtData(m.data)}{cl?` · ${cl.rs}`:""}{op?` · ${op.nome}`:""}</div>
                  </div>
                  <span className={"badge badge-"+m.stato} style={{flexShrink:0}}>{STATO_LABEL[m.stato]}</span>
                </div>
              );
            })}
            {manFiltrate.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"var(--text-3)",fontSize:13}}>Nessuna manutenzione per questo gruppo</div>}
            {manFiltrate.length>20&&<div style={{textAlign:"center",fontSize:12,color:"var(--text-3)",padding:"8px 0"}}>... e altre {manFiltrate.length-20}</div>}
          </div>
        </div>
      )}

      {/* Cards gruppi */}
      {!gruppi.length&&<div className="empty"><div className="empty-icon">🗂</div><div className="empty-text">Nessun gruppo. Creane uno per organizzare utenti e siti.</div></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
        {gruppi.map(g=>{
          const gOpIds  = gOps.filter(x=>x.gruppoId===g.id).map(x=>x.operatoreId);
          const gSitiIds= gSiti.filter(x=>x.gruppoId===g.id).map(x=>x.clienteId);
          const opsGruppo  = operatori.filter(o=>gOpIds.includes(o.id));
          const sitiGruppo = clienti.filter(c=>gSitiIds.includes(c.id));
          const manGruppo  = man.filter(m=>gSitiIds.includes(m.clienteId)||gOpIds.includes(m.operatoreId));
          const attive = manGruppo.filter(m=>m.stato!=="completata").length;

          return (
            <div key={g.id} style={{background:"var(--surface)",border:`1px solid var(--border)`,borderTop:`3px solid ${g.col}`,borderRadius:"var(--radius-lg)",padding:"18px 20px",boxShadow:"var(--shadow-sm)",transition:"all .2s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="var(--shadow)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="var(--shadow-sm)"}
            >
              {/* Header */}
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:"var(--radius)",background:g.col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:`1px solid ${g.col}40`}}>🗂</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:15}}>{g.nome}</div>
                  {g.descrizione&&<div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>{g.descrizione}</div>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button className="btn-sm btn-icon" onClick={()=>{siM(g);ssM(true);}}>✏</button>
                  <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(g.id)}>✕</button>
                </div>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[{v:opsGruppo.length,l:"Utenti"},{v:sitiGruppo.length,l:"Siti"},{v:attive,l:"Attività"}].map(({v,l})=>(
                  <div key={l} className="stat-mini">
                    <div className="stat-mini-value" style={{color:g.col,fontSize:18}}>{v}</div>
                    <div className="stat-mini-label">{l}</div>
                  </div>
                ))}
              </div>

              {/* Utenti preview */}
              {opsGruppo.length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Utenti</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {opsGruppo.slice(0,5).map(o=>(
                      <div key={o.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:20,background:o.col+"15",border:`1px solid ${o.col}40`,fontSize:11.5,fontWeight:500,color:o.col}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:o.col,display:"inline-block"}} />{o.nome.split(" ")[0]}
                      </div>
                    ))}
                    {opsGruppo.length>5&&<span style={{fontSize:11,color:"var(--text-3)",alignSelf:"center"}}>+{opsGruppo.length-5}</span>}
                  </div>
                </div>
              )}

              {/* Siti preview */}
              {sitiGruppo.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Siti</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {sitiGruppo.slice(0,4).map(c=>(
                      <span key={c.id} style={{fontSize:11.5,padding:"2px 8px",borderRadius:4,background:g.col+"12",color:g.col,fontWeight:500,border:`1px solid ${g.col}30`}}>{c.rs}</span>
                    ))}
                    {sitiGruppo.length>4&&<span style={{fontSize:11,color:"var(--text-3)",alignSelf:"center"}}>+{sitiGruppo.length-4}</span>}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{borderTop:"1px solid var(--border)",paddingTop:10,display:"flex",gap:6}}>
                <button style={{flex:1,fontSize:12,fontWeight:600,background:g.col+"10",color:g.col,borderColor:g.col+"40"}} onClick={()=>setAssoc(g)}>
                  ⚙ Gestisci membri
                </button>
                <button style={{flex:1,fontSize:12,fontWeight:600}} onClick={()=>setFiltroGruppo(filtroGruppo===g.id?null:g.id)}>
                  {filtroGruppo===g.id?"✓ Filtro attivo":"👁 Filtra vista"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showM&&<ModalGruppo ini={inMod} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
      {assocModal&&<ModalAssegnaGruppo gruppo={assocModal} operatori={operatori} clienti={clienti} gOps={gOps} gSiti={gSiti} onClose={()=>setAssoc(null)} onSave={onSaveAssoc} />}
    </div>
  );
}



// ─── Temi ─────────────────────────────────────────────────────────────────
const TEMI = [
  { id:"navy",   nome:"Navy",   top:"#0D1B2A", bot:"#F59E0B", desc:"Industrial scuro" },
  { id:"slate",  nome:"Slate",  top:"#1E293B", bot:"#6366F1", desc:"Grigio professionale" },
  { id:"forest", nome:"Forest", top:"#052E16", bot:"#22C55E", desc:"Verde bosco" },
  { id:"sunset", nome:"Sunset", top:"#431407", bot:"#F97316", desc:"Caldo arancione" },
  { id:"ocean",  nome:"Ocean",  top:"#0C4A6E", bot:"#0EA5E9", desc:"Azzurro oceano" },
];

function applyTheme(tema) {
  document.documentElement.setAttribute("data-theme", tema||"navy");
}

// ─── Selettore tema ────────────────────────────────────────────────────────
function SelettoreTema({ value, onChange }) {
  return (
    <div>
      <div className="theme-grid">
        {TEMI.map(t=>(
          <div key={t.id} onClick={()=>onChange(t.id)}>
            <div className={"theme-swatch"+(value===t.id?" selected":"")}>
              <div className="theme-swatch-top" style={{background:t.top}} />
              <div className="theme-swatch-bot" style={{background:t.bot}} />
            </div>
            <div className="theme-swatch-label">{t.nome}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal Crea Accesso ────────────────────────────────────────────────────
function ModalCreaAccesso({ operatore, onClose, onSuccess }) {
  const [email,  setEmail]  = useState(operatore.email||"");
  const [pass,   setPass]   = useState("");
  const [pass2,  setPass2]  = useState("");
  const [loading, setLoading] = useState(false);
  const [err,    setErr]    = useState(null);
  const [done,   setDone]   = useState(false);

  const ok = email.trim() && pass.length>=6 && pass===pass2;

  const crea = async () => {
    setLoading(true); setErr(null);
    try {
      // Usa un client separato per non toccare la sessione corrente
      const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
        },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || data.msg || "Errore registrazione");
      }

      const authUserId = data.user?.id || data.id;
      await onSuccess(operatore.id, email.trim(), authUserId);
      setDone(true);
    } catch(e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay>
      <div className="modal-box" style={{width:"min(460px,96vw)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div className="modal-title">🔑 Crea accesso</div>
            <div style={{fontSize:12,color:"var(--text-3)",marginTop:3}}>{operatore.nome}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16,marginBottom:8}}>Accesso creato!</div>
            <div style={{fontSize:13,color:"var(--text-2)",marginBottom:16}}>
              <strong>{email}</strong> può ora accedere all'app.
            </div>
            <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"12px 16px",fontSize:12,color:"var(--text-2)",textAlign:"left"}}>
              <div style={{fontWeight:600,marginBottom:4}}>⚠ Comunica queste credenziali all'utente:</div>
              <div>Email: <strong>{email}</strong></div>
              <div>Password: <strong>{pass}</strong></div>
              <div style={{marginTop:8,fontSize:11,color:"var(--text-3)"}}>Suggerisci di cambiarla al primo accesso.</div>
            </div>
            <button className="btn-primary" onClick={onClose} style={{marginTop:16,width:"100%"}}>Chiudi</button>
          </div>
        ) : (
          <>
            <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:12,color:"var(--text-2)",marginBottom:16}}>
              ℹ Crea le credenziali per permettere a <strong>{operatore.nome}</strong> di accedere all'app con la propria email e password.
            </div>
            <div style={{display:"grid",gap:14}}>
              <Field label="Email *">
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@azienda.it" style={{width:"100%"}} />
              </Field>
              <Field label="Password temporanea * (min. 6 caratteri)">
                <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" style={{width:"100%"}} />
              </Field>
              <Field label="Conferma password *">
                <input type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••••" style={{width:"100%"}}
                  onKeyDown={e=>e.key==="Enter"&&ok&&!loading&&crea()} />
              </Field>
              {pass&&pass2&&pass!==pass2&&(
                <div style={{fontSize:12,color:"var(--red)",fontWeight:500}}>⚠ Le password non coincidono</div>
              )}
              {err&&<div style={{background:"var(--red-bg)",border:"1px solid var(--red-bd)",borderRadius:"var(--radius-sm)",padding:"10px 12px",fontSize:12,color:"var(--red)",fontWeight:500}}>❌ {err}</div>}
            </div>
            <div className="modal-footer">
              <button onClick={onClose}>Annulla</button>
              <button className="btn-primary" disabled={!ok||loading} onClick={crea}>
                {loading?"Creazione...":"🔑 Crea accesso"}
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}


// ─── Gestore Allegati ─────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return "—";
  if (b < 1024) return b + " B";
  if (b < 1024*1024) return (b/1024).toFixed(1) + " KB";
  return (b/(1024*1024)).toFixed(1) + " MB";
}
function iconaFile(mime) {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "📊";
  if (mime.includes("zip") || mime.includes("rar")) return "🗜";
  if (mime.startsWith("video/")) return "🎬";
  return "📄";
}

function GestoreAllegati({ entitaTipo, entitaId, userId }) {
  const [allegati,   setAllegati]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [uploading,  setUploading] = useState(false);
  const [errore,     setErrore]    = useState(null);
  const [successo,   setSuccesso]  = useState(null);
  const [dragOver,   setDragOver]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const inputId = useMemo(() => `file-${entitaTipo}-${entitaId}`, [entitaTipo, entitaId]);

  const uid = userId || "";

  const carica = async () => {
    if (!entitaId) return;
    setLoading(true); setErrore(null);
    const { data, error } = await supabase
      .from("allegati")
      .select("*")
      .eq("entita_tipo", entitaTipo)
      .eq("entita_id", Number(entitaId))
      .order("created_at", { ascending: false });
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        setErrore("⚠ Tabella 'allegati' non trovata. Esegui lo SQL di setup su Supabase.");
      } else {
        setErrore("Errore caricamento: " + error.message);
      }
    } else {
      setAllegati((data||[]).map(mapAllegato));
    }
    setLoading(false);
  };

  useEffect(() => { carica(); }, [entitaId, entitaTipo]);

  const upload = async (files) => {
    if (!files?.length) return;
    if (!uid) { setErrore("Sessione scaduta — ricarica la pagina."); return; }

    setUploading(true); setErrore(null); setSuccesso(null);
    let ok = 0;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        setErrore(`"${file.name}" supera i 20 MB`);
        continue;
      }
      // Sanitizza nome: rimuovi caratteri problematici
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${uid}/${entitaTipo}/${entitaId}/${Date.now()}_${safeName}`;

      // Upload storage
      const { error: upErr } = await supabase.storage
        .from("allegati")
        .upload(path, file, { upsert: false });

      if (upErr) {
        if (upErr.message?.includes("Bucket") || upErr.message?.includes("bucket") || upErr.message?.includes("not found")) {
          setErrore("⚠ Bucket storage 'allegati' non trovato. Vai su Supabase → Storage → Crea bucket 'allegati'.");
        } else if (upErr.message?.includes("row-level") || upErr.message?.includes("policy")) {
          setErrore("⚠ Policy storage mancante. Esegui l'SQL della policy su Supabase.");
        } else {
          setErrore("Errore upload: " + upErr.message);
        }
        continue;
      }

      // Salva record DB
      const { data: row, error: dbErr } = await supabase
        .from("allegati")
        .insert({
          entita_tipo:  entitaTipo,
          entita_id:    Number(entitaId),
          nome:         file.name,
          storage_path: path,
          mime_type:    file.type || "",
          dimensione:   file.size,
          user_id:      uid,
        })
        .select()
        .single();

      if (dbErr) {
        await supabase.storage.from("allegati").remove([path]);
        setErrore("Errore salvataggio DB: " + dbErr.message);
        continue;
      }

      setAllegati(prev => [mapAllegato(row), ...prev]);
      ok++;
    }
    if (ok > 0) setSuccesso(`${ok} file caricato/i ✅`);
    setUploading(false);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files?.length) {
      upload(files);
      // Reset per permettere ricaricamento stesso file
      e.target.value = "";
    }
  };

  const apri = async (a) => {
    const { data, error } = await supabase.storage
      .from("allegati")
      .createSignedUrl(a.storagePath, 120);
    if (error) { setErrore("Impossibile aprire: " + error.message); return; }
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const elimina = async (id) => {
    const a = allegati.find(x => x.id === id);
    if (!a) return;
    setConfirmDel(null);
    const { error: stErr } = await supabase.storage.from("allegati").remove([a.storagePath]);
    const { error: dbErr } = await supabase.from("allegati").delete().eq("id", id);
    if (dbErr) { setErrore("Errore eliminazione: " + dbErr.message); return; }
    setAllegati(prev => prev.filter(x => x.id !== id));
  };

  if (!entitaId) return (
    <div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"8px 0",fontStyle:"italic"}}>
      Salva prima l'elemento per poter aggiungere allegati.
    </div>
  );

  return (
    <div style={{display:"grid",gap:8}} onClick={e=>e.stopPropagation()}>

      {/* Drop zone — usa <label> per max compatibilità mobile */}
      <div
        onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOver(true);}}
        onDragLeave={e=>{e.stopPropagation();setDragOver(false);}}
        onDrop={e=>{e.preventDefault();e.stopPropagation();setDragOver(false);upload(e.dataTransfer.files);}}
        style={{position:"relative"}}
      >
        {/* Input nascosto collegato alla label */}
        <input
          id={inputId}
          type="file"
          multiple
          accept="*/*"
          style={{
            position:"absolute",
            width:1,height:1,
            opacity:0,
            overflow:"hidden",
            zIndex:-1,
          }}
          onChange={handleInputChange}
          disabled={uploading}
        />
        <label
          htmlFor={inputId}
          style={{
            display:"block",
            border:`2px dashed ${dragOver?"var(--amber)":"var(--border-dim)"}`,
            borderRadius:"var(--radius)",
            padding:"18px 16px",
            textAlign:"center",
            cursor:uploading?"not-allowed":"pointer",
            background:dragOver?"rgba(245,158,11,.06)":"transparent",
            transition:"all .15s",
            userSelect:"none",
          }}
        >
          {uploading ? (
            <div style={{fontSize:13,color:"var(--amber)",fontWeight:600}}>⏳ Caricamento in corso...</div>
          ) : (
            <>
              <div style={{fontSize:22,marginBottom:4}}>📎</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text-2)"}}>
                Tocca per selezionare un file
              </div>
              <div style={{fontSize:11,color:"var(--text-3)",marginTop:3}}>
                o trascina qui · max 20 MB
              </div>
            </>
          )}
        </label>
      </div>

      {/* Messaggi errore */}
      {errore&&(
        <div style={{fontSize:12,color:"#DC2626",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:6,padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{flexShrink:0}}>❌</span>
          <div style={{flex:1,lineHeight:1.5}}>{errore}</div>
          <button type="button" onClick={()=>setErrore(null)} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:14,color:"#DC2626",lineHeight:1,flexShrink:0}}>✕</button>
        </div>
      )}

      {/* Messaggio successo */}
      {successo&&(
        <div style={{fontSize:12,color:"#065F46",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:6,padding:"8px 12px",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{flex:1}}>{successo}</span>
          <button type="button" onClick={()=>setSuccesso(null)} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:14,color:"#065F46"}}>✕</button>
        </div>
      )}

      {/* Conferma eliminazione inline */}
      {confirmDel&&(
        <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:6,padding:"10px 12px",fontSize:12,color:"#C2410C",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{flex:1}}>Eliminare <strong>{allegati.find(a=>a.id===confirmDel)?.nome}</strong>?</span>
          <button type="button" onClick={()=>elimina(confirmDel)} style={{background:"#DC2626",color:"white",borderColor:"#DC2626",fontSize:11,padding:"4px 10px",borderRadius:4,border:"none",cursor:"pointer"}}>Sì, elimina</button>
          <button type="button" onClick={()=>setConfirmDel(null)} style={{fontSize:11,padding:"4px 10px",borderRadius:4,border:"1px solid var(--border)",cursor:"pointer",background:"white"}}>Annulla</button>
        </div>
      )}

      {/* Lista allegati */}
      {loading&&<div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"8px 0"}}>⏳ Caricamento...</div>}
      {!loading&&allegati.length===0&&!errore&&(
        <div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"8px 0",fontStyle:"italic"}}>Nessun allegato</div>
      )}
      {allegati.map(a=>(
        <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)"}}>
          <span style={{fontSize:20,flexShrink:0}}>{iconaFile(a.mimeType)}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nome}</div>
            <div style={{fontSize:11,color:"var(--text-3)",marginTop:1}}>{fmtBytes(a.dimensione)} · {fmtData(a.createdAt)}</div>
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            <button type="button" onClick={e=>{e.stopPropagation();apri(a);}} style={{fontSize:11,padding:"4px 8px",background:"#EFF6FF",color:"#1D4ED8",borderColor:"#BFDBFE",borderRadius:4,border:"1px solid",cursor:"pointer"}}>⬇ Apri</button>
            <button type="button" onClick={e=>{e.stopPropagation();setConfirmDel(a.id);}} style={{fontSize:11,padding:"4px 8px",background:"#FEF2F2",color:"#DC2626",borderColor:"#FECACA",borderRadius:4,border:"1px solid",cursor:"pointer"}}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pannello allegati collassabile ──────────────────────────────────────
function PannelloAllegati({ entitaTipo, entitaId, userId }) {
  const [aperto, setAperto] = useState(false);
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!entitaId || !aperto) return;
  }, [entitaId, aperto]);

  return (
    <div style={{borderTop:"1px solid var(--border)",marginTop:14,paddingTop:12}}>
      <button
        type="button"
        onClick={e=>{e.stopPropagation();setAperto(v=>!v);}}
        style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",padding:"4px 0",cursor:"pointer",color:"var(--text-2)",fontWeight:600,fontSize:13,width:"100%",textAlign:"left"}}
      >
        <span style={{fontSize:16}}>📎</span>
        <span>Allegati</span>
        {!aperto&&<span style={{fontSize:11,color:"var(--text-3)",fontWeight:400,marginLeft:4}}>— clicca per aprire</span>}
        <span style={{marginLeft:"auto",fontSize:12,color:"var(--text-3)"}}>{aperto?"▲":"▼"}</span>
      </button>
      {aperto&&(
        <div style={{marginTop:10}} onClick={e=>e.stopPropagation()}>
          <GestoreAllegati entitaTipo={entitaTipo} entitaId={entitaId} userId={userId} />
        </div>
      )}
    </div>
  );
}

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────
const PRIMARY_TABS = [
  {id:"dashboard",    l:"Dashboard",  icon:"◈"},
  {id:"manutenzioni", l:"Attività",   icon:"⚡"},
  {id:"calendario",   l:"Calendario", icon:"📅"},
  {id:"clienti",      l:"Clienti",    icon:"🏢"},
];
const DRAWER_TABS = [
  {id:"piani",       l:"Piani",       icon:"🔄"},
  {id:"assets",      l:"Asset",       icon:"⚙"},
  {id:"utenti",      l:"Utenti",      icon:"👥"},
  {id:"gruppi",      l:"Gruppi",      icon:"🗂"},
  {id:"statistiche", l:"Statistiche", icon:"📊"},
  {id:"kanban",      l:"Kanban",      icon:"🗂"},
  {id:"azienda",     l:"Azienda",     icon:"🏛"},
];

function MobileNav({ vista, sV }) {
  const [drawer, setDrawer] = useState(false);
  const inDrawer = DRAWER_TABS.some(t=>t.id===vista);

  return (
    <>
      <nav className="bottom-nav">
        {PRIMARY_TABS.map(t=>(
          <button key={t.id} className={"bottom-nav-btn"+(vista===t.id?" active":"")}
            onClick={()=>{ sV(t.id); setDrawer(false); }}>
            <span className="bottom-nav-icon">{t.icon}</span>
            <span className="bottom-nav-label">{t.l}</span>
          </button>
        ))}
        <button className={"bottom-nav-btn"+(inDrawer||drawer?" active":"")}
          onClick={()=>setDrawer(d=>!d)}>
          <span className="bottom-nav-icon">{inDrawer?"✓":"≡"}</span>
          <span className="bottom-nav-label">{inDrawer?DRAWER_TABS.find(t=>t.id===vista)?.l:"Altro"}</span>
        </button>
      </nav>

      {drawer&&(
        <>
          <div className="mobile-drawer-overlay" onClick={()=>setDrawer(false)} />
          <div className="mobile-drawer">
            <div className="mobile-drawer-handle" />
            {DRAWER_TABS.map(t=>(
              <button key={t.id} className={"mobile-drawer-item"+(vista===t.id?" active":"")}
                onClick={()=>{ sV(t.id); setDrawer(false); }}>
                <span className="mobile-drawer-icon">{t.icon}</span>
                {t.l}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────
export default function App() {
  const [session,  setSess] = useState(null);
  const [tenant,      setTenant]      = useState(null); // azienda corrente
  const [ruoloTenant, setRuoloTenant] = useState("membro"); // ruolo utente nel tenant
  const aggiornaTenant = t => setTenant(prev => ({...prev, ...t}));
  const [loading,  setLoad] = useState(true);
  const [dbErr,    setDbErr] = useState(null);
  const [man,      sMan]  = useState([]);
  const [clienti,  sCl]   = useState([]);
  const [assets,   sAs]   = useState([]);
  const [piani,    sPi]   = useState([]);
  const [operatori,sOp]   = useState([]);
  const [assegnazioni, sAss] = useState([]);
  const [siti,     sSiti] = useState([]);
  const [gruppi,   sGruppi]= useState([]);
  const [gOps,     sGOps]  = useState([]);
  const [gSiti,    sGSiti] = useState([]);
  const [vista,   sV]  = useState("dashboard");
  const [filtroMan, setFiltroMan] = useState({});
  const [modalM,  sMM] = useState(false);
  const [inModM,  siMM]= useState(null);
  const [dataDef, sDD] = useState("");
  const [temaModal, setTemaModal] = useState(false);
  const [temaCorrente, setTemaCorrente] = useState("navy");
  const [chiudiModal, setChiudiModal] = useState(null); // manutenzione da chiudere
  const [ricercaAperta, setRicercaAperta] = useState(false);
  const [qrAsset, setQrAsset] = useState(null);
  const [vistaLista, setVistaLista] = useState("lista"); // lista | kanban
  const [toast,   sToast] = useState(null);
  const notify = (msg,type="error") => sToast({msg,type});
  const [sidebarOpen, setSidebar] = useState(false);

  // Apply default theme on mount
  useEffect(() => { applyTheme("navy"); }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K per ricerca globale
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setRicercaAperta(v => !v);
      }
      if (e.key === "Escape") setRicercaAperta(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSess(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) { setLoad(true); setSess(s); }
      else { setSess(null); setTenant(null); setRuoloTenant("membro"); sMan([]); sCl([]); sAs([]); sPi([]); sAss([]); sOp([]); sSiti([]); sGruppi([]); sGOps([]); sGSiti([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setLoad(false); return; }
    // Se non abbiamo ancora il tenant, cercalo prima di caricare i dati
    if (!tenant) {
      setLoad(true);
      supabase.from("tenant_users")
        .select("tenant_id, ruolo, tenants(id, nome, logo_url, piva, indirizzo, citta, cap, tel, email, sito)")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) { console.error("Errore tenant:", error); setLoad(false); return; }
          if (data?.tenants) {
            setTenant(data.tenants);
            setRuoloTenant(data.ruolo || "membro");
          } else {
            setLoad(false); // nessun tenant → mostra onboarding
          }
        });
      return; // aspetta che setTenant scatti il prossimo useEffect
    }
    setLoad(true);
    Promise.all([
      supabase.from("operatori").select("*").order("created_at"),
      supabase.from("clienti").select("*").order("created_at"),
      supabase.from("assets").select("*").order("created_at"),
      supabase.from("piani").select("*").order("created_at"),
      supabase.from("manutenzioni").select("*").order("data"),
      supabase.from("operatore_siti").select("*").order("created_at"),
      supabase.from("gruppi").select("*").order("created_at"),
      supabase.from("gruppo_operatori").select("*").order("created_at"),
      supabase.from("gruppo_siti").select("*").order("created_at"),
    ]).then(async ([ro, rc, ra, rp, rm, rs, rg, rgo, rgs]) => {
      if (ro.error||rc.error||ra.error||rp.error||rm.error) {
        setDbErr("Errore caricamento dati. Esegui schema.sql (v3) su Supabase.");
        setLoad(false); return;
      }
      const mappedOps = (ro.data||[]).map(mapOp);
      sOp(mappedOps);
      // Applica tema dell'utente loggato se presente
      const meOp = mappedOps.find(o => o.email === session?.user?.email);
      if (meOp?.tema) { applyTheme(meOp.tema); setTemaCorrente(meOp.tema); }
      sCl((rc.data||[]).map(mapC)); sAs((ra.data||[]).map(mapA)); sPi((rp.data||[]).map(mapP)); sMan((rm.data||[]).map(mapM));
      // Carica assegnazioni separatamente (tabella nuova - non blocca se fallisce)
      supabase.from("piano_assegnazioni").select("*").order("created_at")
        .then(({data,error}) => { if(!error && data) sAss(data.map(mapAss)); });
      sSiti((rs.data||[]).map(mapSito));
      sGruppi((rg.data||[]).map(mapGruppo));
      sGOps((rgo.data||[]).map(mapGOp));
      sGSiti((rgs.data||[]).map(mapGSito));
      setLoad(false);
    }).catch(err => {
      console.error('Errore caricamento dati:', err);
      setDbErr('Errore di rete. Controlla la connessione e ricarica.');
      setLoad(false);
    });
  }, [session, tenant]);

  const uid = () => session?.user?.id;
  const UID = session?.user?.id || "";
  const BATCH = 50;
  const buildRowM = (piano, ass, data, nIntervento=1) => ({ titolo:piano.nome, tipo:piano.tipo||"ordinaria", stato:"pianificata", priorita:piano.priorita||"media", operatore_id:ass?.operatoreId||null, cliente_id:ass?.clienteId||null, asset_id:ass?.assetId||null, piano_id:piano.id, assegnazione_id:ass?.id||null, data, durata:Number(piano.durata)||60, note:piano.descrizione||"", user_id:uid(), numero_intervento:nIntervento });

  const aggM = async f => { const {data,error}=await supabase.from("manutenzioni").insert(toDbM(f,uid())).select().single(); if(!error)sMan(p=>[...p,mapM(data)]); };
  const modM = async f => { const {error}=await supabase.from("manutenzioni").update(toDbM(f,uid())).eq("id",f.id); if(!error)sMan(p=>p.map(m=>m.id===f.id?{...m,...f}:m)); };
  const delM = async id => { await supabase.from("manutenzioni").delete().eq("id",id); sMan(p=>p.filter(m=>m.id!==id)); };
  const statoM = async (id,stato) => { await supabase.from("manutenzioni").update({stato}).eq("id",id); sMan(p=>p.map(m=>m.id===id?{...m,stato}:m)); };
  const ripiM = async (id,data,operatoreId) => { const m=man.find(x=>x.id===id);const ns=m?.stato==="scaduta"?"pianificata":m?.stato; await supabase.from("manutenzioni").update({data,operatore_id:operatoreId||null,stato:ns}).eq("id",id); sMan(p=>p.map(x=>x.id===id?{...x,data,operatoreId,stato:ns}:x)); };
  const aggC = async f => { const {data,error}=await supabase.from("clienti").insert(toDbC(f,uid())).select().single(); if(error)notify("Errore: "+error.message); else sCl(p=>[...p,mapC(data)]); };
  const modC = async f => { await supabase.from("clienti").update(toDbC(f,uid())).eq("id",f.id); sCl(p=>p.map(c=>c.id===f.id?{...c,...f}:c)); };
  const delC = async id => { await supabase.from("clienti").delete().eq("id",id); sCl(p=>p.filter(c=>c.id!==id)); };
  const aggA = async f => { const {data,error}=await supabase.from("assets").insert(toDbA(f,uid())).select().single(); if(!error)sAs(p=>[...p,mapA(data)]); };
  const modA = async f => { await supabase.from("assets").update(toDbA(f,uid())).eq("id",f.id); sAs(p=>p.map(a=>a.id===f.id?{...a,...f}:a)); };
  const delA = async id => { await supabase.from("assets").delete().eq("id",id); sAs(p=>p.filter(a=>a.id!==id)); };
  const aggOp = async f => { const {data,error}=await supabase.from("operatori").insert(toDbOp(f,uid())).select().single(); if(!error)sOp(p=>[...p,mapOp(data)]); };
  const modOp = async f => {
    const {error}=await supabase.from("operatori").update(toDbOp(f,uid())).eq("id",f.id);
    if(!error) sOp(p=>p.map(o=>o.id===f.id?{...o,...f}:o));
  };
  const creaAccesso = async (opId, email, authUserId) => {
    await supabase.from("operatori").update({ email, auth_user_id: authUserId||null }).eq("id", opId);
    sOp(p=>p.map(o=>o.id===opId?{...o,email,authUserId:authUserId||null}:o));
    notify(`Accesso creato per ${email}`, "success");
  };
  const delOp = async id => { await supabase.from("operatori").delete().eq("id",id); sOp(p=>p.filter(o=>o.id!==id)); sSiti(p=>p.filter(s=>s.operatoreId!==id)); };

  // Salva associazioni siti per un operatore cliente
  const saveSiti = async (operatoreId, clienteIds) => {
    // Elimina le vecchie associazioni
    await supabase.from("operatore_siti").delete().eq("operatore_id", operatoreId);
    sSiti(p=>p.filter(s=>s.operatoreId!==operatoreId));
    if (!clienteIds.length) return;
    const rows = clienteIds.map(cliente_id=>({ operatore_id:operatoreId, cliente_id, user_id:uid() }));
    const {data,error} = await supabase.from("operatore_siti").insert(rows).select();
    if (!error&&data) sSiti(p=>[...p,...data.map(mapSito)]);
  };

  // ── Gruppi ───────────────────────────────────────────────────────────────
  const aggGruppo = async f => {
    const {data,error}=await supabase.from("gruppi").insert(toDbGruppo(f,uid())).select().single();
    if(error){ notify("Errore salvataggio gruppo: "+error.message+". Hai eseguito schema_v3.sql su Supabase?"); return; }
    sGruppi(p=>[...p,mapGruppo(data)]); notify("Gruppo creato con successo","success");
  };
  const modGruppo = async f => {
    const {error}=await supabase.from("gruppi").update(toDbGruppo(f,uid())).eq("id",f.id);
    if(error){ notify("Errore aggiornamento gruppo: "+error.message); return; }
    sGruppi(p=>p.map(g=>g.id===f.id?{...g,...f}:g)); notify("Gruppo aggiornato","success");
  };
  const delGruppo = async id => {
    await supabase.from("gruppi").delete().eq("id",id);
    sGruppi(p=>p.filter(g=>g.id!==id));
    sGOps(p=>p.filter(g=>g.gruppoId!==id));
    sGSiti(p=>p.filter(g=>g.gruppoId!==id));
  };
  const saveAssocGruppo = async (gruppoId, opIds, sitoIds) => {
    const {error:e1}=await supabase.from("gruppo_operatori").delete().eq("gruppo_id", gruppoId);
    const {error:e2}=await supabase.from("gruppo_siti").delete().eq("gruppo_id", gruppoId);
    if(e1||e2){ notify("Errore: "+(e1||e2).message+". Hai eseguito schema_v3.sql su Supabase?"); return; }
    sGOps(p=>p.filter(g=>g.gruppoId!==gruppoId));
    sGSiti(p=>p.filter(g=>g.gruppoId!==gruppoId));
    if (opIds.length) {
      const rows=opIds.map(operatore_id=>({gruppo_id:gruppoId,operatore_id,user_id:uid()}));
      const {data}=await supabase.from("gruppo_operatori").insert(rows).select();
      if(data)sGOps(p=>[...p,...data.map(mapGOp)]);
    }
    if (sitoIds.length) {
      const rows=sitoIds.map(cliente_id=>({gruppo_id:gruppoId,cliente_id,user_id:uid()}));
      const {data}=await supabase.from("gruppo_siti").insert(rows).select();
      if(data)sGSiti(p=>[...p,...data.map(mapGSito)]);
    }
  };

  // Crea piano template (senza asset/cliente/operatore)
  const aggPiano = async f => {
    const {data:pianoRow,error:pErr}=await supabase.from("piani").insert(toDbP(f,uid())).select().single();
    if(pErr){console.error(pErr);notify("Errore creazione piano: "+pErr.message);return;}
    const np=mapP(pianoRow); sPi(p=>[...p,np]);
    notify("Piano creato. Ora aggiungi un'assegnazione per generare le attività.", "success");
  };

  // Crea assegnazione piano → asset e genera occorrenze
  const aggAssegnazione = async f => {
    const ass={...f,pianoId:Number(f.pianoId),assetId:f.assetId?Number(f.assetId):null,clienteId:f.clienteId?Number(f.clienteId):null,operatoreId:f.operatoreId?Number(f.operatoreId):null};
    const {data:assRow,error:aErr}=await supabase.from("piano_assegnazioni").insert(toDbAss(ass,uid())).select().single();
    if(aErr){console.error(aErr);notify("Errore assegnazione: "+aErr.message);return;}
    const na=mapAss(assRow); sAss(p=>[...p,na]);
    // Genera occorrenze per questa assegnazione
    const piano=piani.find(p=>p.id===na.pianoId);
    if(!piano||!na.dataInizio)return;
    const occ=generaOccorrenze(piano,na.dataInizio,12); if(!occ.length)return;
    let saved=[];
    for(let i=0;i<occ.length;i+=BATCH){const {data:chunk,error:e}=await supabase.from("manutenzioni").insert(occ.slice(i,i+BATCH).map((d,j)=>buildRowM(piano,na,d,i+j+1))).select();if(e){console.error(e);break;}if(chunk)saved=[...saved,...(chunk||[]).map(mapM)];}
    if(saved.length){sMan(p=>[...p,...saved]);notify(`${saved.length} attività generate!`,"success");}
  };

  // Modifica assegnazione
  const modAssegnazione = async f => {
    const upd={...f,operatoreId:f.operatoreId?Number(f.operatoreId):null,clienteId:f.clienteId?Number(f.clienteId):null,assetId:f.assetId?Number(f.assetId):null};
    const {error}=await supabase.from("piano_assegnazioni").update(toDbAss(upd,uid())).eq("id",upd.id);
    if(error){console.error(error);return;}
    sAss(p=>p.map(a=>a.id===upd.id?upd:a));
    // Rigenera attività future
    const piano=piani.find(p=>p.id===upd.pianoId);
    if(!piano)return;
    const oggi=isoDate(new Date());
    await supabase.from("manutenzioni").delete().eq("assegnazione_id",upd.id).eq("stato","pianificata");
    sMan(prev=>prev.filter(m=>m.assegnazioneId!==upd.id||m.stato==="completata"||m.stato==="inCorso"));
    const dp=upd.dataInizio>oggi?upd.dataInizio:oggi;
    const occ=generaOccorrenze(piano,dp,12); if(!occ.length)return;
    const completati=man.filter(m=>m.assegnazioneId===upd.id&&m.stato==="completata").length;
    let saved=[];
    for(let i=0;i<occ.length;i+=BATCH){const {data:chunk,error:e}=await supabase.from("manutenzioni").insert(occ.slice(i,i+BATCH).map((d,j)=>buildRowM(piano,upd,d,completati+i+j+1))).select();if(e){console.error(e);break;}if(chunk)saved=[...saved,...(chunk||[]).map(mapM)];}
    if(saved.length)sMan(p=>[...p,...saved]);
  };

  // Elimina assegnazione
  const delAssegnazione = async id => {
    await supabase.from("manutenzioni").delete().eq("assegnazione_id",id).eq("stato","pianificata");
    await supabase.from("piano_assegnazioni").delete().eq("id",id);
    sAss(p=>p.filter(a=>a.id!==id));
    sMan(p=>p.filter(m=>m.assegnazioneId!==id||m.stato==="completata"||m.stato==="inCorso"));
  };
  const modPiano = async f => {
    const {error}=await supabase.from("piani").update(toDbP(f,uid())).eq("id",f.id);
    if(error){console.error(error);return;}
    sPi(p=>p.map(pi=>pi.id===f.id?{...pi,...f}:pi));
  };
  const delPiano = async id => { await supabase.from("piano_assegnazioni").delete().eq("piano_id",id); await supabase.from("manutenzioni").delete().eq("piano_id",id); await supabase.from("piani").delete().eq("id",id); sPi(p=>p.filter(pi=>pi.id!==id)); sAss(p=>p.filter(a=>a.pianoId!==id)); sMan(p=>p.filter(m=>m.pianoId!==id)); };
  const attivaDisattiva = async (id,attivo) => { await supabase.from("piano_assegnazioni").update({attivo}).eq("id",id); sAss(p=>p.map(a=>a.id===id?{...a,attivo}:a)); };

  const apriConData = d => { sDD(d); siMM(null); sMM(true); };

  // Chiudi intervento con firma
  const salvaChiusura = async (dati) => {
    const { id, stato, note_chiusura, ore_effettive, parti_usate, firma_svg, chiuso_at } = dati;
    const { error } = await supabase.from("manutenzioni").update({
      stato, note_chiusura, ore_effettive, parti_usate, firma_svg, chiuso_at,
    }).eq("id", id);
    if (!error) {
      sMan(p => p.map(m => m.id === id ? {
        ...m, stato, noteChiusura: note_chiusura,
        oreEffettive: ore_effettive, partiUsate: parti_usate,
        firmaSvg: firma_svg, chiusoAt: chiuso_at,
      } : m));
      // Log
      const meOp = operatori.find(o => o.email === session?.user?.email);
      await logAction(supabase, "manutenzione", id, "completato", { ore_effettive }, meOp?.nome || "", uid());
      notify("Intervento chiuso con successo ✅", "success");
    }
  };
  const navigateTo = (tab, filters={}) => {
    setFiltroMan(filters);
    sV(tab);
    window.scrollTo({top:0, behavior:"smooth"});
  };
  const apriModM   = m => { siMM({...m, userId:uid()}); sDD(""); sMM(true); };
  const logout     = () => supabase.auth.signOut();

  // Dichiarate prima delle guard per poterle usare nel useMemo (Rules of Hooks)
  // Notifiche - useMemo PRIMA di tutti i return condizionali (Rules of Hooks)
  const notifiche = useMemo(() => {
    if (!session || !man.length) return [];
    const oggi_ = isoDate(new Date());
    const result = [];
    const meOp = operatori.find(o => o.email === session?.user?.email);
    const mieM = meOp?.tipo === "fornitore" ? man.filter(m => m.operatoreId === meOp.id) : man;
    mieM.filter(m => m.stato !== "completata").forEach(m => {
      if (m.data < oggi_) result.push({ id:`sc_${m.id}`, tipo:"scaduta", titolo:"Attività scaduta", testo:m.titolo, data:m.data, manId:m.id, icon:"🔴" });
      else if (m.data === oggi_) result.push({ id:`og_${m.id}`, tipo:"oggi", titolo:"Attività per oggi", testo:m.titolo, data:m.data, manId:m.id, icon:"📅" });
      if (m.priorita === "urgente") result.push({ id:`ur_${m.id}`, tipo:"urgente", titolo:"⚡ Urgente", testo:m.titolo, data:m.data, manId:m.id, icon:"⚡" });
    });
    const seen = new Set();
    return result.filter(n => { if(seen.has(n.manId)) return false; seen.add(n.manId); return true; }).slice(0, 20);
  }, [man, operatori, session]);

  if (!session) return <Auth />;
  if (!tenant && !loading) return <Onboarding session={session} onTenantReady={t => { setTenant(t); }} />;

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">🔧</div>
      <div style={{fontFamily:"var(--font-head)",fontSize:22,fontWeight:700,color:"white"}}>ManuMan</div>
      <div className="loading-text">Caricamento in corso…</div>
    </div>
  );

  if (dbErr) return (
    <div className="error-screen">
      <div className="error-box">
        <div style={{fontSize:28,marginBottom:12}}>⚠️</div>
        <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:18,marginBottom:8}}>Errore database</div>
        <div style={{fontSize:13,color:"var(--red)",marginBottom:8}}>{dbErr}</div>
        <div style={{fontSize:12,color:"var(--text-3)"}}>Esegui <strong>schema.sql</strong> (v2) nel SQL Editor di Supabase, poi ricarica.</div>
        <button className="btn-primary" onClick={logout} style={{marginTop:16}}>Logout</button>
      </div>
    </div>
  );

  const fornitori = operatori.filter(o=>o.tipo==="fornitore");
  const meOperatore = operatori.find(o => o.email === session?.user?.email);
  const ruolo = meOperatore?.tipo || "admin";

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebar(false)} />}
      <aside className={"sidebar"+(sidebarOpen?" open":"")}>

        {/* ── Logo ── */}
        <div className="sb-logo">
          {tenant?.logo_url
            ? <img src={tenant.logo_url} className="sb-logo-img" alt={tenant.nome} />
            : <div className="sb-logo-icon">🔧</div>
          }
          <div className="sb-logo-text">
            <span className="sb-brand">{tenant?.nome || "ManuMan"}</span>
            {tenant?.nome && <span className="sb-tenant">Gestione Manutenzioni</span>}
          </div>
          <button className="sb-close" onClick={()=>setSidebar(false)}>✕</button>
        </div>

        {/* ── Nuova attività ── */}
        <div className="sb-new-wrap">
          <button className="sb-new-btn" onClick={()=>{siMM(null);sDD("");sMM(true);setSidebar(false);}}>
            <span>＋</span> Nuova attività
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">
          {TABS.map(t=>(
            <button key={t.id} className={"sb-item"+(vista===t.id?" active":"")}
              onClick={()=>{ sV(t.id); setSidebar(false); }}>
              <span className="sb-icon">{t.icon}</span>
              <span className="sb-label">{t.l}</span>
            </button>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sb-footer">
          {(() => {
            const me = operatori.find(o=>o.email===session?.user?.email);
            const email = session?.user?.email || "";
            const initials = me ? me.nome.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase() : email.slice(0,2).toUpperCase();
            const col = me?.col || "#8BA3B8";
            return (
              <div className="sb-user">
                <div className="sb-avatar" style={{background:col+"25",border:`1.5px solid ${col}`,color:col}}>{initials}</div>
                <div className="sb-user-info">
                  <span className="sb-user-name">{me?.nome || email.split("@")[0]}</span>
                  <span className="sb-user-role">{me?.tipo==="fornitore"?"Fornitore":me?.tipo==="cliente"?"Cliente":"Admin"}</span>
                </div>
              </div>
            );
          })()}
          <div className="sb-footer-actions">
            <button className="sb-action" onClick={()=>setRicercaAperta(true)} title="Ricerca">🔍</button>
            <CampanellaNotifiche notifiche={notifiche} onNavigate={navigateTo} />
            <button className="sb-action" onClick={()=>setTemaModal(true)} title="Tema">🎨</button>
            <button className="sb-action sb-logout" onClick={logout} title="Esci">↩</button>
          </div>
        </div>

      </aside>

      <div className="sidebar-body">
        <header className="mini-topbar">
          <button className="hamburger-btn" onClick={()=>setSidebar(v=>!v)}>
            <span>☰</span>
          </button>
          <div className="mini-topbar-center">
            {tenant?.logo_url && <img src={tenant.logo_url} alt="" style={{height:24,maxWidth:64,objectFit:"contain",borderRadius:3,opacity:.9}} />}
            <span className="mini-topbar-title">{TABS.find(t=>t.id===vista)?.icon} {TABS.find(t=>t.id===vista)?.l}</span>
          </div>
          <div className="mini-topbar-right">
            <CampanellaNotifiche notifiche={notifiche} onNavigate={navigateTo} />
            <button className="btn-new" onClick={()=>{siMM(null);sDD("");sMM(true);}}>+ Nuova</button>
          </div>
        </header>
        <main className="page-content">
        {vista==="dashboard"    && (
          ruolo === "fornitore" && meOperatore
            ? <DashboardFornitore me={meOperatore} man={man} clienti={clienti} assets={assets} onStato={statoM} onApriChiudi={m=>setChiudiModal(m)} />
            : <Dashboard man={man} clienti={clienti} assets={assets} piani={piani} operatori={operatori} onNavigate={navigateTo} />
        )}
        {vista==="manutenzioni" && <ListaManut   man={man} clienti={clienti} assets={assets} operatori={operatori} onStato={statoM} onDel={delM} onMod={apriModM} initialFilters={filtroMan} key={JSON.stringify(filtroMan)}
          onChiudi={m=>setChiudiModal(m)}
          onVerbale={m=>stampaVerbale(m, clienti.find(c=>c.id===m.clienteId), assets.find(a=>a.id===m.assetId), operatori.find(o=>o.id===m.operatoreId))}
        />}
        {vista==="piani"        && <GestionePiani piani={piani} assegnazioni={assegnazioni} clienti={clienti} assets={assets} manutenzioni={man} operatori={operatori} onAgg={aggPiano} onMod={modPiano} onDel={delPiano} onAggAss={aggAssegnazione} onModAss={modAssegnazione} onDelAss={delAssegnazione} onAttivaDisattiva={attivaDisattiva} />}
        {vista==="calendario"   && <Calendario   man={man} clienti={clienti} assets={assets} operatori={operatori} onRipianifica={ripiM} onNuovaData={apriConData} />}
        {vista==="assets"       && <GestioneAssets assets={assets} clienti={clienti} manutenzioni={man} onAgg={aggA} onMod={modA} onDel={delA} onQR={a=>setQrAsset(a)} />}
        {vista==="utenti"       && <GestioneUtenti operatori={operatori} man={man} clienti={clienti} siti={siti} onAgg={aggOp} onMod={modOp} onDel={delOp} onSaveSiti={saveSiti} onCreaAccesso={creaAccesso} />}
        {vista==="gruppi"       && <GestioneGruppi gruppi={gruppi} operatori={operatori} clienti={clienti} man={man} gOps={gOps} gSiti={gSiti} onAgg={aggGruppo} onMod={modGruppo} onDel={delGruppo} onSaveAssoc={saveAssocGruppo} />}
        {vista==="clienti"      && <GestioneClienti clienti={clienti} manutenzioni={man} assets={assets} onAgg={aggC} onMod={modC} onDel={delC} />}
        {vista==="statistiche"  && <Statistiche man={man} clienti={clienti} assets={assets} piani={piani} operatori={operatori} />}
        {vista==="kanban"       && <KanbanView man={man} clienti={clienti} assets={assets} operatori={operatori} onStato={statoM} onMod={apriModM} />}
        {vista==="azienda"      && <Azienda tenant={tenant} session={session} operatori={operatori} ruoloTenant={ruoloTenant} onTenantUpdate={aggiornaTenant} />}
      </main>

      {chiudiModal && (
        <ChiudiIntervento
          manutenzione={chiudiModal}
          cliente={clienti.find(c=>c.id===chiudiModal.clienteId)}
          asset={assets.find(a=>a.id===chiudiModal.assetId)}
          onClose={()=>setChiudiModal(null)}
          onSalva={salvaChiusura}
        />
      )}
      {ricercaAperta && (
        <RicercaGlobale
          man={man} clienti={clienti} assets={assets} piani={piani} operatori={operatori}
          onNavigate={navigateTo}
          onClose={()=>setRicercaAperta(false)}
        />
      )}
      {qrAsset && <QRCodeAsset asset={qrAsset} onClose={()=>setQrAsset(null)} />}
      {temaModal&&(
        <Overlay>
          <div className="modal-box" style={{width:"min(420px,94vw)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div className="modal-title">🎨 Tema colore</div>
              <button className="modal-close" onClick={()=>setTemaModal(false)}>✕</button>
            </div>
            <div style={{display:"grid",gap:14}}>
              <SelettoreTema value={temaCorrente} onChange={t=>{setTemaCorrente(t);applyTheme(t);}} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                {TEMI.map(t=>(
                  <div key={t.id} onClick={()=>{setTemaCorrente(t.id);applyTheme(t.id);}}
                    style={{padding:"10px 12px",borderRadius:"var(--radius-sm)",border:`2px solid ${temaCorrente===t.id?"var(--text-1)":"var(--border)"}`,cursor:"pointer",transition:"all .15s",background:temaCorrente===t.id?"var(--surface-2)":"var(--surface)"}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                      <div style={{width:14,height:14,borderRadius:3,background:t.top}} />
                      <div style={{width:8,height:14,borderRadius:2,background:t.bot}} />
                      <span style={{fontWeight:700,fontSize:13}}>{t.nome}</span>
                      {temaCorrente===t.id&&<span style={{marginLeft:"auto",fontSize:11,color:"var(--green)",fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{fontSize:11,color:"var(--text-3)"}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setTemaModal(false)}>Chiudi</button>
            </div>
          </div>
        </Overlay>
      )}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDismiss={()=>sToast(null)} />}
      {modalM && <ModalManut
        ini={inModM?{...inModM}:dataDef?{titolo:"",tipo:"ordinaria",priorita:"media",operatoreId:fornitori[0]?.id||"",clienteId:null,assetId:null,data:dataDef,durata:60,note:"",stato:"pianificata",pianoId:null}:null}
        clienti={clienti} assets={assets} manutenzioni={man} operatori={operatori}
        userId={UID}
        onClose={()=>{sMM(false);siMM(null);}}
        onSalva={f=>inModM?modM({...f,id:inModM.id}):aggM(f)}
      />}
      </div>{/* sidebar-body */}
    </div>
  );
}
