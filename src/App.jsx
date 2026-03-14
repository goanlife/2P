import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";

// ─── Costanti ────────────────────────────────────────────────────────────────
const OPERATORI = [
  { id: 1, nome: "Marco Rossi",   spec: "Elettrico",  col: "#378ADD" },
  { id: 2, nome: "Laura Bianchi", spec: "Meccanico",  col: "#1D9E75" },
  { id: 3, nome: "Giorgio Ferri", spec: "Idraulico",  col: "#D85A30" },
  { id: 4, nome: "Anna Conti",    spec: "Generico",   col: "#7F77DD" },
];
const GIORNI = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const MESI   = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const COLORI = {
  ordinaria:    { bg:"#E1F5EE", tx:"#0F6E56", bd:"#5DCAA5" },
  straordinaria:{ bg:"#FAECE7", tx:"#993C1D", bd:"#F0997B" },
  pianificata:  { bg:"#E6F1FB", tx:"#185FA5", bd:"#85B7EB" },
  inCorso:      { bg:"#FAEEDA", tx:"#854F0B", bd:"#EF9F27" },
  completata:   { bg:"#EAF3DE", tx:"#3B6D11", bd:"#97C459" },
  scaduta:      { bg:"#FCEBEB", tx:"#A32D2D", bd:"#F09595" },
};
const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7   },
  { v:"mensile",     l:"Mensile",     giorni:30  },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60  },
  { v:"trimestrale", l:"Trimestrale", giorni:90  },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];

// ─── Mappers DB ↔ Frontend ────────────────────────────────────────────────────
const mapM = r => ({ id:r.id, titolo:r.titolo, tipo:r.tipo, stato:r.stato, priorita:r.priorita, operatoreId:r.operatore_id, clienteId:r.cliente_id, assetId:r.asset_id, pianoId:r.piano_id, data:r.data, durata:r.durata, note:r.note||"" });
const mapC = r => ({ id:r.id, rs:r.rs, piva:r.piva||"", contatto:r.contatto||"", tel:r.tel||"", email:r.email||"", ind:r.ind||"", settore:r.settore||"", note:r.note||"" });
const mapA = r => ({ id:r.id, nome:r.nome, tipo:r.tipo||"", clienteId:r.cliente_id, ubicazione:r.ubicazione||"", matricola:r.matricola||"", marca:r.marca||"", modello:r.modello||"", dataInst:r.data_inst||"", stato:r.stato||"attivo", note:r.note||"" });
const mapP = r => ({ id:r.id, nome:r.nome, descrizione:r.descrizione||"", assetId:r.asset_id, clienteId:r.cliente_id, operatoreId:r.operatore_id, tipo:r.tipo||"ordinaria", frequenza:r.frequenza||"mensile", durata:r.durata||60, priorita:r.priorita||"media", dataInizio:r.data_inizio||"", dataFine:r.data_fine||"", attivo:r.attivo });

const toDbM = (f, uid) => ({ titolo:f.titolo, tipo:f.tipo, stato:f.stato||"pianificata", priorita:f.priorita, operatore_id:f.operatoreId||null, cliente_id:f.clienteId||null, asset_id:f.assetId||null, piano_id:f.pianoId||null, data:f.data, durata:f.durata, note:f.note||"", user_id:uid });
const toDbC = (f, uid) => ({ rs:f.rs, piva:f.piva||"", contatto:f.contatto||"", tel:f.tel||"", email:f.email||"", ind:f.ind||"", settore:f.settore||"", note:f.note||"", user_id:uid });
const toDbA = (f, uid) => ({ nome:f.nome, tipo:f.tipo||"", cliente_id:f.clienteId||null, ubicazione:f.ubicazione||"", matricola:f.matricola||"", marca:f.marca||"", modello:f.modello||"", data_inst:f.dataInst||null, stato:f.stato||"attivo", note:f.note||"", user_id:uid });
const toDbP = (f, uid) => ({ nome:f.nome, descrizione:f.descrizione||"", asset_id:f.assetId||null, cliente_id:f.clienteId||null, operatore_id:f.operatoreId||null, tipo:f.tipo||"ordinaria", frequenza:f.frequenza||"mensile", durata:f.durata||60, priorita:f.priorita||"media", data_inizio:f.dataInizio||null, data_fine:f.dataFine||null, attivo:f.attivo!==false, user_id:uid });

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmtData  = d => d ? new Date(d).toLocaleDateString("it-IT") : "—";
const isoDate  = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const addDays  = (iso,n) => { const d=new Date(iso); d.setDate(d.getDate()+n); return isoDate(d); };
const addMonths= (iso,n) => { const d=new Date(iso); d.setMonth(d.getMonth()+n); return isoDate(d); };

function generaOccorrenze(piano, dataInizio, mesi=12) {
  const freq = FREQUENZE.find(f=>f.v===piano.frequenza);
  if (!freq) return [];
  const fine = (piano.dataFine&&piano.dataFine>dataInizio) ? piano.dataFine : addMonths(dataInizio, mesi);
  const occ=[]; let cur=dataInizio;
  while (cur<=fine) {
    occ.push(cur);
    const mult={mensile:1,bimestrale:2,trimestrale:3,semestrale:6,annuale:12}[piano.frequenza];
    cur = mult ? addMonths(cur,mult) : addDays(cur,freq.giorni);
  }
  return occ;
}

function conflitti(manutenzioni, operatoreId, data, escludiId=null) {
  return manutenzioni.filter(m=>m.operatoreId===operatoreId&&m.data===data&&m.stato!=="completata"&&m.id!==escludiId);
}

