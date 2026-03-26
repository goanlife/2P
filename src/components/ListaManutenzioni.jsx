import { SottotipoBadge } from "./GestioneRichieste";
import { useI18n } from "../i18n/index.jsx";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { PannelloAllegati } from "./AllegatiTemi";
import { AvatarComp, AvvisoConflitto, Field, Modal } from "./ui/Atoms";
import { ChecklistIntervento } from "./PianoChecklist";
import { InterventoRicambi } from "./GestioneRicambi";
import { CommentiAttivita } from "./CommentiAttivita";
import { SLABadge } from "./SLABadge";

function conflitti(manutenzioni, operatoreId, data, escludiId=null) {
  return (manutenzioni||[]).filter(m=>m.operatoreId===Number(operatoreId)&&m.data===data&&m.stato!=="completata"&&m.id!==escludiId);
}

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";

const STATO_LABEL = { pianificata:t("stati.pianificata"), inCorso:t("stati.inCorso"), completata:t("stati.completata"), scaduta:t("stati.scaduta"), richiesta:"📋 Richiesta", rifiutata:"✕ Rifiutata" };

const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };

// ─── Modal Manutenzione ───────────────────────────────────────────────────
export function ModalManut({ini, clienti=[], assets=[], manutenzioni=[], operatori=[], onClose, onSalva, userId, meOperatore=null}) {
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
      {ini?.id&&ini?.pianoId&&(
        <div style={{borderTop:"1px solid var(--border)",paddingTop:16,marginTop:4}}>
          {ini.stato!=="inCorso"&&<div style={{fontSize:11,color:"var(--text-3)",marginBottom:6,fontStyle:"italic"}}>🔒 Avvia l'attività per compilare la checklist</div>}
          <ChecklistIntervento manutenzione={{...ini,numero_intervento:ini.numeroIntervento||1}} stato={ini.stato} />
        </div>
      )}
      {ini?.id&&<PannelloAllegati entitaTipo="manutenzione" entitaId={ini.id} userId={userId||""} />}
      {ini?.id&&(
        <div style={{borderTop:"1px solid var(--border)",paddingTop:16,marginTop:8}}>
          <CommentiAttivita manutenzioneId={ini.id} meOperatore={meOperatore} onStatoChange={null} />
        </div>
      )}
    </Modal>
  );
}



// ─── Lista manutenzioni ───────────────────────────────────────────────────
// Mini badge checklist per la card manutenzione
export function ChecklistBadge({manutenzioneId, pianoId, numeroIntervento}) {
  const [prog, setProg] = useState(null);
  useEffect(() => {
    if (!pianoId || !manutenzioneId) return;
    Promise.all([
      supabase.from("piano_checklist").select("id,obbligatorio,ogni_n_interventi").eq("piano_id", pianoId),
      supabase.from("manutenzione_checklist").select("step_id,completato").eq("manutenzione_id", manutenzioneId)
    ]).then(([{data:steps},{data:stato}]) => {
      if (!steps?.length) return;
      const n = numeroIntervento || 1;
      // Solo step attivi per questo intervento — stessa logica di ChecklistIntervento
      const attivi = steps.filter(s => {
        const ogni = s.ogni_n_interventi || 1;
        return ogni === 1 || n % ogni === 0;
      });
      if (!attivi.length) return;
      const done = (stato||[]).filter(x => attivi.some(a => a.id === x.step_id) && x.completato).length;
      setProg({ tot: attivi.length, done, perc: Math.round(done/attivi.length*100) });
    }).catch(e => console.warn("checklist:", e.message));
  }, [manutenzioneId, pianoId, numeroIntervento]);
  if (!prog) return null;
  const color = prog.perc === 100 ? "#059669" : prog.done > 0 ? "#F59E0B" : "var(--text-3)";
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color,background:prog.perc===100?"#ECFDF5":prog.done>0?"#FFFBEB":"var(--surface-2)",padding:"2px 7px",borderRadius:4,border:`1px solid ${prog.perc===100?"#A7F3D0":prog.done>0?"#FDE68A":"var(--border)"}`}}>
      ✅ {prog.done}/{prog.tot}
    </span>
  );
}

