import { useI18n } from "../i18n/index.jsx";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { AssetSaluteBadge } from "./TemplateAsset";
import { PianiAsset } from "./ApplicaTemplate";
import { SelectSLAProfilo } from "./GestioneSLAProfili";
import { ImportaClienti } from "./ImportaClienti";
import { ImportaAsset } from "./ImportaAsset";
import { HelpButton } from "./HelpPanel";
import { supabase } from "../supabase";
import { PannelloAllegati } from "./AllegatiTemi";
import { Field, Modal } from "./ui/Atoms";

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";

// ─── Asset ────────────────────────────────────────────────────────────────
export function ModalAsset({ini, clienti=[], onClose, onSalva, userId}) {
  const [f,sf]=useState(ini||{nome:"",tipo:"",clienteId:"",ubicazione:"",matricola:"",marca:"",modello:"",dataInst:"",stato:"attivo",note:"",ore_utilizzo:"",soglia_ore:"",costo_acquisto:"",garanzia_al:"",vita_utile_anni:"",specifiche_json:""});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const TIPI=["Impianto elettrico","Linea produzione","Impianto termico","Impianto pneumatico","Impianto idraulico","Sicurezza","Meccanico","Altro"];
  return (
    <Modal title={ini?"Modifica asset":"Nuovo asset"} onClose={onClose} onSave={()=>onSalva({...f,clienteId:f.clienteId?Number(f.clienteId):null})} saveOk={!!f.nome.trim()}>
      <Field label="Nome asset *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
        <Field label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={{width:"100%"}}><option value="">— Seleziona —</option>{TIPI.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Stato"><select value={f.stato} onChange={e=>s("stato",e.target.value)} style={{width:"100%"}}><option value="attivo">Attivo</option><option value="manutenzione">In manutenzione</option><option value="inattivo">Inattivo</option></select></Field>
      </div>
      <Field label="Cliente"><select value={f.clienteId||""} onChange={e=>s("clienteId",e.target.value?Number(e.target.value):"")} style={{width:"100%"}}><option value="">— Nessun cliente —</option>{clienti.map(c=><option key={c.id} value={c.id}>{c.rs}</option>)}</select></Field>
      <Field label="Ubicazione"><input value={f.ubicazione} onChange={e=>s("ubicazione",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12}}>
        <Field label="Matricola"><input value={f.matricola} onChange={e=>s("matricola",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Marca"><input value={f.marca} onChange={e=>s("marca",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Modello"><input value={f.modello} onChange={e=>s("modello",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Data installazione"><input type="date" value={f.dataInst} onChange={e=>s("dataInst",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{borderTop:"1px solid var(--border-dim)",paddingTop:14,marginTop:6}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>📊 Dati tecnici e costi</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
          <Field label="Ore utilizzo attuali"><input type="number" min="0" step="0.5" value={f.ore_utilizzo||""} onChange={e=>s("ore_utilizzo",e.target.value)} style={{width:"100%"}} placeholder="Es. 1250" /></Field>
          <Field label="Soglia intervento (ore)"><input type="number" min="0" step="50" value={f.soglia_ore||""} onChange={e=>s("soglia_ore",e.target.value)} style={{width:"100%"}} placeholder="Es. 500 (ogni 500h)" /></Field>
          <Field label="Costo acquisto (€)"><input type="number" min="0" step="100" value={f.costo_acquisto||""} onChange={e=>s("costo_acquisto",e.target.value)} style={{width:"100%"}} placeholder="Es. 8500" /></Field>
          <Field label="Garanzia fino al"><input type="date" value={f.garanzia_al||""} onChange={e=>s("garanzia_al",e.target.value)} style={{width:"100%"}} /></Field>
          <Field label="Vita utile stimata (anni)"><input type="number" min="0" step="1" value={f.vita_utile_anni||""} onChange={e=>s("vita_utile_anni",e.target.value)} style={{width:"100%"}} placeholder="Es. 15" /></Field>
          <Field label="Specifiche tecniche"><input value={f.specifiche_json||""} onChange={e=>s("specifiche_json",e.target.value)} style={{width:"100%"}} placeholder={`Es. Potenza: 7.5kW, Pressione: 10bar`} /></Field>
        </div>
      </div>
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
      {ini?.id&&<PannelloAllegati entitaTipo="asset" entitaId={ini.id} userId={userId||""} />}
    </Modal>
  );
}

// ─── Menu dropdown esportazione ───────────────────────────────────────────
function EsportaMenu({ onEsportaTutti, onEsportaFiltrati, nFiltrati, nTotali }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef();

  React.useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ fontSize:12, padding:"7px 14px", borderRadius:7, fontWeight:600,
          background:"var(--surface)", border:"1px solid var(--border)", cursor:"pointer",
          display:"flex", alignItems:"center", gap:6 }}>
        📤 Esporta CSV
        <span style={{ fontSize:9, opacity:.6 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200,
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,.15)",
          minWidth:230, overflow:"hidden",
        }}>
          {/* Intestazione info */}
          <div style={{ padding:"10px 14px 8px", borderBottom:"1px solid var(--border)",
            fontSize:11, color:"var(--text-3)", lineHeight:1.5 }}>
            Il CSV esportato contiene la colonna <strong>ID_MANUМАН</strong>.<br/>
            Modificalo e reimportalo per aggiornare in massa.
          </div>

          <button
            onClick={() => { onEsportaTutti(); setOpen(false); }}
            style={{ width:"100%", padding:"11px 14px", textAlign:"left",
              background:"none", border:"none", cursor:"pointer", fontSize:13,
              display:"flex", alignItems:"center", gap:10,
              borderBottom:"1px solid var(--border)" }}
            onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{ fontSize:18 }}>📋</span>
            <div>
              <div style={{ fontWeight:700 }}>Tutti gli asset</div>
              <div style={{ fontSize:11, color:"var(--text-3)" }}>{nTotali} record</div>
            </div>
          </button>

          <button
            onClick={() => { onEsportaFiltrati(); setOpen(false); }}
            disabled={nFiltrati === nTotali}
            style={{ width:"100%", padding:"11px 14px", textAlign:"left",
              background:"none", border:"none",
              cursor: nFiltrati === nTotali ? "default" : "pointer",
              fontSize:13, display:"flex", alignItems:"center", gap:10,
              opacity: nFiltrati === nTotali ? 0.4 : 1 }}
            onMouseEnter={e=>{ if(nFiltrati!==nTotali) e.currentTarget.style.background="var(--surface-2)"; }}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{ fontSize:18 }}>🔍</span>
            <div>
              <div style={{ fontWeight:700 }}>Solo filtrati</div>
              <div style={{ fontSize:11, color:"var(--text-3)" }}>
                {nFiltrati} record (filtro attivo)
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}


