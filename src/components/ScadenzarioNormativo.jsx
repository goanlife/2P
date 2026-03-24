import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { Field, Overlay } from "./ui/Atoms";

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const isoDate = d => d.toISOString().split("T")[0];
const oggi    = () => isoDate(new Date());

const CATEGORIE = [
  { v:"antincendio",        l:"🔥 Antincendio",         col:"#EF4444" },
  { v:"impianti_elettrici", l:"⚡ Impianti elettrici",   col:"#F59E0B" },
  { v:"ascensori",          l:"🔼 Ascensori",            col:"#3B82F6" },
  { v:"pressione",          l:"💨 Pressione/Gas",         col:"#8B5CF6" },
  { v:"sicurezza_lavoro",   l:"⛑ Sicurezza lavoro",     col:"#F97316" },
  { v:"ambientale",         l:"🌿 Ambientale",            col:"#10B981" },
  { v:"altro",              l:"📋 Altro",                 col:"#94A3B8" },
];
const CAT_MAP = Object.fromEntries(CATEGORIE.map(c=>[c.v,c]));

const PERIODI = [
  {v:"",    l:"Non ricorrente"},
  {v:"6",   l:"Semestrale (6 mesi)"},
  {v:"12",  l:"Annuale (1 anno)"},
  {v:"24",  l:"Biennale (2 anni)"},
  {v:"36",  l:"Triennale (3 anni)"},
  {v:"60",  l:"Quinquennale (5 anni)"},
];

function giorniAlla(data) {
  if (!data) return null;
  const diff = new Date(data+"T00:00:00") - new Date(oggi()+"T00:00:00");
  return Math.ceil(diff / (1000*60*60*24));
}