export function ListaManut({man=[], clienti=[], assets=[], operatori=[], onStato, onDel, onMod, onDup, initialFilters, onChiudi, onVerbale, readOnly=false, slaConfig=[], slaProfili=[]}) {
  const { t } = useI18n();
  const [fT,sfT]=useState(initialFilters?.tipo||"tutti");
  const [fS,sfS]=useState(initialFilters?.stato||"tutti");
  const [fC,sfC]=useState("tutti");
  const [cerca,sCerca]=useState("");
  const [fPri,sfPri]=useState(initialFilters?.priorita||"tutti");
  const [ordinamento, setOrd] = useState("data");
  const PRIOR = { urgente:0, alta:1, media:2, bassa:3 };
  const STATO_ORD = { scaduta:0, inCorso:1, pianificata:2, completata:3 };
  // Genera numero attività formattato: [COD]-[ANNO]-[NNN] o #N
  const fmtNumero = (m) => {
    const cl = clienti.find(c=>c.id===m.clienteId);
    const anno = m.data ? m.data.slice(0,4) : new Date().getFullYear();
    const n = m.pianoId ? (m.numeroIntervento||1) : m.id;
    const nStr = String(n).padStart(3,"0");
    // Con codice cliente: ROSS-2025-003 (sempre, con o senza piano)
    if (cl?.codice) return `${cl.codice}-${anno}-${nStr}`;
    // Senza codice ma con piano: 2025-003
    if (m.pianoId) return `${anno}-${nStr}`;
    // Standalone senza codice: #104
    return `#${m.id}`;
  };

  const filtrate=useMemo(()=>{
    const r = man.filter(m=>{
      if(fT!=="tutti"&&m.tipo!==fT)return false;
      if(fS!=="tutti"&&m.stato!==fS)return false;
      if(fC!=="tutti"&&String(m.clienteId)!==fC)return false;
      if(fPri!=="tutti"&&m.priorita!==fPri)return false;
      if(cerca&&!m.titolo.toLowerCase().includes(cerca.toLowerCase()))return false;
      return true;
    });
    return [...r].sort((a,b)=>{
      if(ordinamento==="data") return (a.data||"")>(b.data||"")?1:-1;
      if(ordinamento==="priorita") return (PRIOR[a.priorita]??2)-(PRIOR[b.priorita]??2);
      if(ordinamento==="stato") return (STATO_ORD[a.stato]??2)-(STATO_ORD[b.stato]??2);
      return 0;
    });
  },[man,fT,fS,fC,fPri,cerca,ordinamento]);
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <select value={ordinamento} onChange={e=>setOrd(e.target.value)} style={{padding:"6px 8px",border:"1px solid var(--border-dim)",borderRadius:6,fontSize:12,background:"var(--surface)"}}>
          <option value="data">📅 Data</option>
          <option value="stato">🚦 Stato</option>
          <option value="priorita">⚡ Priorità</option>
        </select>
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca manutenzione..." style={{flex:1,minWidth:140}} />
        <select value={fT} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option><option value="ordinaria">Ordinaria</option><option value="straordinaria">Straordinaria</option></select>
        <select value={fS} onChange={e=>sfS(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="richiesta">📋 Richiesta</option><option value="rifiutata">✕ Rifiutata</option><option value="pianificata">Pianificata</option><option value="inCorso">In corso</option><option value="completata">Completata</option><option value="scaduta">Scaduta</option></select>
        <select value={fC} onChange={e=>sfC(e.target.value)}><option value="tutti">Tutti i clienti</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select>
        <select value={fPri} onChange={e=>sfPri(e.target.value)}><option value="tutti">Tutte le priorità</option><option value="urgente">⚡ Urgente</option><option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option></select>
        <span style={{fontSize:12,color:"var(--text-3)",alignSelf:"center",whiteSpace:"nowrap"}}>{filtrate.length} risultati{(fT!=="tutti"||fS!=="tutti"||fC!=="tutti"||fPri!=="tutti"||cerca)?" (filtri attivi)":""}</span>
        {(fT!=="tutti"||fS!=="tutti"||fC!=="tutti"||fPri!=="tutti"||cerca)&&(
          <button onClick={()=>{sfT("tutti");sfS("tutti");sfC("tutti");sfPri("tutti");sCerca("");}}
            style={{fontSize:11,padding:"5px 10px",background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA",borderRadius:5,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
            ✕ Reset
          </button>
        )}
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
              {op&&<AvatarComp nome={op.nome} col={op.col} size={36} />}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:5}}>
                  {haConf&&<span style={{fontSize:12}}>⚠️</span>}
                  <span style={{fontSize:11,fontWeight:700,color:"var(--text-3)",fontFamily:"var(--font-head)",background:"var(--surface-2)",border:"1px solid var(--border)",padding:"1px 7px",borderRadius:99,flexShrink:0}}>{fmtNumero(m)}</span>
                  <span style={{fontWeight:600,fontSize:14}}>{m.titolo}</span>
                  <span className={"badge "+(m.tipo==="ordinaria"?"badge-ordinaria":"badge-straord")}>{m.tipo==="ordinaria"?t("tipi.ordinaria"):"Straord."}</span>
                  <span className={"badge badge-"+m.stato}>{STATO_LABEL[m.stato]}</span>
                  {m.priorita==="urgente"&&<span className="badge badge-urgente">⚡ Urgente</span>}
                  {m.pianoId&&<span style={{fontSize:10,fontWeight:700,color:"var(--green)",background:"#ECFDF5",padding:"2px 6px",borderRadius:4}}>🔄 PIANO</span>}
                  {m.odlId&&<span style={{fontSize:10,fontWeight:700,color:"#4338CA",background:"#EEF2FF",padding:"2px 6px",borderRadius:4}}>📋 OdL</span>}
                  <SLABadge manutenzione={m} slaConfig={slaConfig} clienti={clienti} slaProfili={slaProfili} />
                  {m.fermoImpianto&&<span style={{fontSize:10,fontWeight:700,background:"#FEF2F2",color:"#DC2626",padding:"1px 6px",borderRadius:99,border:"1px solid #FECACA"}}>⛔ Fermo</span>}
                  {m.pianoId&&m.stato!=="completata"&&<ChecklistBadge manutenzioneId={m.id} pianoId={m.pianoId} numeroIntervento={m.numeroIntervento} />}
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
                {!readOnly && <button className="btn-sm btn-icon" onClick={()=>onMod(m)} title="Modifica">✏</button>}
                  {!readOnly && onDup && <button className="btn-sm btn-icon" onClick={()=>onDup(m)} title="Duplica attività" style={{opacity:.7}}>⧉</button>}
                {!readOnly && <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(m.id)}>✕</button>}
              </div>
            </div>
          );
        })}
        {!filtrate.length&&<div className="empty"><div className="empty-icon">📋</div><div className="empty-text">Nessuna attività trovata</div></div>}
      </div>
    </div>
  );
}