// ─── Atomic components ───────────────────────────────────────────────────────
function Badge({ tipo, label }) {
  const c = COLORI[tipo]||{bg:"#F1EFE8",tx:"#5F5E5A",bd:"#B4B2A9"};
  return <span style={{background:c.bg,color:c.tx,border:`1px solid ${c.bd}`,padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:500,whiteSpace:"nowrap"}}>{label}</span>;
}
function Av({ nome, col, size=36 }) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:col+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:Math.round(size*.34),color:col,flexShrink:0}}>{nome.split(" ").map(p=>p[0]).join("").slice(0,2)}</div>;
}
function SC({ v, l, c }) {
  return <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"14px 16px",flex:1,minWidth:90}}><div style={{fontSize:26,fontWeight:500,color:c||"var(--color-text-primary)"}}>{v}</div><div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{l}</div></div>;
}
function Field({ label, children }) {
  return <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>{label}</label>{children}</div>;
}
function Overlay({ children, zIndex=1000 }) {
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex,display:"flex",alignItems:"center",justifyContent:"center"}}>{children}</div>;
}
function Modal({ title, onClose, onSave, saveLabel="Salva", saveColor="#185FA5", saveOk=true, children }) {
  return (
    <Overlay>
      <div style={{background:"var(--color-background-primary)",borderRadius:14,border:"0.5px solid var(--color-border-tertiary)",padding:"24px 28px",width:"min(600px,96vw)",maxHeight:"94vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontWeight:500,fontSize:16}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"var(--color-text-secondary)"}}>✕</button>
        </div>
        <div style={{display:"grid",gap:14}}>{children}</div>
        <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
          <button onClick={onClose}>Annulla</button>
          <button disabled={!saveOk} onClick={()=>{onSave();onClose();}} style={{background:saveOk?saveColor:"#B4B2A9",color:"white",borderColor:saveOk?saveColor:"#B4B2A9",cursor:saveOk?"pointer":"not-allowed"}}>{saveLabel}</button>
        </div>
      </div>
    </Overlay>
  );
}

function AvvisoConflitto({ conflitti }) {
  if (!conflitti.length) return null;
  return (
    <div style={{background:"#FAEEDA",border:"0.5px solid #EF9F27",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#5a3a00"}}>
      <strong>⚠ Conflitto operatore:</strong> {conflitti.length} attività già pianificata/e in questa data:
      <ul style={{margin:"6px 0 0",paddingLeft:18}}>{conflitti.map(m=><li key={m.id}>{m.titolo} ({m.durata} min)</li>)}</ul>
      Puoi comunque salvare — sarà evidenziato in calendario.
    </div>
  );
}

// ─── Modal Manutenzione ──────────────────────────────────────────────────────
function ModalManut({ ini, clienti, assets, manutenzioni, onClose, onSalva }) {
  const vuoto={titolo:"",tipo:"ordinaria",priorita:"media",operatoreId:1,clienteId:"",assetId:"",data:"",durata:60,note:"",stato:"pianificata",pianoId:null};
  const [f,sf]=useState(ini||vuoto); const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const ok=f.titolo.trim()&&f.data;
  const assetsCliente=useMemo(()=>f.clienteId?assets.filter(a=>a.clienteId===Number(f.clienteId)):assets,[f.clienteId,assets]);
  const conf=useMemo(()=>f.operatoreId&&f.data?conflitti(manutenzioni,Number(f.operatoreId),f.data,ini?.id):[],[f.operatoreId,f.data,manutenzioni]);
  return (
    <Modal title={ini?"Modifica manutenzione":"Nuova manutenzione"} onClose={onClose} onSave={()=>onSalva({...f,operatoreId:Number(f.operatoreId),clienteId:f.clienteId?Number(f.clienteId):"",assetId:f.assetId?Number(f.assetId):""})} saveOk={!!ok}>
      <Field label="Titolo *"><input value={f.titolo} onChange={e=>s("titolo",e.target.value)} placeholder="Descrizione attività..." style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select></Field>
        <Field label="Priorità"><select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}><option value="bassa">Bassa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></Field>
      </div>
      <Field label="Cliente"><select value={f.clienteId} onChange={e=>{s("clienteId",e.target.value?Number(e.target.value):"");s("assetId","");}} style={{width:"100%"}}><option value="">— Nessun cliente —</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select></Field>
      <Field label="Asset"><select value={f.assetId} onChange={e=>s("assetId",e.target.value?Number(e.target.value):"")} style={{width:"100%"}}><option value="">— Nessun asset —</option>{assetsCliente.map(a=><option key={a.id} value={a.id}>{a.nome} ({a.tipo})</option>)}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Data *"><input type="date" value={f.data} onChange={e=>s("data",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
        <Field label="Durata (min)"><input type="number" value={f.durata} onChange={e=>s("durata",Number(e.target.value))} min={15} step={15} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      </div>
      <Field label="Operatore"><select value={f.operatoreId} onChange={e=>s("operatoreId",Number(e.target.value))} style={{width:"100%"}}>{OPERATORI.map(o=><option key={o.id} value={o.id}>{o.nome} — {o.spec}</option>)}</select></Field>
      <AvvisoConflitto conflitti={conf} />
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",boxSizing:"border-box",resize:"vertical"}} /></Field>
    </Modal>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ man, clienti, assets, piani }) {
  const s=useMemo(()=>({tot:man.length,pi:man.filter(m=>m.stato==="pianificata").length,ic:man.filter(m=>m.stato==="inCorso").length,co:man.filter(m=>m.stato==="completata").length,sc:man.filter(m=>m.stato==="scaduta").length,ur:man.filter(m=>m.priorita==="urgente"&&m.stato!=="completata").length}),[man]);
  const prossime=useMemo(()=>man.filter(m=>m.stato==="pianificata").sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6),[man]);
  const carichi=useMemo(()=>OPERATORI.map(op=>({...op,att:man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").length,ore:Math.round(man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").reduce((a,m)=>a+m.durata,0)/60*10)/10})),[man]);
  const maxOre=Math.max(...carichi.map(c=>c.ore),1);
  const confMap=useMemo(()=>{const m={};man.filter(x=>x.stato!=="completata").forEach(x=>{const k=`${x.operatoreId}_${x.data}`;if(!m[k])m[k]=[];m[k].push(x);});return Object.values(m).filter(g=>g.length>1);},[man]);
  return (
    <div style={{display:"grid",gap:20}}>
      {confMap.length>0&&(<div style={{background:"#FAEEDA",border:"0.5px solid #EF9F27",borderRadius:10,padding:"12px 16px",fontSize:13}}><strong style={{color:"#854F0B"}}>⚠ {confMap.length} conflitto/i di calendario</strong><div style={{color:"#5a3a00",marginTop:4}}>{confMap.map((g,i)=>{const op=OPERATORI.find(o=>o.id===g[0].operatoreId);return <div key={i}>{op?.nome} ha {g.length} attività il {fmtData(g[0].data)}: {g.map(x=>x.titolo).join(", ")}</div>;})}</div></div>)}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><SC v={s.tot} l="Totale attività" /><SC v={clienti.length} l="Clienti" c="#7F77DD" /><SC v={assets.length} l="Asset" c="#185FA5" /><SC v={piani.length} l="Piani" c="#0F6E56" /><SC v={s.pi} l="Pianificate" c="#185FA5" /><SC v={s.ic} l="In corso" c="#854F0B" /><SC v={s.sc} l="Scadute" c="#A32D2D" /><SC v={s.ur} l="Urgenti" c="#D85A30" /></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Prossime attività</div>
          {prossime.map(m=>{const op=OPERATORI.find(o=>o.id===m.operatoreId);const cl=clienti.find(c=>c.id===m.clienteId);const haConf=man.some(x=>x.id!==m.id&&x.operatoreId===m.operatoreId&&x.data===m.data&&x.stato!=="completata");return(<div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}><Av nome={op?.nome||"?"} col={op?.col||"#888"} size={30} /><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{haConf&&<span style={{color:"#854F0B",marginRight:4}}>⚠</span>}{m.titolo}</div><div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{fmtData(m.data)} · {m.durata}min{cl?` · ${cl.rs}`:""}</div></div>{m.priorita==="urgente"&&<Badge tipo="scaduta" label="⚡" />}{m.pianoId&&<span title="Da piano" style={{fontSize:10,color:"#0F6E56"}}>🔄</span>}</div>);})}
          {!prossime.length&&<div style={{color:"var(--color-text-secondary)",fontSize:13}}>Nessuna attività pianificata</div>}
        </div>
        <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Carico operatori</div>
          {carichi.map(op=>{const confOp=confMap.filter(g=>g[0].operatoreId===op.id);return(<div key={op.id} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{fontSize:13,fontWeight:500}}>{op.nome}{confOp.length>0&&<span style={{color:"#854F0B"}}> ⚠{confOp.length}</span>}</div><div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{op.att} att. · {op.ore}h</div></div><div style={{height:6,background:"var(--color-background-secondary)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${(op.ore/maxOre)*100}%`,background:op.col,borderRadius:99}} /></div></div>);})}
        </div>
        <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Asset per stato</div>
          {[{s:"attivo",l:"Attivi",c:"#3B6D11"},{s:"manutenzione",l:"In manutenzione",c:"#854F0B"},{s:"inattivo",l:"Inattivi",c:"#A32D2D"}].map(({s:st,l,c})=>{const n=assets.filter(a=>a.stato===st).length;return n>0?<div key={st} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}><span>{l}</span><span style={{fontWeight:500,color:c}}>{n}</span></div>:null;})}
          <div style={{marginTop:14,fontWeight:500,fontSize:14}}>Piani attivi</div>
          {piani.slice(0,4).map(p=>{const cl=clienti.find(c=>c.id===p.clienteId);const freq=FREQUENZE.find(f=>f.v===p.frequenza);return(<div key={p.id} style={{padding:"7px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:12}}><div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome}</div><div style={{color:"var(--color-text-secondary)"}}>{freq?.l} · {cl?.rs}</div></div>);})}
        </div>
      </div>
    </div>
  );
}

// ─── Lista manutenzioni ──────────────────────────────────────────────────────
function ListaManut({ man, clienti, assets, onStato, onDel, onMod }) {
  const [fT,sfT]=useState("tutti");const [fS,sfS]=useState("tutti");const [fC,sfC]=useState("tutti");const [cerca,sCerca]=useState("");
  const filtrate=useMemo(()=>man.filter(m=>{if(fT!=="tutti"&&m.tipo!==fT)return false;if(fS!=="tutti"&&m.stato!==fS)return false;if(fC!=="tutti"&&String(m.clienteId)!==fC)return false;if(cerca&&!m.titolo.toLowerCase().includes(cerca.toLowerCase()))return false;return true;}),[man,fT,fS,fC,cerca]);
  const priC={bassa:"#888",media:"#854F0B",alta:"#185FA5",urgente:"#A32D2D"};
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="Cerca..." style={{flex:1,minWidth:160}} />
        <select value={fT} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select>
        <select value={fS} onChange={e=>sfS(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="pianificata">Pianificata</option><option value="inCorso">In corso</option><option value="completata">Completata</option><option value="scaduta">Scaduta</option></select>
        <select value={fC} onChange={e=>sfC(e.target.value)}><option value="tutti">Tutti i clienti</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select>
      </div>
      <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{filtrate.length} attività</div>
      <div style={{display:"grid",gap:8}}>
        {filtrate.map(m=>{const op=OPERATORI.find(o=>o.id===m.operatoreId);const cl=clienti.find(c=>c.id===m.clienteId);const as=assets.find(a=>a.id===m.assetId);const haConf=man.some(x=>x.id!==m.id&&x.operatoreId===m.operatoreId&&x.data===m.data&&x.stato!=="completata");
          return(<div key={m.id} style={{background:"var(--color-background-primary)",border:`0.5px solid ${haConf?"#EF9F27":"var(--color-border-tertiary)"}`,borderRadius:10,padding:"13px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:3,borderRadius:99,background:priC[m.priorita]||"#888",alignSelf:"stretch",flexShrink:0}} />
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:5}}>
                {haConf&&<span title="Conflitto" style={{fontSize:13}}>⚠️</span>}
                <span style={{fontWeight:500,fontSize:14}}>{m.titolo}</span>
                <Badge tipo={m.tipo} label={m.tipo==="ordinaria"?"Ordinaria":"Straordinaria"} />
                <Badge tipo={m.stato} label={{pianificata:"Pianificata",inCorso:"In corso",completata:"Completata",scaduta:"Scaduta"}[m.stato]} />
                {m.priorita==="urgente"&&<Badge tipo="scaduta" label="⚡ Urgente" />}
                {m.pianoId&&<span style={{fontSize:11,color:"#0F6E56",fontStyle:"italic"}}>🔄 Piano</span>}
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:"var(--color-text-secondary)"}}>
                {cl&&<span style={{color:"#7F77DD",fontWeight:500}}>🏢 {cl.rs}</span>}
                {as&&<span>⚙ {as.nome}</span>}
                <span>📅 {fmtData(m.data)}</span><span>⏱ {m.durata}min</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:op?.col,display:"inline-block"}} />{op?.nome}</span>
              </div>
              {m.note&&<div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:4,fontStyle:"italic"}}>{m.note}</div>}
            </div>
            <div style={{display:"flex",gap:5,flexShrink:0}}>
              {m.stato==="pianificata"&&<button onClick={()=>onStato(m.id,"inCorso")} style={{fontSize:11,padding:"4px 8px"}}>Avvia</button>}
              {m.stato==="inCorso"&&<button onClick={()=>onStato(m.id,"completata")} style={{fontSize:11,padding:"4px 8px",background:"#0F6E56",color:"white",borderColor:"#0F6E56"}}>Completa</button>}
              <button onClick={()=>onMod(m)} style={{fontSize:11,padding:"4px 8px"}}>✏</button>
              <button onClick={()=>onDel(m.id)} style={{fontSize:11,padding:"4px 8px",color:"#A32D2D",borderColor:"#F09595"}}>✕</button>
            </div>
          </div>);
        })}
        {!filtrate.length&&<div style={{textAlign:"center",padding:"40px 0",color:"var(--color-text-secondary)"}}>Nessuna attività trovata</div>}
      </div>
    </div>
  );
}

// ─── Calendario ──────────────────────────────────────────────────────────────
function ModalRipianifica({ manut, nuovaData, man, onConferma, onClose }) {
  const [data,sd]=useState(nuovaData);const [opId,sOp]=useState(manut.operatoreId);
  const conf=useMemo(()=>conflitti(man,opId,data,manut.id),[man,opId,data]);
  return (
    <Overlay zIndex={2000}>
      <div style={{background:"var(--color-background-primary)",borderRadius:14,border:"0.5px solid var(--color-border-tertiary)",padding:"24px 28px",width:"min(460px,95vw)"}}>
        <div style={{fontWeight:500,fontSize:16,marginBottom:6}}>Ripianifica attività</div>
        <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:18,padding:"8px 12px",background:"var(--color-background-secondary)",borderRadius:8}}>{manut.titolo}</div>
        <div style={{display:"grid",gap:14}}>
          <Field label="Nuova data"><input type="date" value={data} onChange={e=>sd(e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
          <Field label="Operatore"><select value={opId} onChange={e=>sOp(Number(e.target.value))} style={{width:"100%"}}>{OPERATORI.map(o=><option key={o.id} value={o.id}>{o.nome} — {o.spec}</option>)}</select></Field>
          <AvvisoConflitto conflitti={conf} />
        </div>
        <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
          <button onClick={onClose}>Annulla</button>
          <button onClick={()=>{onConferma(manut.id,data,opId);onClose();}} style={{background:"#185FA5",color:"white",borderColor:"#185FA5"}}>Conferma</button>
        </div>
      </div>
    </Overlay>
  );
}

function Calendario({ man, clienti, assets, onRipianifica, onNuovaData }) {
  const oggi=new Date();
  const [anno,sA]=useState(oggi.getFullYear());const [mese,sM]=useState(oggi.getMonth());
  const [opF,sOpF]=useState(0);const [drag,sDrag]=useState(null);const [drop,sDrop]=useState(null);const [ripModal,sRip]=useState(null);
  const primoG=new Date(anno,mese,1).getDay();const giorniN=new Date(anno,mese+1,0).getDate();
  const attPerG=useMemo(()=>{const m={};man.filter(x=>{if(opF!==0&&x.operatoreId!==opF)return false;const d=new Date(x.data);return d.getFullYear()===anno&&d.getMonth()===mese;}).forEach(x=>{const g=new Date(x.data).getDate();if(!m[g])m[g]=[];m[g].push(x);});return m;},[man,anno,mese,opF]);
  const celle=[];for(let i=0;i<primoG;i++)celle.push(null);for(let g=1;g<=giorniN;g++)celle.push(g);
  const toIso=g=>`${anno}-${String(mese+1).padStart(2,"0")}-${String(g).padStart(2,"0")}`;
  const giorniConflitto=useMemo(()=>{const set=new Set();const grouped={};man.filter(x=>x.stato!=="completata").forEach(x=>{const k=`${x.operatoreId}_${x.data}`;if(!grouped[k])grouped[k]=[];grouped[k].push(x);});Object.values(grouped).filter(g=>g.length>1).forEach(g=>{const d=new Date(g[0].data);if(d.getFullYear()===anno&&d.getMonth()===mese)set.add(d.getDate());});return set;},[man,anno,mese]);
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={()=>{if(mese===0){sM(11);sA(a=>a-1);}else sM(m=>m-1);}} style={{padding:"6px 14px"}}>←</button>
        <span style={{fontWeight:500,fontSize:15,minWidth:170,textAlign:"center"}}>{MESI[mese]} {anno}</span>
        <button onClick={()=>{if(mese===11){sM(0);sA(a=>a+1);}else sM(m=>m+1);}} style={{padding:"6px 14px"}}>→</button>
        <button onClick={()=>{sM(oggi.getMonth());sA(oggi.getFullYear());}} style={{fontSize:12,padding:"6px 10px"}}>Oggi</button>
        <div style={{flex:1}} />
        <select value={opF} onChange={e=>sOpF(Number(e.target.value))}><option value={0}>Tutti gli operatori</option>{OPERATORI.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select>
      </div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
        {OPERATORI.map(op=><div key={op.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"var(--color-text-secondary)"}}><span style={{width:10,height:10,borderRadius:2,background:op.col,display:"inline-block"}} />{op.nome.split(" ")[0]}</div>)}
        <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>· 🔄 = da piano · ⚠ = conflitto · Trascina per ripianificare</span>
      </div>
      <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>{GIORNI.map(g=><div key={g} style={{padding:"8px 0",textAlign:"center",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{g}</div>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {celle.map((g,i)=>{
            const isOggi=g&&g===oggi.getDate()&&mese===oggi.getMonth()&&anno===oggi.getFullYear();
            const isDrop=drop===g&&!!drag;const hasConf=g&&giorniConflitto.has(g);const att=g?(attPerG[g]||[]):[];
            return(<div key={i} onDragOver={e=>{if(!g||!drag)return;e.preventDefault();sDrop(g);}} onDragLeave={()=>sDrop(null)} onDrop={e=>{e.preventDefault();if(!g||!drag)return;const nd=toIso(g);if(nd!==drag.data)sRip({manut:drag,nuovaData:nd});sDrag(null);sDrop(null);}} onClick={()=>g&&!drag&&onNuovaData(toIso(g))} style={{minHeight:88,padding:"5px",borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:(i+1)%7===0?"none":"0.5px solid var(--color-border-tertiary)",background:!g?"var(--color-background-secondary)":isDrop?"#EEF5FF":hasConf?"#FFFBF0":"transparent",opacity:!g?0.25:1,cursor:g?"pointer":"default",outline:isDrop?"2px solid #378ADD":hasConf?"1px solid #EF9F27":"none",outlineOffset:-2}}>
              <div style={{fontSize:12,width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2,fontWeight:isOggi?500:400,background:isOggi?"#185FA5":"transparent",color:isOggi?"white":"var(--color-text-primary)"}}>{g}</div>
              {hasConf&&<div style={{fontSize:9,color:"#854F0B",marginBottom:2}}>⚠ conflitto</div>}
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {att.slice(0,3).map(m=>{const op=OPERATORI.find(o=>o.id===m.operatoreId);return(<div key={m.id} draggable={m.stato!=="completata"} onDragStart={e=>{sDrag(m);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>{sDrag(null);sDrop(null);}} onClick={e=>e.stopPropagation()} title={m.titolo} style={{fontSize:10,padding:"2px 4px",borderRadius:4,background:(op?.col||"#888")+"22",color:op?.col,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500,cursor:m.stato!=="completata"?"grab":"default",opacity:drag?.id===m.id?0.35:1,borderLeft:`2px solid ${op?.col||"#888"}`,userSelect:"none"}}>{m.pianoId?"🔄 ":""}{m.titolo}</div>);})}
                {att.length>3&&<div style={{fontSize:10,color:"var(--color-text-secondary)",paddingLeft:2}}>+{att.length-3}</div>}
              </div>
            </div>);
          })}
        </div>
      </div>
      {ripModal&&<ModalRipianifica manut={ripModal.manut} nuovaData={ripModal.nuovaData} man={man} onConferma={onRipianifica} onClose={()=>sRip(null)} />}
    </div>
  );
}

// ─── Asset ───────────────────────────────────────────────────────────────────
function ModalAsset({ ini, clienti, onClose, onSalva }) {
  const vuoto={nome:"",tipo:"",clienteId:"",ubicazione:"",matricola:"",marca:"",modello:"",dataInst:"",stato:"attivo",note:""};
  const [f,sf]=useState(ini||vuoto);const s=(k,v)=>sf(p=>({...p,[k]:v}));const ok=f.nome.trim();
  const TIPI=["Impianto elettrico","Linea produzione","Impianto termico","Impianto pneumatico","Impianto idraulico","Sicurezza","Meccanico","Altro"];
  return (
    <Modal title={ini?"Modifica asset":"Nuovo asset"} onClose={onClose} onSave={()=>onSalva({...f,clienteId:f.clienteId?Number(f.clienteId):""})} saveOk={!!ok} saveColor="#185FA5">
      <Field label="Nome asset *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="">— Seleziona —</option>{TIPI.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Stato"><select value={f.stato} onChange={e=>s("stato",e.target.value)} style={{width:"100%"}}><option value="attivo">Attivo</option><option value="manutenzione">In manutenzione</option><option value="inattivo">Inattivo</option></select></Field>
      </div>
      <Field label="Cliente"><select value={f.clienteId} onChange={e=>s("clienteId",e.target.value?Number(e.target.value):"")} style={{width:"100%"}}><option value="">— Nessun cliente —</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select></Field>
      <Field label="Ubicazione"><input value={f.ubicazione} onChange={e=>s("ubicazione",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <Field label="Matricola"><input value={f.matricola} onChange={e=>s("matricola",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
        <Field label="Marca"><input value={f.marca} onChange={e=>s("marca",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
        <Field label="Modello"><input value={f.modello} onChange={e=>s("modello",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      </div>
      <Field label="Data installazione"><input type="date" value={f.dataInst} onChange={e=>s("dataInst",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",boxSizing:"border-box",resize:"vertical"}} /></Field>
    </Modal>
  );
}

function GestioneAssets({ assets, clienti, manutenzioni, onAgg, onMod, onDel }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [cerca,sCerca]=useState("");const [fTipo,sfT]=useState("tutti");const [fSt,sfSt]=useState("tutti");
  const tipi=[...new Set(assets.map(a=>a.tipo).filter(Boolean))];
  const filtrati=useMemo(()=>assets.filter(a=>{if(fTipo!=="tutti"&&a.tipo!==fTipo)return false;if(fSt!=="tutti"&&a.stato!==fSt)return false;if(cerca&&!a.nome.toLowerCase().includes(cerca.toLowerCase())&&!(a.matricola||"").toLowerCase().includes(cerca.toLowerCase()))return false;return true;}),[assets,fTipo,fSt,cerca]);
  const statoC={attivo:{bg:"#EAF3DE",tx:"#3B6D11",bd:"#97C459"},manutenzione:{bg:"#FAEEDA",tx:"#854F0B",bd:"#EF9F27"},inattivo:{bg:"#FCEBEB",tx:"#A32D2D",bd:"#F09595"}};
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="Cerca asset o matricola..." style={{flex:1,minWidth:160}} />
        <select value={fTipo} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option>{tipi.map(t=><option key={t} value={t}>{t}</option>)}</select>
        <select value={fSt} onChange={e=>sfSt(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="attivo">Attivo</option><option value="manutenzione">In manutenzione</option><option value="inattivo">Inattivo</option></select>
        <button onClick={()=>{siM(null);ssM(true);}} style={{background:"#185FA5",color:"white",borderColor:"#185FA5",whiteSpace:"nowrap"}}>+ Nuovo asset</button>
      </div>
      <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{filtrati.length} asset</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {filtrati.map(a=>{const cl=clienti.find(c=>c.id===a.clienteId);const manAss=manutenzioni.filter(m=>m.assetId===a.id);const manAtt=manAss.filter(m=>m.stato!=="completata");const sc=statoC[a.stato]||statoC.inattivo;
          return(<div key={a.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"18px 20px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:8,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>⚙</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nome}</div><div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:1}}>{a.tipo}</div></div>
              <div style={{display:"flex",gap:5}}><button onClick={()=>{siM(a);ssM(true);}} style={{fontSize:11,padding:"3px 8px"}}>✏</button><button onClick={()=>onDel(a.id)} style={{fontSize:11,padding:"3px 8px",color:"#A32D2D",borderColor:"#F09595"}}>✕</button></div>
            </div>
            <div style={{display:"grid",gap:4,fontSize:12,color:"var(--color-text-secondary)",marginBottom:12}}>
              {cl&&<div style={{color:"#7F77DD",fontWeight:500}}>🏢 {cl.rs}</div>}
              {a.ubicazione&&<div>📍 {a.ubicazione}</div>}
              {a.matricola&&<div>🔖 {a.matricola}{a.marca?` · ${a.marca}`:""}{a.modello?` ${a.modello}`:""}</div>}
              {a.dataInst&&<div>📅 Installato: {fmtData(a.dataInst)}</div>}
            </div>
            {a.note&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",fontStyle:"italic",marginBottom:10}}>{a.note}</div>}
            <div style={{display:"flex",gap:8,alignItems:"center",borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:10}}>
              <span style={{background:sc.bg,color:sc.tx,border:`1px solid ${sc.bd}`,padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:500}}>{a.stato==="manutenzione"?"In manutenzione":a.stato==="attivo"?"Attivo":"Inattivo"}</span>
              <span style={{flex:1}} />
              <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{manAtt.length} att. attive · {manAss.length} tot.</span>
            </div>
          </div>);
        })}
      </div>
      {!filtrati.length&&<div style={{textAlign:"center",padding:"40px 0",color:"var(--color-text-secondary)"}}>Nessun asset trovato</div>}
      {showM&&<ModalAsset ini={inMod} clienti={clienti} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

// ─── Piani ───────────────────────────────────────────────────────────────────
function ModalPiano({ ini, clienti, assets, manutenzioni, onClose, onSalva }) {
  const vuoto={nome:"",descrizione:"",assetId:"",clienteId:"",operatoreId:"1",tipo:"ordinaria",frequenza:"mensile",durata:60,priorita:"media",dataInizio:"",dataFine:"",attivo:true};
  const normalize=obj=>obj?{...obj,operatoreId:String(obj.operatoreId||1),clienteId:obj.clienteId?String(obj.clienteId):"",assetId:obj.assetId?String(obj.assetId):""}:null;
  const [f,sf]=useState(normalize(ini)||vuoto);const s=(k,v)=>sf(p=>({...p,[k]:v}));const ok=f.nome.trim()&&f.dataInizio&&f.frequenza;
  const assetsCliente=useMemo(()=>f.clienteId?assets.filter(a=>String(a.clienteId)===f.clienteId):assets,[f.clienteId,assets]);
  const preview=useMemo(()=>{if(!ok)return[];return generaOccorrenze(f,f.dataInizio,6).slice(0,8);},[f,ok]);
  const previewConf=useMemo(()=>preview.filter(data=>conflitti(manutenzioni,Number(f.operatoreId),data).length>0),[preview,f.operatoreId,manutenzioni]);
  const handleSave=()=>onSalva({...f,operatoreId:Number(f.operatoreId),clienteId:f.clienteId?Number(f.clienteId):"",assetId:f.assetId?Number(f.assetId):""});
  return (
    <Modal title={ini?"Modifica piano":"Nuovo piano di manutenzione"} onClose={onClose} onSave={handleSave} saveOk={!!ok} saveColor="#0F6E56" saveLabel={ini?"Aggiorna piano e attività":"Crea piano e genera attività"}>
      <Field label="Nome piano *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <Field label="Descrizione"><textarea value={f.descrizione} onChange={e=>s("descrizione",e.target.value)} rows={2} style={{width:"100%",boxSizing:"border-box",resize:"vertical"}} /></Field>
      <Field label="Cliente"><select value={f.clienteId} onChange={e=>{s("clienteId",e.target.value);s("assetId","");}} style={{width:"100%"}}><option value="">— Nessun cliente —</option>{clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}</select></Field>
      <Field label="Asset"><select value={f.assetId} onChange={e=>s("assetId",e.target.value)} style={{width:"100%"}}><option value="">— Nessun asset —</option>{assetsCliente.map(a=><option key={a.id} value={String(a.id)}>{a.nome}</option>)}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select></Field>
        <Field label="Priorità"><select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}><option value="bassa">Bassa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Frequenza"><select value={f.frequenza} onChange={e=>s("frequenza",e.target.value)} style={{width:"100%"}}>{FREQUENZE.map(fr=><option key={fr.v} value={fr.v}>{fr.l}</option>)}</select></Field>
        <Field label="Durata (min)"><input type="number" value={f.durata} onChange={e=>s("durata",Number(e.target.value))} min={15} step={15} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      </div>
      <Field label="Operatore"><select value={f.operatoreId} onChange={e=>s("operatoreId",e.target.value)} style={{width:"100%"}}>{OPERATORI.map(o=><option key={o.id} value={String(o.id)}>{o.nome} — {o.spec}</option>)}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Data inizio *"><input type="date" value={f.dataInizio} onChange={e=>s("dataInizio",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
        <Field label="Data fine (opzionale)"><input type="date" value={f.dataFine} onChange={e=>s("dataFine",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      </div>
      {preview.length>0&&(<div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"12px 14px"}}>
        <div style={{fontSize:12,fontWeight:500,marginBottom:8,color:"var(--color-text-secondary)"}}>Anteprima ({preview.length} occorrenze nei prossimi 6 mesi):</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{preview.map((data,i)=>{const haConf=previewConf.includes(data);return <span key={i} style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:haConf?"#FAEEDA":"#E1F5EE",color:haConf?"#854F0B":"#0F6E56",border:`1px solid ${haConf?"#EF9F27":"#5DCAA5"}`}}>{haConf?"⚠ ":""}{fmtData(data)}</span>;})}</div>
        {previewConf.length>0&&<div style={{fontSize:11,color:"#854F0B",marginTop:8}}>⚠ {previewConf.length} date con conflitti.</div>}
        {ini&&<div style={{fontSize:11,color:"#185FA5",marginTop:6}}>Le modifiche verranno applicate a tutte le attività future non completate.</div>}
      </div>)}
    </Modal>
  );
}

function GestionePiani({ piani, clienti, assets, manutenzioni, onAgg, onMod, onDel, onAttivaDisattiva }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={()=>{siM(null);ssM(true);}} style={{background:"#0F6E56",color:"white",borderColor:"#0F6E56"}}>+ Nuovo piano di manutenzione</button></div>
      {!piani.length&&<div style={{textAlign:"center",padding:"40px 0",color:"var(--color-text-secondary)"}}>Nessun piano configurato. Crea il primo piano per generare automaticamente le attività.</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
        {piani.map(p=>{const cl=clienti.find(c=>c.id===p.clienteId);const as=assets.find(a=>a.id===p.assetId);const op=OPERATORI.find(o=>o.id===p.operatoreId);const freq=FREQUENZE.find(f=>f.v===p.frequenza);const manP=manutenzioni.filter(m=>m.pianoId===p.id);const prossima=manP.filter(m=>m.stato==="pianificata").sort((a,b)=>a.data.localeCompare(b.data))[0];
          return(<div key={p.id} style={{background:"var(--color-background-primary)",border:`0.5px solid ${p.attivo?"#5DCAA5":"var(--color-border-tertiary)"}`,borderRadius:12,padding:"18px 20px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:8,background:p.attivo?"#E1F5EE":"var(--color-background-secondary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🔄</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome}</div><div style={{fontSize:11,marginTop:2}}><span style={{background:p.attivo?"#EAF3DE":"#F1EFE8",color:p.attivo?"#3B6D11":"#5F5E5A",padding:"1px 6px",borderRadius:4,fontWeight:500}}>{p.attivo?"Attivo":"Sospeso"}</span><span style={{color:"var(--color-text-secondary)",marginLeft:6}}>{freq?.l}</span></div></div>
              <div style={{display:"flex",gap:5}}><button onClick={()=>{siM(p);ssM(true);}} style={{fontSize:11,padding:"3px 8px"}}>✏</button><button onClick={()=>onDel(p.id)} style={{fontSize:11,padding:"3px 8px",color:"#A32D2D",borderColor:"#F09595"}}>✕</button></div>
            </div>
            {p.descrizione&&<div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:10}}>{p.descrizione}</div>}
            <div style={{display:"grid",gap:4,fontSize:12,color:"var(--color-text-secondary)",marginBottom:12}}>
              {cl&&<div style={{color:"#7F77DD",fontWeight:500}}>🏢 {cl.rs}</div>}
              {as&&<div>⚙ {as.nome}</div>}
              <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:op?.col,display:"inline-block"}} />{op?.nome}</div>
              <div>📅 Dal {fmtData(p.dataInizio)}{p.dataFine?` al ${fmtData(p.dataFine)}`:""} · ⏱ {p.durata}min</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:10,flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{manP.length} generate · {prossima?`Prossima: ${fmtData(prossima.data)}`:"Nessuna pianificata"}</span>
              <span style={{flex:1}} />
              <button onClick={()=>onAttivaDisattiva(p.id,!p.attivo)} style={{fontSize:11,padding:"4px 10px",background:p.attivo?"transparent":"#0F6E56",color:p.attivo?"var(--color-text-primary)":"white",borderColor:p.attivo?"var(--color-border-secondary)":"#0F6E56"}}>{p.attivo?"Sospendi":"Riattiva"}</button>
            </div>
          </div>);
        })}
      </div>
      {showM&&<ModalPiano key={inMod?.id??'new'} ini={inMod} clienti={clienti} assets={assets} manutenzioni={manutenzioni} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...f,id:inMod.id}):onAgg(f)} />}
    </div>
  );
}

// ─── Clienti ─────────────────────────────────────────────────────────────────
function ModalCliente({ ini, onClose, onSalva }) {
  const v={rs:"",piva:"",contatto:"",tel:"",email:"",ind:"",settore:"",note:""};
  const [f,sf]=useState(ini||v);const s=(k,v2)=>sf(p=>({...p,[k]:v2}));const ok=f.rs.trim();
  return (
    <Modal title={ini?"Modifica cliente":"Nuovo cliente"} onClose={onClose} onSave={()=>onSalva(f)} saveOk={!!ok} saveColor="#7F77DD" saveLabel={ini?"Aggiorna":"Aggiungi"}>
      <Field label="Ragione sociale *"><input value={f.rs} onChange={e=>s("rs",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="P.IVA"><input value={f.piva} onChange={e=>s("piva",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
        <Field label="Settore"><input value={f.settore} onChange={e=>s("settore",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      </div>
      <Field label="Contatto"><input value={f.contatto} onChange={e=>s("contatto",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Telefono"><input value={f.tel} onChange={e=>s("tel",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={e=>s("email",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      </div>
      <Field label="Indirizzo"><input value={f.ind} onChange={e=>s("ind",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} /></Field>
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",boxSizing:"border-box",resize:"vertical"}} /></Field>
    </Modal>
  );
}

function GestioneClienti({ clienti, manutenzioni, assets, onAgg, onMod, onDel }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [cerca,sCerca]=useState("");
  const filtrati=useMemo(()=>clienti.filter(c=>!cerca||c.rs.toLowerCase().includes(cerca.toLowerCase())||c.contatto.toLowerCase().includes(cerca.toLowerCase())),[clienti,cerca]);
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",gap:10}}><input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="Cerca cliente..." style={{flex:1}} /><button onClick={()=>{siM(null);ssM(true);}} style={{background:"#7F77DD",color:"white",borderColor:"#7F77DD"}}>+ Nuovo cliente</button></div>
      <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{filtrati.length} clienti</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {filtrati.map(c=>{const nAtt=manutenzioni.filter(m=>m.clienteId===c.id&&m.stato!=="completata").length;const nAs=assets.filter(a=>a.clienteId===c.id).length;const ur=manutenzioni.filter(m=>m.clienteId===c.id&&m.priorita==="urgente"&&m.stato!=="completata").length;const ini=c.rs.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
          return(<div key={c.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"18px 20px"}}>
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:8,background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:13,color:"#534AB7",flexShrink:0}}>{ini}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.rs}</div>{c.settore&&<div style={{fontSize:11,color:"#7F77DD"}}>{c.settore}</div>}</div>
              <div style={{display:"flex",gap:5}}><button onClick={()=>{siM(c);ssM(true);}} style={{fontSize:11,padding:"3px 8px"}}>✏</button><button onClick={()=>onDel(c.id)} style={{fontSize:11,padding:"3px 8px",color:"#A32D2D",borderColor:"#F09595"}}>✕</button></div>
            </div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",display:"grid",gap:3,marginBottom:12}}>{c.contatto&&<div>👤 {c.contatto}</div>}{c.tel&&<div>📞 {c.tel}</div>}{c.email&&<div>✉ {c.email}</div>}</div>
            <div style={{display:"flex",gap:8,borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:10}}>
              <div style={{flex:1,textAlign:"center"}}><div style={{fontWeight:500,color:"#185FA5"}}>{nAtt}</div><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Attive</div></div>
              <div style={{flex:1,textAlign:"center"}}><div style={{fontWeight:500}}>{nAs}</div><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Asset</div></div>
              {ur>0&&<div style={{flex:1,textAlign:"center"}}><div style={{fontWeight:500,color:"#A32D2D"}}>⚡{ur}</div><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>Urgenti</div></div>}
            </div>
          </div>);
        })}
      </div>
      {showM&&<ModalCliente ini={inMod} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

// ─── Operatori ────────────────────────────────────────────────────────────────
function Operatori({ man }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
      {OPERATORI.map(op=>{const sue=man.filter(m=>m.operatoreId===op.id);const att=sue.filter(m=>m.stato!=="completata");const ore=Math.round(att.reduce((s,m)=>s+m.durata,0)/60*10)/10;const urg=att.filter(m=>m.priorita==="urgente");
        return(<div key={op.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><Av nome={op.nome} col={op.col} size={44} /><div><div style={{fontWeight:500}}>{op.nome}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{op.spec}</div></div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[{v:att.length,l:"Attive",c:op.col},{v:sue.filter(m=>m.stato==="completata").length,l:"Completate",c:"#3B6D11"},{v:ore+"h",l:"Ore"}].map(({v,l,c})=>(<div key={l} style={{textAlign:"center",background:"var(--color-background-secondary)",borderRadius:8,padding:"8px 4px"}}><div style={{fontWeight:500,color:c||"var(--color-text-primary)"}}>{v}</div><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{l}</div></div>))}
          </div>
          {urg.length>0&&<div style={{background:"#FCEBEB",border:"0.5px solid #F09595",borderRadius:6,padding:"6px 10px",fontSize:12,color:"#A32D2D",marginBottom:10}}>⚡ {urg.length} urgente{urg.length>1?"i":""}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {att.slice(0,3).map(m=><div key={m.id} style={{fontSize:12,padding:"6px 8px",borderRadius:6,background:"var(--color-background-secondary)"}}><div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.pianoId?"🔄 ":""}{m.titolo}</div><div style={{color:"var(--color-text-secondary)",fontSize:11}}>{fmtData(m.data)} · {m.durata}min</div></div>)}
            {att.length>3&&<div style={{fontSize:11,color:"var(--color-text-secondary)",textAlign:"center"}}>+{att.length-3} altre</div>}
            {!att.length&&<div style={{fontSize:12,color:"var(--color-text-secondary)",textAlign:"center",padding:"8px 0"}}>Nessuna attività attiva</div>}
          </div>
        </div>);
      })}
    </div>
  );
}

// ─── App root con Supabase ────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbErr, setDbErr]     = useState(null);

  const [man,   sMan]  = useState([]);
  const [clienti, sCl] = useState([]);
  const [assets,  sAs] = useState([]);
  const [piani,   sPi] = useState([]);

  const [vista,   sV]   = useState("dashboard");
  const [modalM,  sMM]  = useState(false);
  const [inModM,  siMM] = useState(null);
  const [dataDef, sDD]  = useState("");

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { sMan([]); sCl([]); sAs([]); sPi([]); } });
    return () => subscription.unsubscribe();
  }, []);

  // Carica tutti i dati al login
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      supabase.from("clienti").select("*").order("created_at"),
      supabase.from("assets").select("*").order("created_at"),
      supabase.from("piani").select("*").order("created_at"),
      supabase.from("manutenzioni").select("*").order("data"),
    ]).then(([rc, ra, rp, rm]) => {
      if (rc.error||ra.error||rp.error||rm.error) { setDbErr("Errore caricamento dati dal database."); }
      else { sCl(rc.data.map(mapC)); sAs(ra.data.map(mapA)); sPi(rp.data.map(mapP)); sMan(rm.data.map(mapM)); }
      setLoading(false);
    });
  }, [session]);

  const uid = () => session?.user?.id;

  // ── Manutenzioni ──────────────────────────────────────────────────────────
  const aggM = async f => {
    const row = toDbM(f, uid());
    const { data, error } = await supabase.from("manutenzioni").insert(row).select().single();
    if (!error) sMan(p => [...p, mapM(data)]);
  };
  const modM = async f => {
    const { error } = await supabase.from("manutenzioni").update(toDbM(f, uid())).eq("id", f.id);
    if (!error) sMan(p => p.map(m => m.id === f.id ? { ...m, ...f } : m));
  };
  const delM = async id => {
    await supabase.from("manutenzioni").delete().eq("id", id);
    sMan(p => p.filter(m => m.id !== id));
  };
  const statoM = async (id, stato) => {
    await supabase.from("manutenzioni").update({ stato }).eq("id", id);
    sMan(p => p.map(m => m.id === id ? { ...m, stato } : m));
  };
  const ripiM = async (id, data, operatoreId) => {
    const m = man.find(x => x.id === id);
    const nuovoStato = m?.stato === "scaduta" ? "pianificata" : m?.stato;
    await supabase.from("manutenzioni").update({ data, operatore_id: operatoreId, stato: nuovoStato }).eq("id", id);
    sMan(p => p.map(m => m.id === id ? { ...m, data, operatoreId, stato: nuovoStato } : m));
  };

  // ── Clienti ───────────────────────────────────────────────────────────────
  const aggC = async f => {
    const { data, error } = await supabase.from("clienti").insert(toDbC(f, uid())).select().single();
    if (!error) sCl(p => [...p, mapC(data)]);
  };
  const modC = async f => {
    await supabase.from("clienti").update(toDbC(f, uid())).eq("id", f.id);
    sCl(p => p.map(c => c.id === f.id ? { ...c, ...f } : c));
  };
  const delC = async id => {
    await supabase.from("clienti").delete().eq("id", id);
    sCl(p => p.filter(c => c.id !== id));
  };

  // ── Asset ─────────────────────────────────────────────────────────────────
  const aggA = async f => {
    const { data, error } = await supabase.from("assets").insert(toDbA(f, uid())).select().single();
    if (!error) sAs(p => [...p, mapA(data)]);
  };
  const modA = async f => {
    await supabase.from("assets").update(toDbA(f, uid())).eq("id", f.id);
    sAs(p => p.map(a => a.id === f.id ? { ...a, ...f } : a));
  };
  const delA = async id => {
    await supabase.from("assets").delete().eq("id", id);
    sAs(p => p.filter(a => a.id !== id));
  };

  // ── Piani ─────────────────────────────────────────────────────────────────
  const aggPiano = async f => {
    const piano = { ...f, clienteId: f.clienteId ? Number(f.clienteId) : "", assetId: f.assetId ? Number(f.assetId) : "", operatoreId: Number(f.operatoreId), tipo: f.tipo||"ordinaria", frequenza: f.frequenza||"mensile" };
    const { data: pianoRow, error: pErr } = await supabase.from("piani").insert(toDbP(piano, uid())).select().single();
    if (pErr) return;
    const newPiano = mapP(pianoRow);
    sPi(p => [...p, newPiano]);
    const occorrenze = generaOccorrenze(newPiano, newPiano.dataInizio, 12);
    const rows = occorrenze.map(data => toDbM({ titolo:newPiano.nome, tipo:newPiano.tipo, stato:"pianificata", priorita:newPiano.priorita, operatoreId:newPiano.operatoreId, clienteId:newPiano.clienteId, assetId:newPiano.assetId, pianoId:newPiano.id, data, durata:newPiano.durata, note:newPiano.descrizione||"" }, uid()));
    const { data: newMan } = await supabase.from("manutenzioni").insert(rows).select();
    if (newMan) sMan(p => [...p, ...newMan.map(mapM)]);
  };

  const modPiano = async f => {
    const upd = { ...f, operatoreId: Number(f.operatoreId), clienteId: f.clienteId ? Number(f.clienteId) : "", assetId: f.assetId ? Number(f.assetId) : "" };
    await supabase.from("piani").update(toDbP(upd, uid())).eq("id", upd.id);
    sPi(p => p.map(pi => pi.id === upd.id ? upd : pi));
    // Elimina attività future pianificate dal piano e rigenera
    const oggi = isoDate(new Date());
    await supabase.from("manutenzioni").delete().eq("piano_id", upd.id).eq("stato", "pianificata");
    sMan(prev => {
      const conservate = prev.filter(m => m.pianoId !== upd.id || m.stato === "completata" || m.stato === "inCorso");
      const dataPartenza = upd.dataInizio > oggi ? upd.dataInizio : oggi;
      const nuoveLocali = generaOccorrenze(upd, dataPartenza, 12).map((data, i) => ({
        id: Date.now() + i + 1, titolo:upd.nome, tipo:upd.tipo, stato:"pianificata", priorita:upd.priorita,
        operatoreId:upd.operatoreId, clienteId:upd.clienteId, assetId:upd.assetId, pianoId:upd.id, data, durata:upd.durata, note:upd.descrizione||""
      }));
      // Salva le nuove in Supabase in background
      const rows = nuoveLocali.map(m => toDbM(m, uid()));
      supabase.from("manutenzioni").insert(rows).select().then(({ data: saved }) => {
        if (saved) sMan(prev2 => [...prev2.filter(m => m.pianoId !== upd.id || m.stato === "completata" || m.stato === "inCorso"), ...saved.map(mapM)]);
      });
      return [...conservate, ...nuoveLocali];
    });
  };

  const delPiano = async id => {
    await supabase.from("manutenzioni").delete().eq("piano_id", id);
    await supabase.from("piani").delete().eq("id", id);
    sPi(p => p.filter(pi => pi.id !== id));
    sMan(p => p.filter(m => m.pianoId !== id));
  };

  const attivaDisattiva = async (id, attivo) => {
    await supabase.from("piani").update({ attivo }).eq("id", id);
    sPi(p => p.map(pi => pi.id === id ? { ...pi, attivo } : pi));
  };

  const apriConData = d => { sDD(d); siMM(null); sMM(true); };
  const apriModM   = m => { siMM(m); sDD(""); sMM(true); };

  const logout = () => supabase.auth.signOut();

  // ── Rendering ─────────────────────────────────────────────────────────────
  if (!session) return <Auth />;

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif",flexDirection:"column",gap:16}}>
      <div style={{fontSize:32}}>🔧</div>
      <div style={{fontSize:14,color:"#888"}}>Caricamento ManuMan…</div>
    </div>
  );

  if (dbErr) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"#FCEBEB",border:"0.5px solid #F09595",borderRadius:12,padding:"24px 32px",maxWidth:400,textAlign:"center"}}>
        <div style={{fontSize:24,marginBottom:8}}>⚠️</div>
        <div style={{fontWeight:500,marginBottom:6}}>Errore database</div>
        <div style={{fontSize:13,color:"#A32D2D"}}>{dbErr}</div>
        <div style={{fontSize:12,color:"#888",marginTop:12}}>Controlla le variabili .env e lo schema SQL su Supabase.</div>
      </div>
    </div>
  );

  const TABS = [
    {id:"dashboard",l:"Dashboard"},{id:"manutenzioni",l:"Manutenzioni"},{id:"piani",l:"Piani"},
    {id:"calendario",l:"Calendario"},{id:"assets",l:"Asset"},{id:"operatori",l:"Operatori"},{id:"clienti",l:"Clienti"},
  ];

  return (
    <div style={{fontFamily:"var(--font-sans,system-ui,sans-serif)",background:"var(--color-background-tertiary,#F5F4F0)",minHeight:"100vh",paddingBottom:40}}>
      <div style={{background:"var(--color-background-primary,white)",borderBottom:"0.5px solid var(--color-border-tertiary,#E5E4E0)",padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontWeight:500,fontSize:15,padding:"14px 20px 14px 0",borderRight:"0.5px solid var(--color-border-tertiary,#E5E4E0)",marginRight:16,whiteSpace:"nowrap"}}>🔧 ManuMan</div>
        <div style={{display:"flex",flex:1,overflowX:"auto"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>sV(t.id)} style={{padding:"14px 14px",border:"none",borderBottom:vista===t.id?"2px solid #185FA5":"2px solid transparent",background:"none",cursor:"pointer",fontSize:13,fontWeight:vista===t.id?500:400,color:vista===t.id?"#185FA5":"var(--color-text-secondary,#888)",whiteSpace:"nowrap",borderRadius:0,transition:"all 0.15s"}}>{t.l}</button>)}
        </div>
        <div style={{display:"flex",gap:8,marginLeft:12,flexShrink:0}}>
          <button onClick={()=>{siMM(null);sDD("");sMM(true);}} style={{background:"#185FA5",color:"white",borderColor:"#185FA5",fontSize:13,padding:"8px 14px",whiteSpace:"nowrap"}}>+ Nuova attività</button>
          <button onClick={logout} title="Esci" style={{fontSize:13,padding:"8px 12px"}}>↩</button>
        </div>
      </div>

      <div style={{maxWidth:1160,margin:"0 auto",padding:"24px 16px"}}>
        {vista==="dashboard"    && <Dashboard man={man} clienti={clienti} assets={assets} piani={piani} />}
        {vista==="manutenzioni" && <ListaManut man={man} clienti={clienti} assets={assets} onStato={statoM} onDel={delM} onMod={apriModM} />}
        {vista==="piani"        && <GestionePiani piani={piani} clienti={clienti} assets={assets} manutenzioni={man} onAgg={aggPiano} onMod={modPiano} onDel={delPiano} onAttivaDisattiva={attivaDisattiva} />}
        {vista==="calendario"   && <Calendario man={man} clienti={clienti} assets={assets} onRipianifica={ripiM} onNuovaData={apriConData} />}
        {vista==="assets"       && <GestioneAssets assets={assets} clienti={clienti} manutenzioni={man} onAgg={aggA} onMod={modA} onDel={delA} />}
        {vista==="operatori"    && <Operatori man={man} />}
        {vista==="clienti"      && <GestioneClienti clienti={clienti} manutenzioni={man} assets={assets} onAgg={aggC} onMod={modC} onDel={delC} />}
      </div>

      {modalM && <ModalManut
        ini={inModM ? {...inModM} : (dataDef ? {titolo:"",tipo:"ordinaria",priorita:"media",operatoreId:1,clienteId:"",assetId:"",data:dataDef,durata:60,note:"",stato:"pianificata",pianoId:null} : null)}
        clienti={clienti} assets={assets} manutenzioni={man}
        onClose={()=>{sMM(false);siMM(null);}}
        onSalva={f => inModM ? modM({...f,id:inModM.id}) : aggM(f)}
      />}
    </div>
  );
}
