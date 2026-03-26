import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { stampaRapportoOdL } from "../utils/features";
import { PannelloRipianifica } from "./RipianificaOdL";
import { emailOdlAssegnato, emailInterventoCompletato } from "../notifiche-email";
import { Overlay, Field } from "./ui/Atoms";

// ─── Costanti ─────────────────────────────────────────────────────────────
const STATI_ODL = [
  { v:"bozza",      l:"Bozza",       col:"#94A3B8", bg:"#F8FAFC" },
  { v:"confermato", l:"Confermato",  col:"#3B82F6", bg:"#EFF6FF" },
  { v:"in_corso",   l:"In corso",    col:"#F59E0B", bg:"#FEF3C7" },
  { v:"completato", l:"Completato",  col:"#059669", bg:"#ECFDF5" },
  { v:"annullato",  l:"Annullato",   col:"#EF4444", bg:"#FEF2F2" },
];
const PRI_COL = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
const STATO_LABEL = { richiesta:"Richiesta", pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };

const fmtData   = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const fmtOre    = min => min >= 60 ? `${Math.round(min/60*10)/10}h` : `${min}min`;
const isoDate   = d => d.toISOString().split("T")[0];

const statoOdl  = v => STATI_ODL.find(s=>s.v===v) || STATI_ODL[0];

// ─── Modal modifica OdL ───────────────────────────────────────────────────
function ModalOdL({ odl, operatori=[], onClose, onSalva }) {
  const [f, sf] = useState({
    titolo:       odl.titolo || "",
    data_inizio:  odl.data_inizio || "",
    data_fine:    odl.data_fine   || odl.data_inizio || "",
    operatoreId:  String(odl.operatore_id || ""),
    stato:        odl.stato || "bozza",
    note:         odl.note || "",
  });
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  const fornitori = operatori.filter(o=>o.tipo==="fornitore");

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(500px,96vw)", maxHeight:"90vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
      }}>
        <div style={{padding:"20px 24px 16px", borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:16}}>
            Modifica Ordine di Lavoro
          </div>
          <div style={{fontSize:12, color:"var(--text-3)", marginTop:3}}>{odl.numero}</div>
        </div>
        <div style={{padding:"20px 24px", display:"grid", gap:13}}>
          <Field label="Titolo *">
            <input value={f.titolo} onChange={e=>s("titolo",e.target.value)} style={{width:"100%"}} />
          </Field>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <Field label="Data inizio *">
              <input type="date" value={f.data_inizio} onChange={e=>s("data_inizio",e.target.value)} style={{width:"100%"}} />
            </Field>
            <Field label="Data fine (multi-giorno)">
              <input type="date" value={f.data_fine} min={f.data_inizio}
                onChange={e=>s("data_fine",e.target.value)} style={{width:"100%"}} />
            </Field>
          </div>
          <Field label="Operatore / tecnico">
            <select value={f.operatoreId} onChange={e=>s("operatoreId",e.target.value)} style={{width:"100%"}}>
              <option value="">— Non assegnato —</option>
              {fornitori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}{o.spec?` · ${o.spec}`:""}</option>)}
            </select>
          </Field>
          <Field label="Stato">
            <select value={f.stato} onChange={e=>s("stato",e.target.value)} style={{width:"100%"}}>
              {STATI_ODL.map(st=><option key={st.v} value={st.v}>{st.l}</option>)}
            </select>
          </Field>
          <Field label="Note">
            <textarea value={f.note} onChange={e=>s("note",e.target.value)}
              rows={2} style={{width:"100%", resize:"vertical"}} />
          </Field>
        </div>
        <div style={{padding:"0 24px 20px", display:"flex", justifyContent:"space-between",
          borderTop:"1px solid var(--border)", paddingTop:16, gap:10}}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button disabled={!f.titolo.trim() || !f.data_inizio}
            onClick={()=>onSalva({...f, operatore_id:f.operatoreId?Number(f.operatoreId):null})}
            className="btn-primary">Salva</button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Card OdL espandibile ─────────────────────────────────────────────────
