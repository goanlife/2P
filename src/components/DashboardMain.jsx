import React, { useState, useMemo } from "react";
import { useI18n } from "../i18n/index.jsx";
import { AvatarComp } from "./ui/Atoms";

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";

const TIPO_OP = {
  fornitore: { label:"Fornitore", cls:"badge", style:{background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE"} },
  cliente:   { label:"Cliente",   cls:"badge", style:{background:"#EEEDFE",color:"#4F46E5",border:"1px solid #C4B5FD"} },
  interno:   { label:"Interno",   cls:"badge", style:{background:"#ECFDF5",color:"#065F46",border:"1px solid #A7F3D0"} },
};
const STATO_LABEL = { pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };

// ─── Dashboard ────────────────────────────────────────────────────────────
export function Dashboard({man=[], clienti=[], assets=[], piani=[], operatori=[], onNavigate, manTotale=null, manCaricaTutto=false}) {
  const { t } = useI18n();
  const stats=useMemo(()=>({tot:man.length,pi:man.filter(m=>m.stato==="pianificata").length,ic:man.filter(m=>m.stato==="inCorso").length,sc:man.filter(m=>m.stato==="scaduta").length,ur:man.filter(m=>m.priorita==="urgente"&&m.stato!=="completata").length,rq:man.filter(m=>m.stato==="richiesta").length}),[man]);
  const prossime=useMemo(()=>man.filter(m=>m.stato==="pianificata").sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6),[man]);
  const fornitori=useMemo(()=>operatori.filter(o=>o.tipo==="fornitore"),[operatori]);
  const carichi=useMemo(()=>fornitori.map(op=>({...op,att:man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").length,ore:Math.round(man.filter(m=>m.operatoreId===op.id&&m.stato!=="completata").reduce((a,m)=>a+m.durata,0)/60*10)/10})),[man,fornitori]);
  const maxOre=Math.max(...carichi.map(c=>c.ore),1);
  const [confOpen, setConfOpen] = useState(false);
  const oggi = new Date().toISOString().split("T")[0];
  const tra7 = new Date(Date.now()+7*86400000).toISOString().split("T")[0];
  // Conflitti solo nei prossimi 7 giorni (non tutto il futuro)
  const confMap=useMemo(()=>{
    const m={};
    man.filter(x=>x.stato!=="completata"&&x.data>=oggi&&x.data<=tra7)
       .forEach(x=>{const k=`${x.operatoreId}_${x.data}`;if(!m[k])m[k]=[];m[k].push(x);});
    return Object.values(m).filter(g=>g.length>1);
  },[man, oggi]);
  const kpis=[
    {v:manTotale!=null&&!manCaricaTutto ? manTotale : stats.tot, l:"Totale attività"+(manTotale!=null&&!manCaricaTutto?" *":""), c:"#0D1B2A", action:()=>onNavigate("manutenzioni",{})},
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
      {confMap.length>0&&(
        <div style={{position:"relative",display:"inline-block"}}>
          <button onClick={()=>setConfOpen(o=>!o)}
            style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:20,fontSize:13,fontWeight:700,color:"#92400E",cursor:"pointer"}}>
            ⚠ {confMap.length} sovrapposizione{confMap.length>1?"i":""} nei prossimi 7 giorni
          </button>
          {confOpen&&(
            <>
              <div onClick={()=>setConfOpen(false)} style={{position:"fixed",inset:0,zIndex:1998}}/>
              <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:1999,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",minWidth:320,maxWidth:420,maxHeight:320,overflowY:"auto",boxShadow:"0 4px 24px rgba(0,0,0,.18)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#92400E",marginBottom:10}}>⚠ Attività sovrapposte nei prossimi 7 giorni:</div>
                {confMap.slice(0,10).map((g,i)=>{
                  const op=operatori.find(o=>o.id===g[0].operatoreId);
                  return(
                    <div key={k.label||k.l||k.v} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--border-dim)"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600}}>{op?.nome||"—"}</div>
                        <div style={{fontSize:11,color:"var(--text-3)"}}>{g.map(m=>m.titolo).join(" · ")}</div>
                      </div>
                      <div style={{fontSize:11,color:"#92400E",fontWeight:600,whiteSpace:"nowrap"}}>{fmtData(g[0].data)}</div>
                    </div>
                  );
                })}
                {confMap.length>10&&<div style={{fontSize:11,color:"var(--text-3)",marginTop:8}}>...e altri {confMap.length-10}</div>}
                <div style={{fontSize:10,color:"var(--text-3)",marginTop:8}}>Vai al Calendario per gestire le sovrapposizioni.</div>
              </div>
            </>
          )}
        </div>
      )}
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
      {manTotale!=null&&!manCaricaTutto&&(
        <div style={{fontSize:11,color:"var(--text-3)",marginTop:-12,marginBottom:4}}>
          * Dato basato su tutto lo storico · Altri KPI sugli ultimi 6 mesi — <button onClick={()=>onNavigate("manutenzioni",{})} style={{fontSize:11,color:"var(--amber)",background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Carica tutto per dati completi</button>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        <div className="card">
          <div className="section-head"><span className="section-title">📋 Prossime attività</span></div>
          {prossime.map(m=>{const op=fornitori.find(o=>o.id===m.operatoreId)||operatori.find(o=>o.id===m.operatoreId);const cl=clienti.find(c=>c.id===m.clienteId);return(
            <div key={m.id}
              onClick={()=>onNavigate("manutenzioni",{stato:"pianificata"})}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--border)",cursor:"pointer",transition:"background .12s",borderRadius:4}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
              onMouseLeave={e=>e.currentTarget.style.background=""}>
              <AvatarComp nome={op?.nome||"?"} col={op?.col||"#888"} size={32} />
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
          {carichi.map(op=>(<div key={op.id} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:8}}><AvatarComp nome={op.nome} col={op.col} size={28} /><span style={{fontSize:13,fontWeight:600}}>{op.nome}</span></div><span style={{fontSize:11,color:"var(--text-3)",fontWeight:500}}>{op.att} att · {op.ore}h</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${(op.ore/maxOre)*100}%`,background:op.col}} /></div></div>))}
          {carichi.length===0&&<div style={{fontSize:13,color:"var(--text-3)",textAlign:"center",padding:"12px 0"}}>Nessun fornitore attivo</div>}
        </div>
        <div className="card">
          <div className="section-head"><span className="section-title">⚙ Asset per stato</span></div>
          {[{s:"attivo",l:"Attivi",c:"#059669"},{s:"manutenzione",l:"In manutenzione",c:"#D97706"},{s:"inattivo",l:"Inattivi",c:"#DC2626"}].map(({s:st,l,c})=>{const n=assets.filter(a=>a.stato===st).length;return n>0?<div key={st} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border)"}}><span style={{fontSize:13,color:"var(--text-2)"}}>{l}</span><span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16,color:c}}>{n}</span></div>:null;})}
          <div style={{marginTop:16}}><div className="section-title" style={{marginBottom:10}}>👥 Utenti per tipo</div>
            {["fornitore","cliente","interno"].map(t=>{const n=operatori.filter(o=>o.tipo===t).length;const cfg=TIPO_OP[t]||{label:t,style:{}};return <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--border)"}}><span className="badge" style={cfg.style}>{cfg.label}</span><span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16}}>{n}</span></div>;})}
          </div>
        </div>
      </div>
    </div>
  );
}

