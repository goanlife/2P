import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";

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
  { nome:"Marco Rossi",   spec:"Elettrico",  col:"#378ADD" },
  { nome:"Laura Bianchi", spec:"Meccanico",  col:"#1D9E75" },
  { nome:"Giorgio Ferri", spec:"Idraulico",  col:"#D85A30" },
  { nome:"Anna Conti",    spec:"Generico",   col:"#7F77DD" },
];
const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
const BADGE_MAP = {
  ordinaria:   "badge badge-ordinaria",
  straordinaria:"badge badge-straord",
  pianificata: "badge badge-pianificata",
  inCorso:     "badge badge-inCorso",
  completata:  "badge badge-completata",
  scaduta:     "badge badge-scaduta",
};
const STATO_LABEL = { pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };
const TABS = [
  {id:"dashboard",   l:"Dashboard",    icon:"◈"},
  {id:"manutenzioni",l:"Manutenzioni", icon:"⚡"},
  {id:"piani",       l:"Piani",        icon:"🔄"},
  {id:"calendario",  l:"Calendario",   icon:"📅"},
  {id:"assets",      l:"Asset",        icon:"⚙"},
  {id:"operatori",   l:"Operatori",    icon:"👥"},
  {id:"clienti",     l:"Clienti",      icon:"🏢"},
];

// ─── Mappers ──────────────────────────────────────────────────────────────
const mapM  = r => ({ id:r.id, titolo:r.titolo, tipo:r.tipo, stato:r.stato, priorita:r.priorita, operatoreId:r.operatore_id, clienteId:r.cliente_id, assetId:r.asset_id, pianoId:r.piano_id, data:r.data, durata:r.durata, note:r.note||"" });
const mapC  = r => ({ id:r.id, rs:r.rs, piva:r.piva||"", contatto:r.contatto||"", tel:r.tel||"", email:r.email||"", ind:r.ind||"", settore:r.settore||"", note:r.note||"" });
const mapA  = r => ({ id:r.id, nome:r.nome, tipo:r.tipo||"", clienteId:r.cliente_id, ubicazione:r.ubicazione||"", matricola:r.matricola||"", marca:r.marca||"", modello:r.modello||"", dataInst:r.data_inst||"", stato:r.stato||"attivo", note:r.note||"" });
const mapP  = r => ({ id:r.id, nome:r.nome, descrizione:r.descrizione||"", assetId:r.asset_id, clienteId:r.cliente_id, operatoreId:r.operatore_id, tipo:r.tipo||"ordinaria", frequenza:r.frequenza||"mensile", durata:r.durata||60, priorita:r.priorita||"media", dataInizio:r.data_inizio||"", dataFine:r.data_fine||"", attivo:r.attivo });
const mapOp = r => ({ id:r.id, nome:r.nome, spec:r.spec||"", col:r.col||"#378ADD" });
const toDbM  = (f,uid) => ({ titolo:f.titolo, tipo:f.tipo||"ordinaria", stato:f.stato||"pianificata", priorita:f.priorita||"media", operatore_id:f.operatoreId?Number(f.operatoreId):null, cliente_id:f.clienteId?Number(f.clienteId):null, asset_id:f.assetId?Number(f.assetId):null, piano_id:f.pianoId?Number(f.pianoId):null, data:f.data, durata:Number(f.durata)||60, note:f.note||"", user_id:uid });
const toDbC  = (f,uid) => ({ rs:f.rs, piva:f.piva||"", contatto:f.contatto||"", tel:f.tel||"", email:f.email||"", ind:f.ind||"", settore:f.settore||"", note:f.note||"", user_id:uid });
const toDbA  = (f,uid) => ({ nome:f.nome, tipo:f.tipo||"", cliente_id:f.clienteId?Number(f.clienteId):null, ubicazione:f.ubicazione||"", matricola:f.matricola||"", marca:f.marca||"", modello:f.modello||"", data_inst:f.dataInst||null, stato:f.stato||"attivo", note:f.note||"", user_id:uid });
const toDbP  = (f,uid) => ({ nome:f.nome, descrizione:f.descrizione||"", asset_id:f.assetId?Number(f.assetId):null, cliente_id:f.clienteId?Number(f.clienteId):null, operatore_id:f.operatoreId?Number(f.operatoreId):null, tipo:f.tipo||"ordinaria", frequenza:f.frequenza||"mensile", durata:Number(f.durata)||60, priorita:f.priorita||"media", data_inizio:f.dataInizio||null, data_fine:f.dataFine||null, attivo:f.attivo!==false, user_id:uid });
const toDbOp = (f,uid) => ({ nome:f.nome, spec:f.spec||"", col:f.col||"#378ADD", user_id:uid });

// ─── Utils ────────────────────────────────────────────────────────────────
const fmtData  = d => d ? new Date(d).toLocaleDateString("it-IT") : "—";
const isoDate  = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const addDays  = (iso,n) => { const d=new Date(iso); d.setDate(d.getDate()+n); return isoDate(d); };
const addMonths= (iso,n) => { const d=new Date(iso); d.setMonth(d.getMonth()+n); return isoDate(d); };

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
  return (
    <div className="av" style={{width:size,height:size,background:(col||"#888")+"22",color:col||"#888",fontSize:Math.round(size*.34)}}>
      {initials}
    </div>
  );
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
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
          <button
            disabled={!saveOk}
            onClick={()=>{onSave();onClose();}}
            style={saveOk&&saveColor?{background:saveColor,color:"white",borderColor:saveColor}:{}}
            className={saveOk?(saveColor?"":"btn-primary"):""}
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
      <strong>⚠ Conflitto operatore:</strong> {conf.length} attività già pianificata/e in questa data:
      <ul style={{margin:"6px 0 0",paddingLeft:18}}>{conf.map(m=><li key={m.id}>{m.titolo} ({m.durata} min)</li>)}</ul>
    </div>
  );
}