// ─── Modal crea/modifica scadenza ─────────────────────────────────────────
function ModalScadenza({ ini, tenantId, clienti=[], assets=[], operatori=[], onClose, onSalva }) {
  const vuoto = {
    titolo:"", descrizione:"", riferimento_normativo:"",
    categoria:"altro", clienteId:"", assetId:"",
    scadenza:"", ultimo_adempimento:"", periodicita_mesi:"",
    stato:"da_fare", responsabileId:"", alert_giorni:30, note:"",
  };
  const [f, sf] = useState(ini ? {
    ...vuoto, ...ini,
    clienteId: String(ini.cliente_id||""),
    assetId:   String(ini.asset_id||""),
    responsabileId: String(ini.responsabile_id||""),
    periodicita_mesi: ini.periodicita_mesi ? String(ini.periodicita_mesi) : "",
  } : vuoto);
  const s = (k,v) => sf(p=>({...p,[k]:v}));

  const assetsCliente = useMemo(()=>
    f.clienteId ? assets.filter(a=>a.clienteId===Number(f.clienteId)) : assets
  , [f.clienteId, assets]);

  const fornitori = operatori.filter(o=>o.tipo==="fornitore");

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(580px,96vw)", maxHeight:"92vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
      }}>
        <div style={{padding:"20px 24px 16px", borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:16}}>
            {ini ? "Modifica scadenza" : "Nuova scadenza normativa"}
          </div>
        </div>
        <div style={{padding:"20px 24px", display:"grid", gap:12}}>
          <Field label="Titolo adempimento *">
            <input value={f.titolo} onChange={e=>s("titolo",e.target.value)}
              style={{width:"100%"}} placeholder="Es. Verifica impianto elettrico, Revisione estintori..." />
          </Field>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Categoria">
              <select value={f.categoria} onChange={e=>s("categoria",e.target.value)} style={{width:"100%"}}>
                {CATEGORIE.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </Field>
            <Field label="Riferimento normativo">
              <input value={f.riferimento_normativo} onChange={e=>s("riferimento_normativo",e.target.value)}
                style={{width:"100%"}} placeholder="Es. D.Lgs 81/2008, DPR 462/01..." />
            </Field>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Cliente / sito *">
              <select value={f.clienteId} onChange={e=>{s("clienteId",e.target.value);s("assetId","");}} style={{width:"100%"}}>
                <option value="">— Seleziona —</option>
                {clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
              </select>
            </Field>
            <Field label="Asset (opzionale)">
              <select value={f.assetId} onChange={e=>s("assetId",e.target.value)} style={{width:"100%"}}>
                <option value="">— Generico —</option>
                {assetsCliente.map(a=><option key={a.id} value={String(a.id)}>{a.nome}</option>)}
              </select>
            </Field>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Scadenza *">
              <input type="date" value={f.scadenza} onChange={e=>s("scadenza",e.target.value)} style={{width:"100%"}} />
            </Field>
            <Field label="Ultimo adempimento">
              <input type="date" value={f.ultimo_adempimento} onChange={e=>s("ultimo_adempimento",e.target.value)} style={{width:"100%"}} />
            </Field>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Periodicità">
              <select value={f.periodicita_mesi} onChange={e=>s("periodicita_mesi",e.target.value)} style={{width:"100%"}}>
                {PERIODI.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>
            <Field label="Avvisa (giorni prima)">
              <input type="number" min={1} max={365} value={f.alert_giorni}
                onChange={e=>s("alert_giorni",Number(e.target.value))} style={{width:"100%"}} />
            </Field>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Responsabile">
              <select value={f.responsabileId} onChange={e=>s("responsabileId",e.target.value)} style={{width:"100%"}}>
                <option value="">— Non assegnato —</option>
                {fornitori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}</option>)}
              </select>
            </Field>
            <Field label="Stato">
              <select value={f.stato} onChange={e=>s("stato",e.target.value)} style={{width:"100%"}}>
                <option value="da_fare">Da fare</option>
                <option value="in_corso">In corso</option>
                <option value="completato">Completato</option>
                <option value="scaduto">Scaduto</option>
              </select>
            </Field>
          </div>

          <Field label="Descrizione / note">
            <textarea value={f.note||""} onChange={e=>s("note",e.target.value)}
              rows={2} style={{width:"100%", resize:"vertical"}}
              placeholder="Dettagli, ente certificatore, documentazione richiesta..." />
          </Field>
        </div>
        <div style={{padding:"0 24px 20px", display:"flex", justifyContent:"space-between",
          borderTop:"1px solid var(--border)", paddingTop:16, gap:10}}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={()=>onSalva({
            ...f,
            cliente_id:         f.clienteId ? Number(f.clienteId) : null,
            asset_id:           f.assetId   ? Number(f.assetId)   : null,
            responsabile_id:    f.responsabileId ? Number(f.responsabileId) : null,
            periodicita_mesi:   f.periodicita_mesi ? Number(f.periodicita_mesi) : null,
            tenant_id:          tenantId,
          })}
          disabled={!f.titolo.trim() || !f.clienteId || !f.scadenza}
          className="btn-primary">
            {ini ? "Aggiorna" : "✅ Aggiungi scadenza"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Vista principale Scadenzario ─────────────────────────────────────────
export function ScadenzarioNormativo({ tenantId, clienti=[], assets=[], operatori=[] }) {
  const [scadenze, setScadenze] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showM,    setShowM]    = useState(false);
  const [inMod,    setInMod]    = useState(null);
  const [fCat,     setFCat]     = useState("tutti");
  const [fStato,   setFStato]   = useState("tutti");
  const [fCl,      setFCl]      = useState("tutti");

  useEffect(()=>{ if(tenantId) carica(); }, [tenantId]);

  const carica = async () => {
    setLoading(true);
    const { data } = await supabase.from("scadenze_normative")
      .select("*").eq("tenant_id", tenantId)
      .order("scadenza");
    // Aggiorna automaticamente stato "scaduto"
    const oggi_ = oggi();
    const aggiornate = (data||[]).map(s => ({
      ...s,
      stato: s.stato !== "completato" && s.scadenza < oggi_ ? "scaduto" : s.stato,
    }));
    setScadenze(aggiornate);
    setLoading(false);
  };

  const salva = async (f) => {
    const payload = {
      titolo:               f.titolo, descrizione:f.descrizione||null,
      riferimento_normativo:f.riferimento_normativo||null,
      categoria:            f.categoria, cliente_id:f.cliente_id, asset_id:f.asset_id,
      scadenza:             f.scadenza, ultimo_adempimento:f.ultimo_adempimento||null,
      periodicita_mesi:     f.periodicita_mesi, stato:f.stato,
      responsabile_id:      f.responsabile_id, alert_giorni:f.alert_giorni||30,
      note:                 f.note||null, tenant_id:tenantId,
    };
    if (inMod?.id) {
      const { data } = await supabase.from("scadenze_normative").update(payload).eq("id",inMod.id).select().single();
      if (data) setScadenze(p=>p.map(s=>s.id===inMod.id?data:s));
    } else {
      const { data } = await supabase.from("scadenze_normative").insert(payload).select().single();
      if (data) setScadenze(p=>[...p,data]);
    }
    setShowM(false); setInMod(null);
  };

  const del = async (id) => {
    if (!confirm("Eliminare questa scadenza?")) return;
    await supabase.from("scadenze_normative").delete().eq("id",id);
    setScadenze(p=>p.filter(s=>s.id!==id));
  };

  const completaERinnova = async (s) => {
    const oggi_ = oggi();
    const updates = { stato:"completato", ultimo_adempimento: oggi_ };
    // Se ricorrente, calcola prossima scadenza
    if (s.periodicita_mesi) {
      const nuova = new Date(s.scadenza+"T00:00:00");
      nuova.setMonth(nuova.getMonth() + s.periodicita_mesi);
      const nuovaScadenza = nuova.toISOString().split("T")[0];
      // Crea nuova scadenza per la prossima ricorrenza
      await supabase.from("scadenze_normative").insert({
        ...s, id:undefined, scadenza:nuovaScadenza,
        ultimo_adempimento: oggi_, stato:"da_fare",
        created_at: undefined,
      });
    }
    const { data } = await supabase.from("scadenze_normative").update(updates).eq("id",s.id).select().single();
    if (data) setScadenze(p=>p.map(x=>x.id===s.id?data:x));
    await carica();
  };

  // Filtri
  const view = useMemo(()=> scadenze.filter(s=>{
    if (fCat!=="tutti" && s.categoria!==fCat) return false;
    if (fStato!=="tutti" && s.stato!==fStato) return false;
    if (fCl!=="tutti" && String(s.cliente_id)!==fCl) return false;
    return true;
  }), [scadenze, fCat, fStato, fCl]);

  // Stats
  const scadute  = scadenze.filter(s=>s.stato==="scaduto").length;
  const urgenti  = scadenze.filter(s=>{
    const g = giorniAlla(s.scadenza);
    return s.stato!=="completato" && g!==null && g<=30 && g>=0;
  }).length;
  const clientiUsati = [...new Set(scadenze.map(s=>s.cliente_id).filter(Boolean))]
    .map(id=>clienti.find(c=>c.id===id)).filter(Boolean);

  const STATO_CFG = {
    da_fare:   { col:"#94A3B8", bg:"#F8FAFC", l:"Da fare" },
    in_corso:  { col:"#F59E0B", bg:"#FEF3C7", l:"In corso" },
    completato:{ col:"#059669", bg:"#ECFDF5", l:"Completato" },
    scaduto:   { col:"#EF4444", bg:"#FEF2F2", l:"Scaduto" },
  };

  if (loading) return <div style={{padding:32,textAlign:"center",color:"var(--text-3)"}}>Caricamento...</div>;

  return (
    <div style={{display:"grid", gap:14}}>
      {/* Header + stats */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12}}>
        <div>
          <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:18, marginBottom:4}}>
            📅 Scadenzario normativo
          </div>
          <div style={{fontSize:12, color:"var(--text-3)"}}>
            Adempimenti obbligatori per legge separati dalla manutenzione ordinaria
          </div>
        </div>
        <button className="btn-primary" style={{whiteSpace:"nowrap", flexShrink:0}}
          onClick={()=>{setInMod(null);setShowM(true);}}>+ Nuova scadenza</button>
      </div>

      {/* KPI */}
      {scadenze.length > 0 && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10}}>
          {[
            { l:"Totali",    v:scadenze.length,                          col:"var(--text-2)" },
            { l:"⚠ Urgenti (<30gg)", v:urgenti,   col:urgenti>0?"#F59E0B":"var(--text-2)" },
            { l:"🔴 Scadute",v:scadute, col:scadute>0?"#EF4444":"var(--text-2)" },
          ].map(s=>(
            <div key={s.l} style={{background:"var(--surface-2)",borderRadius:"var(--radius)",
              padding:"12px",textAlign:"center"}}>
              <div style={{fontSize:11,color:"var(--text-3)",marginBottom:4}}>{s.l}</div>
              <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:20,color:s.col}}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtri */}
      <div className="filters">
        <select value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="tutti">Tutte le categorie</option>
          {CATEGORIE.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <select value={fStato} onChange={e=>setFStato(e.target.value)}>
          <option value="tutti">Tutti gli stati</option>
          {Object.entries(STATO_CFG).map(([v,cfg])=><option key={v} value={v}>{cfg.l}</option>)}
        </select>
        {clientiUsati.length > 1 && (
          <select value={fCl} onChange={e=>setFCl(e.target.value)}>
            <option value="tutti">Tutti i clienti</option>
            {clientiUsati.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
          </select>
        )}
      </div>

      {/* Lista scadenze */}
      {view.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📅</div>
          <div className="empty-text">
            {scadenze.length===0
              ? "Nessuna scadenza normativa. Aggiungine una."
              : "Nessuna scadenza corrisponde ai filtri."}
          </div>
        </div>
      ) : (
        <div style={{display:"grid", gap:8}}>
          {view.map(s=>{
            const cat  = CAT_MAP[s.categoria] || CAT_MAP.altro;
            const st   = STATO_CFG[s.stato]   || STATO_CFG.da_fare;
            const gg   = giorniAlla(s.scadenza);
            const cl   = clienti.find(c=>c.id===s.cliente_id);
            const as   = assets.find(a=>a.id===s.asset_id);
            const resp = operatori.find(o=>o.id===s.responsabile_id);
            const urgente = gg!==null && gg<=30 && gg>=0 && s.stato!=="completato";
            const scaduta = s.stato==="scaduto";

            return (
              <div key={s.id} style={{
                background:"var(--surface)", border:`1px solid ${scaduta?"#FECACA":urgente?"#FDE68A":"var(--border)"}`,
                borderRadius:"var(--radius-xl)", padding:"14px 16px",
                borderLeft:`4px solid ${cat.col}`,
              }}>
                <div style={{display:"flex", alignItems:"flex-start", gap:12}}>
                  {/* Data scadenza */}
                  <div style={{
                    width:50, height:50, borderRadius:"var(--radius-sm)", flexShrink:0,
                    background: scaduta?"#FEF2F2":urgente?"#FEF3C7":"var(--surface-2)",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  }}>
                    <div style={{fontSize:16, fontWeight:700, lineHeight:1,
                      color: scaduta?"#EF4444":urgente?"#92400E":"var(--text-2)"}}>
                      {s.scadenza ? new Date(s.scadenza+"T00:00:00").getDate() : "—"}
                    </div>
                    <div style={{fontSize:9, textTransform:"uppercase", marginTop:1,
                      color: scaduta?"#EF4444":urgente?"#92400E":"var(--text-3)"}}>
                      {s.scadenza ? new Date(s.scadenza+"T00:00:00").toLocaleDateString("it-IT",{month:"short",year:"2-digit"}) : ""}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4}}>
                      <span style={{fontWeight:700, fontSize:14}}>{s.titolo}</span>
                      <span style={{
                        fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700,
                        background:st.bg, color:st.col,
                      }}>{st.l}</span>
                      {gg !== null && s.stato!=="completato" && (
                        <span style={{
                          fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700,
                          background: scaduta?"#FEF2F2":urgente?"#FEF3C7":"#F0FDF4",
                          color: scaduta?"#EF4444":urgente?"#92400E":"#059669",
                        }}>
                          {scaduta ? `${Math.abs(gg)}gg scaduta` : `${gg}gg`}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11, color:"var(--text-3)", display:"flex", gap:8, flexWrap:"wrap"}}>
                      {cl && <span style={{color:"#7F77DD", fontWeight:600}}>🏢 {cl.rs}</span>}
                      {as && <span>⚙ {as.nome}</span>}
                      {s.riferimento_normativo && <span>📜 {s.riferimento_normativo}</span>}
                      {resp && <span>👤 {resp.nome}</span>}
                      {s.periodicita_mesi && <span>🔄 ogni {s.periodicita_mesi} mesi</span>}
                    </div>
                  </div>

                  {/* Azioni */}
                  <div style={{display:"flex", gap:6, flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    {s.stato !== "completato" && (
                      <button onClick={()=>completaERinnova(s)}
                        style={{
                          padding:"5px 10px", fontSize:11, fontWeight:700,
                          background:"#ECFDF5", color:"#059669",
                          border:"none", borderRadius:"var(--radius-sm)", cursor:"pointer",
                        }}>
                        ✓ {s.periodicita_mesi ? "Completa e rinnova" : "Completato"}
                      </button>
                    )}
                    <button className="btn-sm btn-icon" onClick={()=>{setInMod(s);setShowM(true);}}>✏</button>
                    <button className="btn-sm btn-icon btn-danger" onClick={()=>del(s.id)}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showM && (
        <ModalScadenza
          ini={inMod} tenantId={tenantId}
          clienti={clienti} assets={assets} operatori={operatori}
          onClose={()=>{setShowM(false);setInMod(null);}}
          onSalva={salva}
        />
      )}
    </div>
  );
}
