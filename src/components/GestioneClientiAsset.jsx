import React, { useState, useMemo } from "react";
import { supabase } from "../supabase";

// ─── Asset ────────────────────────────────────────────────────────────────
export function ModalAsset({ ini, clienti, onClose, onSalva, userId }) {
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

export function GestioneAssets({ assets, clienti, manutenzioni, onAgg, onMod, onDel, onQR }) {
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



// ─── Clienti ──────────────────────────────────────────────────────────────
export function ModalCliente({ ini, onClose, onSalva, userId }) {
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

export function GestioneClienti({ clienti, manutenzioni, assets, onAgg, onMod, onDel }) {
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