// ─── Modal Operatore ──────────────────────────────────────────────────────
function ModalOperatore({ ini, onClose, onSalva }) {
  const [f,sf]=useState(ini||{nome:"",spec:"",col:"#378ADD"});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <Modal title={ini?"Modifica operatore":"Nuovo operatore"} onClose={onClose} onSave={()=>onSalva(f)} saveOk={!!f.nome.trim()} saveLabel={ini?"Aggiorna":"Aggiungi"}>
      <Field label="Nome *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} placeholder="Es. Mario Rossi..." style={{width:"100%"}} /></Field>
      <Field label="Specializzazione"><input value={f.spec} onChange={e=>s("spec",e.target.value)} placeholder="Es. Elettrico, Meccanico..." style={{width:"100%"}} /></Field>
      <Field label="Colore calendario">
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
          {COLORI_OP.map(c=><div key={c} className={"color-dot"+(f.col===c?" selected":"")} style={{background:c}} onClick={()=>s("col",c)} />)}
        </div>
      </Field>
    </Modal>
  );
}

// ─── Modal Manutenzione ───────────────────────────────────────────────────
function ModalManut({ ini, clienti, assets, manutenzioni, operatori, onClose, onSalva }) {
  const defOp = operatori[0]?.id||"";
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
      <Field label="Operatore"><select value={f.operatoreId||""} onChange={e=>s("operatoreId",Number(e.target.value))} style={{width:"100%"}}><option value="">— Nessun operatore —</option>{operatori.map(o=><option key={o.id} value={o.id}>{o.nome}{o.spec?` — ${o.spec}`:""}</option>)}</select></Field>
      <AvvisoConflitto conflitti={conf} />
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
    </Modal>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ man, clienti, assets, piani, operatori }) {
  const stats=useMemo(()=>({tot:man.length,pi:man.filter(m=>m.stato==="pianificata").length,ic:man.filter(m=>m.stato==="inCorso").length,co:man.filter(m=>m.stato==="completata").length,sc:man.filter(m=>m.stato==="scaduta").length,ur:man.filter(m=>m.priorita==="urgente"&&m.stato!=="completata").length}),[man]);
  const prossime=useMemo(()=>man.filter(m=>m.stato==="pianificata").sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6),[man]);
  const carichi=useMemo(()=>operatori.map(op=>({...op,att:man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").length,ore:Math.round(man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").reduce((a,m)=>a+m.durata,0)/60*10)/10})),[man,operatori]);
  const maxOre=Math.max(...carichi.map(c=>c.ore),1);
  const confMap=useMemo(()=>{const m={};man.filter(x=>x.stato!=="completata").forEach(x=>{const k=`${x.operatoreId}_${x.data}`;if(!m[k])m[k]=[];m[k].push(x);});return Object.values(m).filter(g=>g.length>1);},[man]);

  const kpis = [
    {v:stats.tot, l:"Totale attività", c:"#0D1B2A"},
    {v:clienti.length, l:"Clienti", c:"#7F77DD"},
    {v:assets.length, l:"Asset", c:"#2563EB"},
    {v:piani.filter(p=>p.attivo).length, l:"Piani attivi", c:"#059669"},
    {v:stats.pi, l:"Pianificate", c:"#3B82F6"},
    {v:stats.ic, l:"In corso", c:"#D97706"},
    {v:stats.sc, l:"Scadute", c:"#DC2626"},
    {v:stats.ur, l:"Urgenti", c:"#EF4444"},
  ];

  return (
    <div style={{display:"grid",gap:20}}>
      {confMap.length>0&&(
        <div className="global-conflict">
          <div className="global-conflict-title">⚠ {confMap.length} conflitto/i di calendario rilevati</div>
          {confMap.map((g,i)=>{const op=operatori.find(o=>o.id===g[0].operatoreId);return <div key={i} className="global-conflict-item">→ {op?.nome||"—"} ha {g.length} attività il {fmtData(g[0].data)}: {g.map(x=>x.titolo).join(", ")}</div>;})}
        </div>
      )}

      <div className="kpi-grid">
        {kpis.map(k=>(
          <div key={k.l} className="kpi-card" style={{"--c":k.c}}>
            <div className="kpi-value">{k.v}</div>
            <div className="kpi-label">{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        <div className="card">
          <div className="section-head"><span className="section-title">📋 Prossime attività</span></div>
          <div style={{display:"grid",gap:1}}>
            {prossime.map(m=>{
              const op=operatori.find(o=>o.id===m.operatoreId); const cl=clienti.find(c=>c.id===m.clienteId);
              return (
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                  <Av nome={op?.nome||"?"} col={op?.col||"#888"} size={32} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--text-1)"}}>{m.titolo}</div>
                    <div style={{fontSize:11,color:"var(--text-3)",marginTop:1}}>{fmtData(m.data)} · {m.durata}min{cl?` · ${cl.rs}`:""}</div>
                  </div>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    {m.priorita==="urgente"&&<span className="badge badge-urgente">⚡</span>}
                    {m.pianoId&&<span style={{fontSize:9,fontWeight:700,color:"var(--green)",letterSpacing:".04em"}}>PIANO</span>}
                  </div>
                </div>
              );
            })}
            {!prossime.length&&<div style={{textAlign:"center",padding:"24px 0",color:"var(--text-3)",fontSize:13}}>Nessuna attività pianificata</div>}
          </div>
        </div>

        <div className="card">
          <div className="section-head"><span className="section-title">👥 Carico operatori</span></div>
          {carichi.map(op=>(
            <div key={op.id} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Av nome={op.nome} col={op.col} size={28} />
                  <span style={{fontSize:13,fontWeight:600}}>{op.nome}</span>
                </div>
                <span style={{fontSize:11,color:"var(--text-3)",fontWeight:500}}>{op.att} att · {op.ore}h</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{width:`${(op.ore/maxOre)*100}%`,background:op.col}} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-head"><span className="section-title">⚙ Asset per stato</span></div>
          {[{s:"attivo",l:"Attivi",c:"#059669"},{s:"manutenzione",l:"In manutenzione",c:"#D97706"},{s:"inattivo",l:"Inattivi",c:"#DC2626"}].map(({s:st,l,c})=>{
            const n=assets.filter(a=>a.stato===st).length;
            return n>0?<div key={st} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:13,color:"var(--text-2)"}}>{l}</span>
              <span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16,color:c}}>{n}</span>
            </div>:null;
          })}
          <div style={{marginTop:16}}>
            <div className="section-title" style={{marginBottom:10}}>🔄 Piani recenti</div>
            {piani.slice(0,3).map(p=>{const cl=clienti.find(c=>c.id===p.clienteId);const freq=FREQUENZE.find(f=>f.v===p.frequenza);return(
              <div key={p.id} style={{padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome}</div>
                <div style={{fontSize:11,color:"var(--text-3)",marginTop:1}}>{freq?.l}{cl?` · ${cl.rs}`:""}</div>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lista manutenzioni ───────────────────────────────────────────────────
function ListaManut({ man, clienti, assets, operatori, onStato, onDel, onMod }) {
  const [fT,sfT]=useState("tutti");const [fS,sfS]=useState("tutti");const [fC,sfC]=useState("tutti");const [cerca,sCerca]=useState("");
  const filtrate=useMemo(()=>man.filter(m=>{if(fT!=="tutti"&&m.tipo!==fT)return false;if(fS!=="tutti"&&m.stato!==fS)return false;if(fC!=="tutti"&&String(m.clienteId)!==fC)return false;if(cerca&&!m.titolo.toLowerCase().includes(cerca.toLowerCase()))return false;return true;}),[man,fT,fS,fC,cerca]);
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca manutenzione..." style={{flex:1,minWidth:140}} />
        <select value={fT} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select>
        <select value={fS} onChange={e=>sfS(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="pianificata">Pianificata</option><option value="inCorso">In corso</option><option value="completata">Completata</option><option value="scaduta">Scaduta</option></select>
        <select value={fC} onChange={e=>sfC(e.target.value)}><option value="tutti">Tutti i clienti</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select>
        <span style={{fontSize:12,color:"var(--text-3)",alignSelf:"center",whiteSpace:"nowrap"}}>{filtrate.length} risultati</span>
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
                  <span style={{fontWeight:600,fontSize:14,color:"var(--text-1)"}}>{m.titolo}</span>
                  <span className={BADGE_MAP[m.tipo]||"badge"}>{m.tipo==="ordinaria"?"Ordinaria":"Straord."}</span>
                  <span className={BADGE_MAP[m.stato]||"badge"}>{STATO_LABEL[m.stato]}</span>
                  {m.priorita==="urgente"&&<span className="badge badge-urgente">⚡ Urgente</span>}
                  {m.pianoId&&<span style={{fontSize:10,fontWeight:700,color:"var(--green)",letterSpacing:".04em",background:"#ECFDF5",padding:"2px 6px",borderRadius:4}}>🔄 PIANO</span>}
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:12,color:"var(--text-3)"}}>
                  {cl&&<span style={{color:"#7F77DD",fontWeight:600}}>🏢 {cl.rs}</span>}
                  {as&&<span>⚙ {as.nome}</span>}
                  <span>📅 {fmtData(m.data)}</span>
                  <span>⏱ {m.durata} min</span>
                  {op&&<span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:op.col,display:"inline-block"}} />{op.nome}</span>}
                </div>
                {m.note&&<div style={{fontSize:11.5,color:"var(--text-3)",marginTop:4,fontStyle:"italic"}}>{m.note}</div>}
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0,alignItems:"center"}}>
                {m.stato==="pianificata"&&<button className="btn-sm" onClick={()=>onStato(m.id,"inCorso")}>Avvia ▶</button>}
                {m.stato==="inCorso"&&<button className="btn-sm btn-success" onClick={()=>onStato(m.id,"completata")}>✓ Completa</button>}
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
          <Field label="Operatore"><select value={opId} onChange={e=>sOp(Number(e.target.value))} style={{width:"100%"}}><option value="">— Nessun operatore —</option>{operatori.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></Field>
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
          <option value={0}>Tutti gli operatori</option>
          {operatori.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",padding:"8px 12px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)"}}>
        {operatori.map(op=><div key={op.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11.5,fontWeight:500,color:"var(--text-2)"}}><span style={{width:10,height:10,borderRadius:2,background:op.col,display:"inline-block"}} />{op.nome.split(" ")[0]}</div>)}
        <span style={{fontSize:11,color:"var(--text-3)",marginLeft:"auto"}}>🔄 piano · ⚠ conflitto · trascina per spostare</span>
      </div>
      <div className="cal-grid">
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"var(--surface-2)"}}>
          {GIORNI.map(g=><div key={g} className="cal-day-header">{g}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {celle.map((g,i)=>{
            const isOggi=g&&g===oggi.getDate()&&mese===oggi.getMonth()&&anno===oggi.getFullYear();
            const isDrop=drop===g&&!!drag;const hasConf=g&&giorniConflitto.has(g);const att=g?(attPerG[g]||[]):[];
            let cls="cal-cell";
            if(!g)cls+=" empty";else if(isDrop)cls+=" drop-target";else if(hasConf)cls+=" conflict";
            return (
              <div key={i} className={cls}
                onDragOver={e=>{if(!g||!drag)return;e.preventDefault();sDrop(g);}}
                onDragLeave={()=>sDrop(null)}
                onDrop={e=>{e.preventDefault();if(!g||!drag)return;const nd=toIso(g);if(nd!==drag.data)sRip({manut:drag,nuovaData:nd});sDrag(null);sDrop(null);}}
                onClick={()=>g&&!drag&&onNuovaData(toIso(g))}
              >
                <div className={"cal-day-num"+(isOggi?" today":"")} style={isOggi?{background:"var(--navy)",color:"white",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center"}:{}}>{g}</div>
                {hasConf&&<div style={{fontSize:9,color:"#B45309",marginBottom:2,fontWeight:700}}>⚠</div>}
                {att.slice(0,3).map(m=>{const op=operatori.find(o=>o.id===m.operatoreId);return(
                  <div key={m.id} className="cal-event"
                    draggable={m.stato!=="completata"}
                    onDragStart={e=>{sDrag(m);e.dataTransfer.effectAllowed="move";}}
                    onDragEnd={()=>{sDrag(null);sDrop(null);}}
                    onClick={e=>e.stopPropagation()}
                    title={m.titolo}
                    style={{background:(op?.col||"#888")+"18",color:op?.col||"#888",borderLeftColor:op?.col||"#888",opacity:drag?.id===m.id?.4:1}}
                  >{m.pianoId?"🔄 ":""}{m.titolo}</div>
                );})}
                {att.length>3&&<div style={{fontSize:9,color:"var(--text-3)",paddingLeft:2,fontWeight:600}}>+{att.length-3} altri</div>}
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
function ModalAsset({ ini, clienti, onClose, onSalva }) {
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
    </Modal>
  );
}

function GestioneAssets({ assets, clienti, manutenzioni, onAgg, onMod, onDel }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [cerca,sCerca]=useState("");const [fTipo,sfT]=useState("tutti");const [fSt,sfSt]=useState("tutti");
  const tipi=[...new Set(assets.map(a=>a.tipo).filter(Boolean))];
  const filtrati=useMemo(()=>assets.filter(a=>{if(fTipo!=="tutti"&&a.tipo!==fTipo)return false;if(fSt!=="tutti"&&a.stato!==fSt)return false;if(cerca&&!a.nome.toLowerCase().includes(cerca.toLowerCase())&&!(a.matricola||"").toLowerCase().includes(cerca.toLowerCase()))return false;return true;}),[assets,fTipo,fSt,cerca]);
  const STATO_ASSET = {attivo:{cls:"badge badge-attivo",l:"Attivo"},manutenzione:{cls:"badge badge-inCorso",l:"In manutenzione"},inattivo:{cls:"badge badge-scaduta",l:"Inattivo"}};
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca asset o matricola..." style={{flex:1,minWidth:140}} />
        <select value={fTipo} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option>{tipi.map(t=><option key={t} value={t}>{t}</option>)}</select>
        <select value={fSt} onChange={e=>sfSt(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="attivo">Attivo</option><option value="manutenzione">In manutenzione</option><option value="inattivo">Inattivo</option></select>
        <button className="btn-primary" onClick={()=>{siM(null);ssM(true);}}>+ Nuovo asset</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {filtrati.map(a=>{const cl=clienti.find(c=>c.id===a.clienteId);const manAss=manutenzioni.filter(m=>m.assetId===a.id);const manAtt=manAss.filter(m=>m.stato!=="completata");const sc=STATO_ASSET[a.stato]||STATO_ASSET.inattivo;
          return (
            <div key={a.id} className="asset-card">
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:"var(--radius)",background:"var(--blue-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:"1px solid var(--blue-bd)"}}>⚙</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nome}</div>
                  <div style={{fontSize:11.5,color:"var(--text-3)",marginTop:2}}>{a.tipo}</div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button className="btn-sm btn-icon" onClick={()=>{siM(a);ssM(true);}}>✏</button>
                  <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(a.id)}>✕</button>
                </div>
              </div>
              <div style={{display:"grid",gap:4,fontSize:12,color:"var(--text-2)",marginBottom:12}}>
                {cl&&<div style={{color:"#7F77DD",fontWeight:600}}>🏢 {cl.rs}</div>}
                {a.ubicazione&&<div>📍 {a.ubicazione}</div>}
                {a.matricola&&<div>🔖 {a.matricola}{a.marca?` · ${a.marca}`:""}{a.modello?` ${a.modello}`:""}</div>}
                {a.dataInst&&<div>📅 Installato: {fmtData(a.dataInst)}</div>}
              </div>
              {a.note&&<div style={{fontSize:11.5,color:"var(--text-3)",fontStyle:"italic",marginBottom:10}}>{a.note}</div>}
              <div style={{display:"flex",alignItems:"center",gap:8,borderTop:"1px solid var(--border)",paddingTop:10}}>
                <span className={sc.cls}>{sc.l}</span>
                <span style={{flex:1}} />
                <span style={{fontSize:11.5,color:"var(--text-3)",fontWeight:500}}>{manAtt.length} attive · {manAss.length} tot.</span>
              </div>
            </div>
          );
        })}
      </div>
      {!filtrati.length&&<div className="empty"><div className="empty-icon">⚙</div><div className="empty-text">Nessun asset trovato</div></div>}
      {showM&&<ModalAsset ini={inMod} clienti={clienti} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

// ─── Piani ────────────────────────────────────────────────────────────────
function ModalPiano({ ini, clienti, assets, manutenzioni, operatori, onClose, onSalva }) {
  const defOp = operatori[0]?.id?String(operatori[0].id):"";
  const vuoto={nome:"",descrizione:"",assetId:"",clienteId:"",operatoreId:defOp,tipo:"ordinaria",frequenza:"mensile",durata:60,priorita:"media",dataInizio:"",dataFine:"",attivo:true};
  const normalize=obj=>obj?{...obj,operatoreId:String(obj.operatoreId||defOp),clienteId:obj.clienteId?String(obj.clienteId):"",assetId:obj.assetId?String(obj.assetId):""}:null;
  const [f,sf]=useState(normalize(ini)||vuoto);const s=(k,v)=>sf(p=>({...p,[k]:v}));const ok=f.nome.trim()&&f.dataInizio&&f.frequenza;
  const assetsCliente=useMemo(()=>f.clienteId?assets.filter(a=>String(a.clienteId)===f.clienteId):assets,[f.clienteId,assets]);
  const preview=useMemo(()=>{if(!ok)return[];return generaOccorrenze(f,f.dataInizio,6).slice(0,8);},[f,ok]);
  const previewConf=useMemo(()=>preview.filter(data=>f.operatoreId&&conflitti(manutenzioni,Number(f.operatoreId),data).length>0),[preview,f.operatoreId,manutenzioni]);
  return (
    <Modal title={ini?"Modifica piano":"Nuovo piano di manutenzione"} onClose={onClose} onSave={()=>onSalva({...f,operatoreId:f.operatoreId?Number(f.operatoreId):null,clienteId:f.clienteId?Number(f.clienteId):null,assetId:f.assetId?Number(f.assetId):null})} saveOk={!!ok} saveColor="#059669" saveLabel={ini?"Aggiorna piano":"Crea piano e genera attività"}>
      <Field label="Nome piano *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%"}} /></Field>
      <Field label="Descrizione"><textarea value={f.descrizione} onChange={e=>s("descrizione",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
      <Field label="Cliente"><select value={f.clienteId} onChange={e=>{s("clienteId",e.target.value);s("assetId","");}} style={{width:"100%"}}><option value="">— Nessun cliente —</option>{clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}</select></Field>
      <Field label="Asset"><select value={f.assetId} onChange={e=>s("assetId",e.target.value)} style={{width:"100%"}}><option value="">— Nessun asset —</option>{assetsCliente.map(a=><option key={a.id} value={String(a.id)}>{a.nome}</option>)}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select></Field>
        <Field label="Priorità"><select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}><option value="bassa">Bassa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Frequenza"><select value={f.frequenza} onChange={e=>s("frequenza",e.target.value)} style={{width:"100%"}}>{FREQUENZE.map(fr=><option key={fr.v} value={fr.v}>{fr.l}</option>)}</select></Field>
        <Field label="Durata (min)"><input type="number" value={f.durata} onChange={e=>s("durata",Number(e.target.value))} min={15} step={15} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Operatore"><select value={f.operatoreId} onChange={e=>s("operatoreId",e.target.value)} style={{width:"100%"}}><option value="">— Nessun operatore —</option>{operatori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}{o.spec?` — ${o.spec}`:""}</option>)}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Data inizio *"><input type="date" value={f.dataInizio} onChange={e=>s("dataInizio",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Data fine (opzionale)"><input type="date" value={f.dataFine} onChange={e=>s("dataFine",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      {preview.length>0&&(
        <div className="preview-dates">
          <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--text-2)"}}>Anteprima {preview.length} occorrenze nei prossimi 6 mesi:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {preview.map((data,i)=>{const hC=previewConf.includes(data);return <span key={i} className={"preview-tag"+(hC?" warn":" ok")}>{hC?"⚠ ":""}{fmtData(data)}</span>;})}
          </div>
          {ini&&<div style={{fontSize:11,color:"var(--blue)",marginTop:8,fontWeight:500}}>ℹ Le modifiche si applicheranno alle attività future non completate.</div>}
        </div>
      )}
    </Modal>
  );
}

function GestionePiani({ piani, clienti, assets, manutenzioni, operatori, onAgg, onMod, onDel, onAttivaDisattiva }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);
  return (
    <div style={{display:"grid",gap:12}}>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button className="btn-green-outline" style={{fontWeight:600}} onClick={()=>{siM(null);ssM(true);}}>+ Nuovo piano di manutenzione</button>
      </div>
      {!piani.length&&<div className="empty"><div className="empty-icon">🔄</div><div className="empty-text">Nessun piano. Crea il primo per generare le attività automaticamente.</div></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:12}}>
        {piani.map(p=>{
          const cl=clienti.find(c=>c.id===p.clienteId);const as=assets.find(a=>a.id===p.assetId);const op=operatori.find(o=>o.id===p.operatoreId);const freq=FREQUENZE.find(f=>f.v===p.frequenza);
          const manP=manutenzioni.filter(m=>m.pianoId===p.id);const prossima=manP.filter(m=>m.stato==="pianificata").sort((a,b)=>a.data.localeCompare(b.data))[0];
          return (
            <div key={p.id} className={"piano-card"+(p.attivo?" active":"")}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
                <div style={{width:44,height:44,borderRadius:"var(--radius)",background:p.attivo?"#ECFDF5":"var(--surface-2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:`1px solid ${p.attivo?"#A7F3D0":"var(--border)"}`}}>🔄</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome}</div>
                  <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                    <span className={"badge"+(p.attivo?" badge-attivo":" badge-sospeso")}>{p.attivo?"Attivo":"Sospeso"}</span>
                    <span style={{fontSize:11.5,color:"var(--text-3)",fontWeight:500}}>{freq?.l}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button className="btn-sm btn-icon" onClick={()=>{siM(p);ssM(true);}}>✏</button>
                  <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(p.id)}>✕</button>
                </div>
              </div>
              {p.descrizione&&<div style={{fontSize:12.5,color:"var(--text-2)",marginBottom:10}}>{p.descrizione}</div>}
              <div style={{display:"grid",gap:4,fontSize:12,color:"var(--text-2)",marginBottom:12}}>
                {cl&&<div style={{color:"#7F77DD",fontWeight:600}}>🏢 {cl.rs}</div>}
                {as&&<div>⚙ {as.nome}</div>}
                {op&&<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:op.col,display:"inline-block"}} />{op.nome}</div>}
                <div style={{color:"var(--text-3)"}}>📅 Dal {fmtData(p.dataInizio)}{p.dataFine?` al ${fmtData(p.dataFine)}`:""} · ⏱ {p.durata} min</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",borderTop:"1px solid var(--border)",paddingTop:10}}>
                <span style={{fontSize:12,color:"var(--text-3)",fontWeight:500}}>{manP.length} generate · {prossima?`Prossima: ${fmtData(prossima.data)}`:"Nessuna pianificata"}</span>
                <span style={{flex:1}} />
                <button className={"btn-sm"+(p.attivo?"":" btn-green-outline")} onClick={()=>onAttivaDisattiva(p.id,!p.attivo)}>{p.attivo?"Sospendi":"▶ Riattiva"}</button>
              </div>
            </div>
          );
        })}
      </div>
      {showM&&<ModalPiano key={inMod?.id??'new'} ini={inMod} clienti={clienti} assets={assets} manutenzioni={manutenzioni} operatori={operatori} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...f,id:inMod.id}):onAgg(f)} />}
    </div>
  );
}

// ─── Clienti ──────────────────────────────────────────────────────────────
function ModalCliente({ ini, onClose, onSalva }) {
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
    </Modal>
  );
}

function GestioneClienti({ clienti, manutenzioni, assets, onAgg, onMod, onDel }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [cerca,sCerca]=useState("");
  const filtrati=useMemo(()=>clienti.filter(c=>!cerca||c.rs.toLowerCase().includes(cerca.toLowerCase())||c.contatto.toLowerCase().includes(cerca.toLowerCase())),[clienti,cerca]);
  const BG_COLORS=["#EEEDFE","#E6F1FB","#ECFDF5","#FEF3C7","#FEF2F2","#F0F4FF"];
  const TX_COLORS=["#534AB7","#1E40AF","#065F46","#92400E","#991B1B","#3730A3"];
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca cliente o contatto..." style={{flex:1}} />
        <button style={{color:"#7F77DD",borderColor:"#C4B5FD",background:"#EEEDFE",fontWeight:600}} onClick={()=>{siM(null);ssM(true);}}>+ Nuovo cliente</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {filtrati.map((c,idx)=>{
          const nAtt=manutenzioni.filter(m=>m.clienteId===c.id&&m.stato!=="completata").length;
          const nAs=assets.filter(a=>a.clienteId===c.id).length;
          const ur=manutenzioni.filter(m=>m.clienteId===c.id&&m.priorita==="urgente"&&m.stato!=="completata").length;
          const ini=c.rs.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
          const bg=BG_COLORS[idx%BG_COLORS.length];const tx=TX_COLORS[idx%TX_COLORS.length];
          return (
            <div key={c.id} className="client-card">
              <div style={{display:"flex",gap:12,marginBottom:12}}>
                <div style={{width:46,height:46,borderRadius:"var(--radius)",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,color:tx,flexShrink:0}}>{ini}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.rs}</div>
                  {c.settore&&<div style={{fontSize:11.5,color:"#7F77DD",fontWeight:500,marginTop:2}}>{c.settore}</div>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button className="btn-sm btn-icon" onClick={()=>{siM(c);ssM(true);}}>✏</button>
                  <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(c.id)}>✕</button>
                </div>
              </div>
              <div style={{fontSize:12,color:"var(--text-2)",display:"grid",gap:3,marginBottom:12}}>
                {c.contatto&&<div>👤 {c.contatto}</div>}
                {c.tel&&<div>📞 {c.tel}</div>}
                {c.email&&<div>✉ {c.email}</div>}
              </div>
              <div style={{display:"flex",gap:0,borderTop:"1px solid var(--border)",paddingTop:10}}>
                {[{v:nAtt,l:"Attive",c:"#2563EB"},{v:nAs,l:"Asset",c:"var(--text-1)"},{v:ur>0?ur:null,l:"Urgenti",c:"#DC2626"}].map(({v,l,c})=>v!=null?(
                  <div key={l} style={{flex:1,textAlign:"center",padding:"4px 0"}}>
                    <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:18,color:c}}>{v}</div>
                    <div style={{fontSize:10,color:"var(--text-3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{l}</div>
                  </div>
                ):null)}
              </div>
            </div>
          );
        })}
      </div>
      {showM&&<ModalCliente ini={inMod} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

// ─── Operatori ────────────────────────────────────────────────────────────
function GestioneOperatori({ operatori, man, onAgg, onMod, onDel }) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);
  return (
    <div style={{display:"grid",gap:12}}>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button className="btn-primary" onClick={()=>{siM(null);ssM(true);}}>+ Nuovo operatore</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
        {operatori.map(op=>{
          const sue=man.filter(m=>m.operatoreId===op.id);const att=sue.filter(m=>m.stato!=="completata");
          const ore=Math.round(att.reduce((s,m)=>s+m.durata,0)/60*10)/10;const urg=att.filter(m=>m.priorita==="urgente");
          return (
            <div key={op.id} className="op-card">
              <div className="op-card-accent" style={{background:op.col}} />
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,marginTop:4}}>
                <Av nome={op.nome} col={op.col} size={46} />
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:15}}>{op.nome}</div>
                  <div style={{fontSize:12,color:"var(--text-3)",marginTop:1}}>{op.spec||"—"}</div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button className="btn-sm btn-icon" onClick={()=>{siM(op);ssM(true);}}>✏</button>
                  <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(op.id)}>✕</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[{v:att.length,l:"Attive",c:op.col},{v:sue.filter(m=>m.stato==="completata").length,l:"Completate",c:"#059669"},{v:ore+"h",l:"Ore totali",c:"var(--text-1)"}].map(({v,l,c})=>(
                  <div key={l} className="stat-mini">
                    <div className="stat-mini-value" style={{color:c}}>{v}</div>
                    <div className="stat-mini-label">{l}</div>
                  </div>
                ))}
              </div>
              {urg.length>0&&<div style={{background:"#FFF1F2",border:"1px solid #FECDD3",borderLeft:"3px solid #EF4444",borderRadius:"var(--radius-sm)",padding:"8px 12px",fontSize:12,color:"#9F1239",marginBottom:10,fontWeight:500}}>⚡ {urg.length} attività urgente{urg.length>1?"i":""}</div>}
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {att.slice(0,3).map(m=>(
                  <div key={m.id} style={{fontSize:12,padding:"7px 10px",borderRadius:"var(--radius-sm)",background:"var(--surface-2)",border:"1px solid var(--border)"}}>
                    <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.pianoId?"🔄 ":""}{m.titolo}</div>
                    <div style={{color:"var(--text-3)",fontSize:11,marginTop:2}}>{fmtData(m.data)} · {m.durata} min</div>
                  </div>
                ))}
                {att.length>3&&<div style={{fontSize:11,color:"var(--text-3)",textAlign:"center",fontWeight:500}}>+{att.length-3} altre attività</div>}
                {!att.length&&<div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"10px 0"}}>Nessuna attività attiva</div>}
              </div>
            </div>
          );
        })}
      </div>
      {showM&&<ModalOperatore ini={inMod} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────
export default function App() {
  const [session,  setSess] = useState(null);
  const [loading,  setLoad] = useState(true);
  const [dbErr,    setDbErr] = useState(null);
  const [man,      sMan]  = useState([]);
  const [clienti,  sCl]   = useState([]);
  const [assets,   sAs]   = useState([]);
  const [piani,    sPi]   = useState([]);
  const [operatori,sOp]   = useState([]);
  const [vista,   sV]  = useState("dashboard");
  const [modalM,  sMM] = useState(false);
  const [inModM,  siMM]= useState(null);
  const [dataDef, sDD] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSess(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSess(s); if (!s) { sMan([]); sCl([]); sAs([]); sPi([]); sOp([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setLoad(false); return; }
    setLoad(true);
    Promise.all([
      supabase.from("operatori").select("*").order("created_at"),
      supabase.from("clienti").select("*").order("created_at"),
      supabase.from("assets").select("*").order("created_at"),
      supabase.from("piani").select("*").order("created_at"),
      supabase.from("manutenzioni").select("*").order("data"),
    ]).then(async ([ro, rc, ra, rp, rm]) => {
      if (ro.error||rc.error||ra.error||rp.error||rm.error) { setDbErr("Errore caricamento dati."); setLoad(false); return; }
      let ops = ro.data;
      if (ops.length === 0) {
        const { data: seeded } = await supabase.from("operatori").insert(OP_DEFAULT.map(o => ({ ...o, user_id: session.user.id }))).select();
        ops = seeded || [];
      }
      sOp(ops.map(mapOp)); sCl(rc.data.map(mapC)); sAs(ra.data.map(mapA)); sPi(rp.data.map(mapP)); sMan(rm.data.map(mapM));
      setLoad(false);
    });
  }, [session]);

  const uid = () => session?.user?.id;
  const BATCH = 50;
  const buildRowM = (piano, data) => ({ titolo:piano.nome, tipo:piano.tipo||"ordinaria", stato:"pianificata", priorita:piano.priorita||"media", operatore_id:piano.operatoreId||null, cliente_id:piano.clienteId||null, asset_id:piano.assetId||null, piano_id:piano.id, data, durata:Number(piano.durata)||60, note:piano.descrizione||"", user_id:uid() });

  const aggM = async f => { const {data,error}=await supabase.from("manutenzioni").insert(toDbM(f,uid())).select().single(); if(!error)sMan(p=>[...p,mapM(data)]); };
  const modM = async f => { const {error}=await supabase.from("manutenzioni").update(toDbM(f,uid())).eq("id",f.id); if(!error)sMan(p=>p.map(m=>m.id===f.id?{...m,...f}:m)); };
  const delM = async id => { await supabase.from("manutenzioni").delete().eq("id",id); sMan(p=>p.filter(m=>m.id!==id)); };
  const statoM = async (id,stato) => { await supabase.from("manutenzioni").update({stato}).eq("id",id); sMan(p=>p.map(m=>m.id===id?{...m,stato}:m)); };
  const ripiM = async (id,data,operatoreId) => { const m=man.find(x=>x.id===id);const ns=m?.stato==="scaduta"?"pianificata":m?.stato; await supabase.from("manutenzioni").update({data,operatore_id:operatoreId||null,stato:ns}).eq("id",id); sMan(p=>p.map(x=>x.id===id?{...x,data,operatoreId,stato:ns}:x)); };
  const aggC = async f => { const {data,error}=await supabase.from("clienti").insert(toDbC(f,uid())).select().single(); if(!error)sCl(p=>[...p,mapC(data)]); };
  const modC = async f => { await supabase.from("clienti").update(toDbC(f,uid())).eq("id",f.id); sCl(p=>p.map(c=>c.id===f.id?{...c,...f}:c)); };
  const delC = async id => { await supabase.from("clienti").delete().eq("id",id); sCl(p=>p.filter(c=>c.id!==id)); };
  const aggA = async f => { const {data,error}=await supabase.from("assets").insert(toDbA(f,uid())).select().single(); if(!error)sAs(p=>[...p,mapA(data)]); };
  const modA = async f => { await supabase.from("assets").update(toDbA(f,uid())).eq("id",f.id); sAs(p=>p.map(a=>a.id===f.id?{...a,...f}:a)); };
  const delA = async id => { await supabase.from("assets").delete().eq("id",id); sAs(p=>p.filter(a=>a.id!==id)); };
  const aggOp = async f => { const {data,error}=await supabase.from("operatori").insert(toDbOp(f,uid())).select().single(); if(!error)sOp(p=>[...p,mapOp(data)]); };
  const modOp = async f => { const {error}=await supabase.from("operatori").update(toDbOp(f,uid())).eq("id",f.id); if(!error)sOp(p=>p.map(o=>o.id===f.id?{...o,...f}:o)); };
  const delOp = async id => { await supabase.from("operatori").delete().eq("id",id); sOp(p=>p.filter(o=>o.id!==id)); };

  const aggPiano = async f => {
    const piano={...f,clienteId:f.clienteId?Number(f.clienteId):null,assetId:f.assetId?Number(f.assetId):null,operatoreId:f.operatoreId?Number(f.operatoreId):null};
    const {data:pianoRow,error:pErr}=await supabase.from("piani").insert(toDbP(piano,uid())).select().single();
    if(pErr){console.error("aggPiano:",pErr);return;}
    const np=mapP(pianoRow); sPi(p=>[...p,np]);
    if(!np.dataInizio)return;
    const occ=generaOccorrenze(np,np.dataInizio,12); if(!occ.length)return;
    let saved=[];
    for(let i=0;i<occ.length;i+=BATCH){const {data:chunk,error:e}=await supabase.from("manutenzioni").insert(occ.slice(i,i+BATCH).map(d=>buildRowM(np,d))).select();if(e){console.error(e);break;}if(chunk)saved=[...saved,...chunk.map(mapM)];}
    if(saved.length)sMan(p=>[...p,...saved]);
  };
  const modPiano = async f => {
    const upd={...f,operatoreId:f.operatoreId?Number(f.operatoreId):null,clienteId:f.clienteId?Number(f.clienteId):null,assetId:f.assetId?Number(f.assetId):null};
    const {error}=await supabase.from("piani").update(toDbP(upd,uid())).eq("id",upd.id); if(error){console.error(error);return;}
    sPi(p=>p.map(pi=>pi.id===upd.id?upd:pi));
    const oggi=isoDate(new Date());
    await supabase.from("manutenzioni").delete().eq("piano_id",upd.id).eq("stato","pianificata");
    sMan(prev=>prev.filter(m=>m.pianoId!==upd.id||m.stato==="completata"||m.stato==="inCorso"));
    if(!upd.dataInizio)return;
    const dp=upd.dataInizio>oggi?upd.dataInizio:oggi; const occ=generaOccorrenze(upd,dp,12); if(!occ.length)return;
    let saved=[];
    for(let i=0;i<occ.length;i+=BATCH){const {data:chunk,error:e}=await supabase.from("manutenzioni").insert(occ.slice(i,i+BATCH).map(d=>buildRowM(upd,d))).select();if(e){console.error(e);break;}if(chunk)saved=[...saved,...chunk.map(mapM)];}
    if(saved.length)sMan(p=>[...p,...saved]);
  };
  const delPiano = async id => { await supabase.from("manutenzioni").delete().eq("piano_id",id); await supabase.from("piani").delete().eq("id",id); sPi(p=>p.filter(pi=>pi.id!==id)); sMan(p=>p.filter(m=>m.pianoId!==id)); };
  const attivaDisattiva = async (id,attivo) => { await supabase.from("piani").update({attivo}).eq("id",id); sPi(p=>p.map(pi=>pi.id===id?{...pi,attivo}:pi)); };

  const apriConData = d => { sDD(d); siMM(null); sMM(true); };
  const apriModM   = m => { siMM(m); sDD(""); sMM(true); };
  const logout     = () => supabase.auth.signOut();

  if (!session) return <Auth />;

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">🔧</div>
      <div style={{fontFamily:"var(--font-head)",fontSize:22,fontWeight:700,color:"white",letterSpacing:"-.01em"}}>ManuMan</div>
      <div className="loading-text">Caricamento in corso…</div>
    </div>
  );

  if (dbErr) return (
    <div className="error-screen">
      <div className="error-box">
        <div style={{fontSize:28,marginBottom:12}}>⚠️</div>
        <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:18,marginBottom:8}}>Errore database</div>
        <div style={{fontSize:13,color:"var(--red)"}}>{dbErr}</div>
        <div style={{fontSize:12,color:"var(--text-3)",marginTop:10}}>Esegui di nuovo <strong>schema.sql</strong> nel SQL Editor di Supabase.</div>
        <button className="btn-primary" onClick={logout} style={{marginTop:16}}>Logout</button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <nav className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">🔧</div>
          <div>
            <div className="topbar-logo-text">ManuMan</div>
            <div className="topbar-logo-sub">Gestione Manutenzioni</div>
          </div>
        </div>
        <div className="topbar-nav">
          {TABS.map(t=>(
            <button key={t.id} className={"nav-btn"+(vista===t.id?" active":"")} onClick={()=>sV(t.id)}>
              <span className="nav-icon">{t.icon}</span>{t.l}
            </button>
          ))}
        </div>
        <div className="topbar-actions">
          <button className="btn-new" onClick={()=>{siMM(null);sDD("");sMM(true);}}>
            + Nuova attività
          </button>
          <button className="btn-logout" onClick={logout} title="Esci">↩</button>
        </div>
      </nav>

      <main className="page-content">
        {vista==="dashboard"    && <Dashboard    man={man} clienti={clienti} assets={assets} piani={piani} operatori={operatori} />}
        {vista==="manutenzioni" && <ListaManut   man={man} clienti={clienti} assets={assets} operatori={operatori} onStato={statoM} onDel={delM} onMod={apriModM} />}
        {vista==="piani"        && <GestionePiani piani={piani} clienti={clienti} assets={assets} manutenzioni={man} operatori={operatori} onAgg={aggPiano} onMod={modPiano} onDel={delPiano} onAttivaDisattiva={attivaDisattiva} />}
        {vista==="calendario"   && <Calendario   man={man} clienti={clienti} assets={assets} operatori={operatori} onRipianifica={ripiM} onNuovaData={apriConData} />}
        {vista==="assets"       && <GestioneAssets assets={assets} clienti={clienti} manutenzioni={man} onAgg={aggA} onMod={modA} onDel={delA} />}
        {vista==="operatori"    && <GestioneOperatori operatori={operatori} man={man} onAgg={aggOp} onMod={modOp} onDel={delOp} />}
        {vista==="clienti"      && <GestioneClienti clienti={clienti} manutenzioni={man} assets={assets} onAgg={aggC} onMod={modC} onDel={delC} />}
      </main>

      {modalM && <ModalManut
        ini={inModM?{...inModM}:dataDef?{titolo:"",tipo:"ordinaria",priorita:"media",operatoreId:operatori[0]?.id||"",clienteId:null,assetId:null,data:dataDef,durata:60,note:"",stato:"pianificata",pianoId:null}:null}
        clienti={clienti} assets={assets} manutenzioni={man} operatori={operatori}
        onClose={()=>{sMM(false);siMM(null);}}
        onSalva={f=>inModM?modM({...f,id:inModM.id}):aggM(f)}
      />}
    </div>
  );
}