export function GestioneAssets({assets=[], clienti=[], manutenzioni=[], assegnazioni=[], piani=[], onAgg, onMod, onDel, onQR, onApplicaTemplate, tenantId="", userId="", onImportDone}) {
  const { t } = useI18n();
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [cerca,sCerca]=useState("");const [fTipo,sfT]=useState("tutti");const [fSt,sfSt]=useState("tutti");
  const [showImport,setShowImport]=useState(false);
  const tipi=[...new Set(assets.map(a=>a.tipo).filter(Boolean))];

  // ── Esporta CSV ──────────────────────────────────────────────────────────
  const esportaCSV = (soloFiltrati=false) => {
    const lista = soloFiltrati ? filtrati : assets;
    if (!lista.length) { console.warn("Nessun asset da esportare."); return; }

    const esc = v => {
      if (v == null || v === "") return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const fmtData = d => {
      if (!d) return "";
      try { return new Date(d+"T00:00:00").toLocaleDateString("it-IT"); }
      catch { return d; }
    };

    const headers = [
      "ID_MANUМАН","Nome","Tipo","Cliente","Ubicazione",
      "Matricola","Marca","Modello","Data installazione",
      "Stato","Note","Ore utilizzo","Costo acquisto (€)",
      "Fine garanzia","Anni vita utile"
    ];

    const righe = lista.map(a => {
      const cl = clienti.find(c => c.id === a.clienteId);
      return [
        a.id,
        a.nome,
        a.tipo || "",
        cl?.rs || "",
        a.ubicazione || "",
        a.matricola || "",
        a.marca || "",
        a.modello || "",
        fmtData(a.dataInst),
        a.stato || "attivo",
        a.note || "",
        a.ore_utilizzo ?? "",
        a.costo_acquisto ?? "",
        fmtData(a.garanzia_al),
        a.vita_utile_anni ?? "",
      ].map(esc).join(",");
    });

    const csv = ["\uFEFF" + headers.join(","), ...righe].join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().slice(0,10);
    a.download = soloFiltrati
      ? `asset_filtrati_${ts}.csv`
      : `asset_completo_${ts}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const filtrati=useMemo(()=>assets.filter(a=>{if(fTipo!=="tutti"&&a.tipo!==fTipo)return false;if(fSt!=="tutti"&&a.stato!==fSt)return false;if(cerca&&!a.nome.toLowerCase().includes(cerca.toLowerCase())&&!(a.matricola||"").toLowerCase().includes(cerca.toLowerCase()))return false;return true;}),[assets,fTipo,fSt,cerca]);
  const STATO_ASSET={attivo:{cls:"badge badge-attivo",l:t("assets.active")},manutenzione:{cls:"badge badge-inCorso",l:t("assets.maintenance")},inattivo:{cls:"badge badge-scaduta",l:t("assets.inactive")}};
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca asset o matricola..." style={{flex:1,minWidth:140}} />
        <select value={fTipo} onChange={e=>sfT(e.target.value)}><option value="tutti">Tutti i tipi</option>{tipi.map(t=><option key={t} value={t}>{t}</option>)}</select>
        <select value={fSt} onChange={e=>sfSt(e.target.value)}><option value="tutti">Tutti gli stati</option><option value="attivo">Attivo</option><option value="manutenzione">In manutenzione</option><option value="inattivo">Inattivo</option></select>
        <button onClick={()=>setShowImport(true)}
          style={{fontSize:12,padding:"7px 14px",borderRadius:7,fontWeight:600,
            background:"var(--surface)",border:"1px solid var(--border)",cursor:"pointer"}}>
          📥 Importa CSV/Excel
        </button>
        <EsportaMenu
          onEsportaTutti={()=>esportaCSV(false)}
          onEsportaFiltrati={()=>esportaCSV(true)}
          nFiltrati={filtrati.length}
          nTotali={assets.length}
        />
        <button className="btn-primary" onClick={()=>{siM(null);ssM(true);}}>+ Nuovo asset</button>
        <HelpButton sezione="assets" />
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
              <span className={sc.cls}>{sc.l}</span><AssetSaluteBadge asset={a} /><span style={{flex:1}} />
              <span style={{fontSize:11.5,color:"var(--text-3)",fontWeight:500}}>{manAss.filter(m=>m.stato!=="completata").length} attive · {manAss.length} tot.</span>
            </div>
            {onApplicaTemplate && (
              <PianiAsset asset={a} assegnazioni={assegnazioni} piani={piani}
                onApplica={onApplicaTemplate} />
            )}
          </div>);
        })}
      </div>
      {!filtrati.length&&<div className="empty"><div className="empty-icon">⚙</div><div className="empty-text">Nessun asset trovato</div></div>}
      {showImport && (
        <div className="pannello-dettaglio-fixed" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
          zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:"24px 16px", overflowY:"auto" }}>
          <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
            width:"min(860px,96vw)", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:17 }}>📥 Importazione massiva asset</div>
              <button onClick={()=>setShowImport(false)}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--text-3)" }}>✕</button>
            </div>
            <ImportaAsset
              tenantId={tenantId} userId={userId} clienti={clienti}
              onDone={()=>{ setShowImport(false); onImportDone?.(); }}
            />
          </div>
        </div>
      )}
      {showM&&<ModalAsset ini={inMod} clienti={clienti} userId={inMod?.userId||""} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}



// ─── Clienti ──────────────────────────────────────────────────────────────
export function ModalCliente({ini, onClose, onSalva, userId, tenantId=null}) {
  const [f,sf]=useState(ini||{rs:"",codice:"",piva:"",contatto:"",tel:"",email:"",ind:"",settore:"",note:"",slaProfilo_id:null});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <Modal title={ini?"Modifica cliente":"Nuovo cliente"} onClose={onClose} onSave={()=>onSalva(f)} saveOk={!!f.rs.trim()} saveColor="#7F77DD" saveLabel={ini?"Aggiorna":"Aggiungi"}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12}}>
      <Field label="Ragione sociale *"><input value={f.rs} onChange={e=>s("rs",e.target.value)} style={{width:"100%"}} /></Field>
      <Field label="Codice (es. CLI1)"><input value={f.codice||""} onChange={e=>s("codice",e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} style={{width:90}} placeholder="CLI1" maxLength={8} /></Field>
    </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
        <Field label="P.IVA"><input value={f.piva} onChange={e=>s("piva",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Settore"><input value={f.settore} onChange={e=>s("settore",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Contatto"><input value={f.contatto} onChange={e=>s("contatto",e.target.value)} style={{width:"100%"}} /></Field>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
        <Field label="Telefono"><input value={f.tel} onChange={e=>s("tel",e.target.value)} style={{width:"100%"}} /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={e=>s("email",e.target.value)} style={{width:"100%"}} /></Field>
      </div>
      <Field label="Indirizzo"><input value={f.ind} onChange={e=>s("ind",e.target.value)} style={{width:"100%"}} /></Field>
      <Field label="Note"><textarea value={f.note} onChange={e=>s("note",e.target.value)} rows={2} style={{width:"100%",resize:"vertical"}} /></Field>
      {tenantId && (
        <Field label="⏱ Contenitore SLA">
          <SelectSLAProfilo tenantId={tenantId} value={f.slaProfilo_id}
            onChange={v=>s("slaProfilo_id",v?Number(v):null)} />
        </Field>
      )}
      {ini?.id&&<PannelloAllegati entitaTipo="cliente" entitaId={ini.id} userId={userId||""} />}
    </Modal>
  );
}

// ─── Menu dropdown esportazione clienti ──────────────────────────────────
function EsportaMenuClienti({ onEsportaTutti, onEsportaFiltrati, nFiltrati, nTotali }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef();
  React.useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ fontSize:12, padding:"7px 14px", borderRadius:7, fontWeight:600,
          background:"var(--surface)", border:"1px solid var(--border)", cursor:"pointer",
          display:"flex", alignItems:"center", gap:6 }}>
        📤 Esporta CSV <span style={{ fontSize:9, opacity:.6 }}>▼</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200,
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,.15)", minWidth:230, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px 8px", borderBottom:"1px solid var(--border)",
            fontSize:11, color:"var(--text-3)", lineHeight:1.5 }}>
            Il CSV include <strong>ID_MANUМАН</strong> per aggiornamenti massivi.
          </div>
          {[
            { label:"Tutti i clienti", sub:`${nTotali} record`, fn:onEsportaTutti, icon:"📋", disabled:false },
            { label:"Solo filtrati", sub:`${nFiltrati} record`, fn:onEsportaFiltrati, icon:"🔍", disabled:nFiltrati===nTotali },
          ].map(item => (
            <button key={item.label} onClick={() => { item.fn(); setOpen(false); }}
              disabled={item.disabled}
              style={{ width:"100%", padding:"11px 14px", textAlign:"left",
                background:"none", border:"none", borderBottom:"1px solid var(--border)",
                cursor:item.disabled?"default":"pointer", fontSize:13,
                display:"flex", alignItems:"center", gap:10, opacity:item.disabled?.4:1 }}
              onMouseEnter={e=>{ if(!item.disabled) e.currentTarget.style.background="var(--surface-2)"; }}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight:700 }}>{item.label}</div>
                <div style={{ fontSize:11, color:"var(--text-3)" }}>{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export function GestioneClienti({clienti=[], manutenzioni=[], assets=[], onAgg, onMod, onDel, tenantId, userId, onImportDone}) {
  const { t } = useI18n();
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);const [showImport,setShowImport]=useState(false);const [cerca,sCerca]=useState("");
  const filtrati=useMemo(()=>clienti.filter(c=>!cerca||c.rs.toLowerCase().includes(cerca.toLowerCase())||c.contatto.toLowerCase().includes(cerca.toLowerCase())),[clienti,cerca]);

  // ── Esporta CSV ──────────────────────────────────────────────────────────
  const esportaCSV = (soloFiltrati=false) => {
    const lista = soloFiltrati ? filtrati : clienti;
    if (!lista.length) { console.warn("Nessun cliente da esportare."); return; }
    const esc = v => {
      if (v == null || v === "") return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const headers = ["ID_MANUМАН","Ragione sociale","Codice","P.IVA","Contatto","Telefono","Email","Indirizzo","Settore","Note"];
    const righe = lista.map(c => [
      c.id, c.rs, c.codice||"", c.piva||"", c.contatto||"",
      c.tel||"", c.email||"", c.ind||"", c.settore||"", c.note||""
    ].map(esc).join(","));
    const csv = ["\uFEFF"+headers.join(","), ...righe].join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clienti_${soloFiltrati?"filtrati_":""}${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const BG=["#EEEDFE","#E6F1FB","#ECFDF5","#FEF3C7","#FEF2F2","#F0F4FF"];const TX=["#534AB7","#1E40AF","#065F46","#92400E","#991B1B","#3730A3"];
  return (
    <div style={{display:"grid",gap:12}}>
      <div className="filters">
        <input value={cerca} onChange={e=>sCerca(e.target.value)} placeholder="🔍  Cerca cliente o contatto..." style={{flex:1}} />
        <EsportaMenuClienti
          onEsportaTutti={()=>esportaCSV(false)}
          onEsportaFiltrati={()=>esportaCSV(true)}
          nFiltrati={filtrati.length}
          nTotali={clienti.length}
        />
        <button onClick={()=>setShowImport(p=>!p)} style={{padding:"7px 14px",background:"var(--surface)",color:"var(--text-1)",border:"1px solid var(--border)",borderRadius:6,fontWeight:600,fontSize:13,cursor:"pointer"}}>
          {showImport?"✕ Chiudi":"📥 Importa"}
        </button>
        <button style={{color:"#7F77DD",borderColor:"#C4B5FD",background:"#EEEDFE",fontWeight:600}} onClick={()=>{siM(null);ssM(true);}}>+ Nuovo cliente</button>
        <HelpButton sezione="clienti" />
      </div>
      {showImport&&(
        <div style={{border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",marginBottom:4}}>
          <ImportaClienti tenantId={tenantId} userId={userId} onDone={()=>{setShowImport(false);onImportDone&&onImportDone();}} />
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {filtrati.map((c,idx)=>{const nAtt=manutenzioni.filter(m=>m.clienteId===c.id&&m.stato!=="completata").length;const nAs=assets.filter(a=>a.clienteId===c.id).length;const ur=manutenzioni.filter(m=>m.clienteId===c.id&&m.priorita==="urgente"&&m.stato!=="completata").length;const ini=c.rs.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
          return(<div key={c.id} className="client-card">
            <div style={{display:"flex",gap:12,marginBottom:12}}>
              <div style={{width:46,height:46,borderRadius:"var(--radius)",background:BG[idx%BG.length],display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,color:TX[idx%TX.length],flexShrink:0}}>{ini}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.rs}</div>
                  {c.codice&&<span style={{fontSize:10,fontWeight:800,color:"#7F77DD",background:"#F5F3FF",border:"1px solid #DDD6FE",padding:"1px 7px",borderRadius:99,flexShrink:0,fontFamily:"monospace"}}>{c.codice}</span>}
                </div>
                {c.settore&&<div style={{fontSize:11.5,color:"#7F77DD",fontWeight:500,marginTop:2}}>{c.settore}</div>}
              </div>
              <div style={{display:"flex",gap:4}}><button className="btn-sm btn-icon" onClick={()=>{siM(c);ssM(true);}}>✏</button><button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(c.id)}>✕</button></div>
            </div>
            <div style={{fontSize:12,color:"var(--text-2)",display:"grid",gap:3,marginBottom:12}}>{c.contatto&&<div>👤 {c.contatto}</div>}{c.tel&&<div>📞 {c.tel}</div>}{c.email&&<div>✉ {c.email}</div>}</div>
            <div style={{display:"flex",borderTop:"1px solid var(--border)",paddingTop:10}}>
              {[{v:nAtt,l:"Attive",c:"#2563EB"},{v:nAs,l:"Asset",c:"var(--text-1)"},{v:ur>0?ur:null,l:"Urgenti",c:"#DC2626"}].map(({v,l,c})=>v!=null?<div key={l} style={{flex:1,textAlign:"center",padding:"4px 0"}}><div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:18,color:c}}>{v}</div><div style={{fontSize:10,color:"var(--text-3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{l}</div></div>:null)}
            </div>
          </div>);
        })}
      </div>
      {showM&&<ModalCliente tenantId={tenantId} ini={inMod} userId={inMod?.userId||""} onClose={()=>{ssM(false);siM(null);}} onSalva={f=>inMod?onMod({...inMod,...f}):onAgg(f)} />}
    </div>
  );
}