function CardOdL({ odl, attivita=[], operatori=[], clienti=[], assets=[], tenantNome="", isSelected=false, onToggleSel, onStato, onMod, onDel, onPdf }) {
  const [aperto, setAperto] = useState(false);
  const st  = statoOdl(odl.stato);
  const op  = operatori.find(o=>o.id===(odl.operatore_id||odl.operatoreId));
  const cl  = clienti.find(c=>c.id===(odl.cliente_id||odl.clienteId));
  const att = attivita.filter(m=>m.odlId===odl.id);
  const multiGiorno = odl.data_fine && odl.data_fine !== odl.data_inizio;

  // Progressione attività
  const totAtt  = att.length;
  const compAtt = att.filter(m=>m.stato==="completata").length;
  const perc    = totAtt ? Math.round(compAtt/totAtt*100) : 0;

  // Azioni di stato rapide
  const NEXT_STATO = { bozza:"confermato", confermato:"in_corso", in_corso:"completato" };
  const nextStato  = NEXT_STATO[odl.stato];

  return (
    <div style={{
      background:"var(--surface)", border:"1px solid var(--border)",
      borderRadius:"var(--radius-xl)", overflow:"hidden",
      borderLeft:`4px solid ${st.col}`,
    }}>
      {/* Header card */}
      <div style={{
        display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
        cursor:"pointer", userSelect:"none",
      }} onClick={()=>setAperto(v=>!v)}>

        {/* Data box */}
        <div style={{
          width:46, height:46, borderRadius:"var(--radius)", flexShrink:0,
          background:st.bg, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
        }}>
          <div style={{fontSize:16, fontWeight:700, color:st.col, lineHeight:1}}>
            {new Date((odl.data_inizio||odl.dataInizio)+"T00:00:00").getDate()}
          </div>
          <div style={{fontSize:9, color:st.col, textTransform:"uppercase", marginTop:1}}>
            {new Date((odl.data_inizio||odl.dataInizio)+"T00:00:00")
              .toLocaleDateString("it-IT",{month:"short"})}
          </div>
        </div>

        {/* Info principale */}
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3}}>
            <span style={{fontSize:10, fontWeight:700, color:"var(--text-3)",
              fontFamily:"var(--font-head)"}}>{odl.numero}</span>
            {multiGiorno && (
              <span style={{fontSize:10, background:"#EFF6FF", color:"#3B82F6",
                padding:"1px 6px", borderRadius:99, fontWeight:600}}>
                {fmtData(odl.data_inizio)} → {fmtData(odl.data_fine)}
              </span>
            )}
            <span style={{
              fontSize:10, padding:"1px 8px", borderRadius:99, fontWeight:700,
              background:st.bg, color:st.col,
            }}>{st.l}</span>
          </div>
          <div style={{fontWeight:700, fontSize:13, overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{odl.titolo}</div>
          <div style={{fontSize:11, color:"var(--text-3)", marginTop:2, display:"flex", gap:8, flexWrap:"wrap"}}>
            {cl && <span style={{color:"#7F77DD", fontWeight:600}}>🏢 {cl.rs}</span>}
            {op && <span style={{display:"flex", alignItems:"center", gap:3}}>
              <span style={{width:7, height:7, borderRadius:"50%",
                background:op.col, display:"inline-block"}}/>
              {op.nome}
            </span>}
            {odl.durata_stimata && <span>⏱ {fmtOre(odl.durata_stimata)}</span>}
          </div>
        </div>

        {/* Progressione + azioni */}
        <div style={{display:"flex", alignItems:"center", gap:10, flexShrink:0}}
          onClick={e=>e.stopPropagation()}>
          {/* Barra progresso */}
          {totAtt > 0 && (
            <div style={{textAlign:"center", minWidth:48}}>
              <div style={{fontSize:11, fontWeight:700, color: perc===100?"#059669":"var(--text-2)"}}>
                {compAtt}/{totAtt}
              </div>
              <div style={{height:4, width:48, background:"var(--border)", borderRadius:99, overflow:"hidden", marginTop:3}}>
                <div style={{height:"100%", width:`${perc}%`,
                  background: perc===100?"#059669":"#F59E0B", borderRadius:99, transition:"width .3s"}}/>
              </div>
            </div>
          )}

          {/* Bottone avanza stato */}
          {nextStato && (
            <button onClick={()=>onStato(odl.id, nextStato)}
              style={{
                padding:"5px 10px", fontSize:11, fontWeight:700,
                background: nextStato==="completato"?"#ECFDF5":nextStato==="in_corso"?"#FEF3C7":"#EFF6FF",
                color: nextStato==="completato"?"#059669":nextStato==="in_corso"?"#92400E":"#1E40AF",
                border:"none", borderRadius:"var(--radius-sm)", cursor:"pointer", whiteSpace:"nowrap",
              }}>
              {nextStato==="confermato"?"✓ Conferma":nextStato==="in_corso"?"▶ Avvia":"✓ Chiudi"}
            </button>
          )}

          <div style={{display:"flex", gap:4}}>
            <button className="btn-sm btn-icon" title="Stampa rapporto PDF"
              onClick={()=>onPdf(odl)}>🖨</button>
            <button className="btn-sm btn-icon" onClick={()=>onMod(odl)}>✏</button>
            <button className="btn-sm btn-icon btn-danger" onClick={()=>onDel(odl.id)}>✕</button>
          </div>
          <span style={{fontSize:12, color:"var(--text-3)"}}>{aperto?"▲":"▼"}</span>
        </div>
      </div>

      {/* Dettaglio attività */}
      {aperto && (
        <div style={{padding:"4px 16px 14px", borderTop:"1px solid var(--border-dim)"}}>
          {att.length === 0 ? (
            <div style={{padding:"12px 0", textAlign:"center", fontSize:12, color:"var(--text-3)"}}>
              Nessuna attività collegata a questo OdL
            </div>
          ) : (
            <div style={{display:"grid", gap:5, marginTop:8}}>
              {att.map(m=>{
                const assetM = assets.find(a=>a.id===m.assetId);
                const stLbl  = STATO_LABEL[m.stato] || m.stato;
                return (
                  <div key={m.id} style={{
                    display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                    background:"var(--surface-2)", borderRadius:"var(--radius-sm)",
                    borderLeft:`3px solid ${PRI_COL[m.priorita]||"#94A3B8"}`,
                  }}>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:12, fontWeight:600, overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{m.titolo}</div>
                      <div style={{fontSize:10, color:"var(--text-3)", marginTop:2, display:"flex", gap:6}}>
                        {assetM && <span>⚙ {assetM.nome}</span>}
                        <span>⏱ {fmtOre(m.durata)}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600, whiteSpace:"nowrap",
                      background: m.stato==="completata"?"#ECFDF5":m.stato==="inCorso"?"#FEF3C7":"#F1F5F9",
                      color: m.stato==="completata"?"#059669":m.stato==="inCorso"?"#92400E":"#64748B",
                    }}>{stLbl}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vista principale OdL ─────────────────────────────────────────────────
export function GestioneOdL({
  manutenzioni=[], operatori=[], clienti=[], assets=[], tenantId, tenantNome="", emailConfig={},
  onAggiornaManutenzioni,
}) {
  const [odl,     setOdl]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [inMod,   setInMod]  = useState(null);

  // Selezione multipla
  const [selezionati, setSel]       = useState(new Set()); // Set di ID
  const [showRipiani, setRipiani]   = useState(false);

  const toggleSel = id => setSel(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const selTutti = () => setSel(new Set(odlView.map(o=>o.id)));
  const deselTutti = () => setSel(new Set());
  const odlSel = odl.filter(o => selezionati.has(o.id));

  // Filtri
  const [fStato,  setFStato]  = useState("tutti");
  const [fCliente,setFCl]     = useState("tutti");
  const [fOp,     setFOp]     = useState("tutti");
  const [fMese,   setFMese]   = useState(""); // YYYY-MM

  // Carica OdL
  useEffect(()=>{ if(tenantId) carica(); }, [tenantId]);

  const carica = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ordini_lavoro")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("data_inizio", { ascending:false });
    setOdl(data || []);
    setLoading(false);
  };

  // Filtrati
  const odlView = useMemo(()=>{
    return odl.filter(o=>{
      if (fStato!=="tutti" && o.stato!==fStato) return false;
      if (fCliente!=="tutti" && String(o.cliente_id)!==fCliente) return false;
      if (fOp!=="tutti" && String(o.operatore_id)!==fOp) return false;
      if (fMese && !(o.data_inizio||"").startsWith(fMese)) return false;
      return true;
    });
  }, [odl, fStato, fCliente, fOp, fMese]);

  // Statistiche header
  const stats = useMemo(()=>({
    tot:       odl.length,
    bozza:     odl.filter(o=>o.stato==="bozza").length,
    inCorso:   odl.filter(o=>o.stato==="in_corso").length,
    completati:odl.filter(o=>o.stato==="completato").length,
  }), [odl]);

  // Clienti e operatori distinti (per filtri)
  const clientiUsati = useMemo(()=>{
    const ids = [...new Set(odl.map(o=>o.cliente_id).filter(Boolean))];
    return ids.map(id=>clienti.find(c=>c.id===id)).filter(Boolean);
  }, [odl, clienti]);

  const opUsati = useMemo(()=>{
    const ids = [...new Set(odl.map(o=>o.operatore_id).filter(Boolean))];
    return ids.map(id=>operatori.find(op=>op.id===id)).filter(Boolean);
  }, [odl, operatori]);

  // Aggiorna stato OdL
  const statoOdl = async (id, stato) => {
    try {
      await supabase.from("ordini_lavoro").update({ stato }).eq("id", id);
      const odlObj = odl.find(o=>o.id===id);
      setOdl(prev=>prev.map(o=>o.id===id?{...o,stato}:o));

      if (odlObj) {
        const op = operatori.find(o=>o.id===odlObj.operatore_id);
        const cl = clienti.find(c=>c.id===odlObj.cliente_id);

        if (stato==="confermato" && emailConfig.odlAssegnato !== false) {
          const att = manutenzioni.filter(m=>m.odlId===id);
          emailOdlAssegnato(op, {...odlObj, n_attivita: att.length}, cl);
        }

        if (stato==="completato") {
          await supabase.from("manutenzioni")
            .update({ stato:"completata", chiuso_at: new Date().toISOString() })
            .eq("odl_id", id).in("stato",["pianificata","inCorso"]);
          onAggiornaManutenzioni?.();

          if (emailConfig.completamento !== false && cl?.email) {
            const attPrinc = manutenzioni.filter(m=>m.odlId===id && m.oreEffettive);
            const tecPrinc = attPrinc.length ? operatori.find(o=>o.id===attPrinc[0].operatoreId) : op;
            emailInterventoCompletato(cl, {
              titolo: odlObj.titolo,
              chiusoAt: new Date().toISOString(),
              oreEffettive: attPrinc.reduce((s,a)=>s+a.oreEffettive,0) || null,
              noteChiusura: odlObj.note || "",
            }, tecPrinc);
          }
        }
      }
    } catch(e) {
      console.error("Errore aggiornamento stato OdL:", e.message);
    }
  };

  // Salva modifiche OdL
  const salvaOdl = async (f) => {
    try {
      const { data, error } = await supabase.from("ordini_lavoro")
        .update({
          titolo:       f.titolo,
          data_inizio:  f.data_inizio,
          data_fine:    f.data_fine || f.data_inizio,
          operatore_id: f.operatore_id,
          stato:        f.stato,
          note:         f.note || null,
        })
        .eq("id", inMod.id)
        .select().single();
      if (error) { console.error("Errore salvataggio OdL:", error.message); return; }
      if (data) setOdl(prev=>prev.map(o=>o.id===inMod.id?data:o));
    } catch(e) {
      console.error("Errore rete:", e.message);
    } finally {
      setInMod(null);
    }
  };

  // Stampa rapporto OdL
  const stampaOdl = (odl) => {
    const att     = manutenzioni.filter(m => m.odlId === odl.id);
    const cliente = clienti.find(c => c.id === (odl.cliente_id || odl.clienteId));
    const operatore = operatori.find(o => o.id === (odl.operatore_id || odl.operatoreId));
    stampaRapportoOdL(odl, att, cliente, operatore, assets, tenantNome);
  };

  // Elimina OdL
  const delOdl = async (id) => {
    if (!window.confirm("Eliminare questo OdL? Le attività collegate rimarranno ma perderanno il collegamento.")) return;
    try {
      const { error } = await supabase.from("ordini_lavoro").delete().eq("id", id);
      if (error) { console.error("Errore eliminazione OdL:", error.message); return; }
      setOdl(prev=>prev.filter(o=>o.id!==id));
    } catch(e) {
      console.error("Errore rete:", e.message);
    }
  };

  if (loading) return (
    <div style={{padding:40, textAlign:"center", color:"var(--text-3)"}}>
      Caricamento ordini di lavoro...
    </div>
  );

  return (
    <div style={{display:"grid", gap:14}}>
      {/* Stat header */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10}}>
        {[
          { l:"Totali",     v:stats.tot,        col:"var(--text-2)" },
          { l:"Bozza",      v:stats.bozza,      col:"#94A3B8" },
          { l:"In corso",   v:stats.inCorso,    col:"#F59E0B" },
          { l:"Completati", v:stats.completati, col:"#059669" },
        ].map(s=>(
          <div key={s.l} style={{
            background:"var(--surface-2)", borderRadius:"var(--radius)",
            padding:"12px 14px", textAlign:"center",
          }}>
            <div style={{fontSize:11, color:"var(--text-3)", marginBottom:4}}>{s.l}</div>
            <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:22, color:s.col}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div className="filters">
        <select value={fStato} onChange={e=>setFStato(e.target.value)}>
          <option value="tutti">Tutti gli stati</option>
          {STATI_ODL.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        {clientiUsati.length > 1 && (
          <select value={fCliente} onChange={e=>setFCl(e.target.value)}>
            <option value="tutti">Tutti i clienti</option>
            {clientiUsati.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
          </select>
        )}
        {opUsati.length > 1 && (
          <select value={fOp} onChange={e=>setFOp(e.target.value)}>
            <option value="tutti">Tutti gli operatori</option>
            {opUsati.map(o=><option key={o.id} value={String(o.id)}>{o.nome}</option>)}
          </select>
        )}
        <input type="month" value={fMese} onChange={e=>setFMese(e.target.value)}
          style={{width:150}} title="Filtra per mese" />
        {(fStato!=="tutti"||fCliente!=="tutti"||fOp!=="tutti"||fMese) && (
          <button onClick={()=>{setFStato("tutti");setFCl("tutti");setFOp("tutti");setFMese("");}}
            className="btn-ghost" style={{fontSize:12}}>✕ Reset</button>
        )}
        <button onClick={()=>setRipiani(true)}
          style={{ fontSize:12, padding:"7px 14px", borderRadius:7, fontWeight:700,
            background:"var(--amber)", color:"#0D1B2A", border:"none", cursor:"pointer",
            whiteSpace:"nowrap" }}>
          📅 Ripianifica
        </button>
      </div>

      {/* Barra selezione multipla */}
      {odlView.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
          background:"var(--surface-2)", borderRadius:8, fontSize:12, flexWrap:"wrap" }}>
          <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", userSelect:"none" }}>
            <input type="checkbox"
              checked={selezionati.size===odlView.length && odlView.length>0}
              onChange={e=>e.target.checked?selTutti():deselTutti()} />
            <span style={{ fontWeight:600 }}>Seleziona tutti ({odlView.length})</span>
          </label>
          {selezionati.size > 0 && (<>
            <span style={{ color:"var(--text-3)" }}>·</span>
            <span style={{ fontWeight:700, color:"#1E40AF" }}>
              {selezionati.size} selezionati
            </span>
            <button onClick={()=>setRipiani(true)}
              style={{ padding:"5px 14px", borderRadius:6, fontWeight:700, fontSize:12,
                background:"#1D4ED8", color:"white", border:"none", cursor:"pointer" }}>
              ✏ Modifica selezionati
            </button>
            <button onClick={deselTutti}
              style={{ padding:"5px 10px", borderRadius:6, fontSize:12,
                background:"none", border:"1px solid var(--border)", cursor:"pointer" }}>
              ✕ Deseleziona
            </button>
          </>)}
        </div>
      )}

      {/* Lista OdL */}
      {odlView.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div className="empty-text">
            {odl.length===0
              ? "Nessun Ordine di Lavoro. Generali dai Piani di manutenzione."
              : "Nessun OdL corrisponde ai filtri selezionati."}
          </div>
        </div>
      ) : (
        <div style={{display:"grid", gap:10}}>
          {odlView.map(o=>(
            <CardOdL
              key={o.id}
              odl={o}
              attivita={manutenzioni}
              operatori={operatori}
              clienti={clienti}
              assets={assets}
              tenantNome={tenantNome}
              isSelected={selezionati.has(o.id)}
              onToggleSel={()=>toggleSel(o.id)}
              onStato={statoOdl}
              onMod={setInMod}
              onDel={delOdl}
              onPdf={stampaOdl}
            />
          ))}
        </div>
      )}

      {showRipiani && (
        <PannelloRipianifica
          odl={odl}
          odlFiltrati={odlView}
          operatori={operatori}
          clienti={clienti}
          tenantId={tenantId}
          selezionati={odlSel}
          onClose={()=>{setRipiani(false);}}
          onApplica={()=>{ carica(); setRipiani(false); deselTutti(); }}
        />
      )}

      {inMod && (
        <ModalOdL
          odl={inMod}
          operatori={operatori}
          onClose={()=>setInMod(null)}
          onSalva={salvaOdl}
        />
      )}
    </div>
  );
}
