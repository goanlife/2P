import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { classificaTicket, AIClassificaBadge } from "./AIAssistente";
import { supabase } from "../supabase";
import { Overlay, Field } from "./ui/Atoms";

// Costanti importate da constants.js (TICKET_TIPI, TICKET_PRIORITA, TICKET_STATI, SLA_ORE_DEFAULT)

// Transizioni di stato dei ticket
const NEXT     = { in_attesa:"aperto", aperto:"in_lavorazione", in_lavorazione:"risolto", risolto:"chiuso" };
const NEXT_LBL = { aperto:"▶ Apri ticket", in_lavorazione:"▶ Prendi in carico", risolto:"✓ Segna risolto", chiuso:"🔒 Chiudi" };
const STATI_TERMINALI = ["chiuso","annullato","rifiutato"];
const STATI_ATTIVI = ["in_attesa","aperto","in_lavorazione"];

const tipoInfo    = v => TICKET_TIPI.find(t=>t.v===v)     || TICKET_TIPI[0];
const prioritaInfo= v => TICKET_PRIORITA.find(p=>p.v===v)  || TICKET_PRIORITA[1];
const statoInfo   = v => TICKET_STATI.find(s=>s.v===v)      || TICKET_STATI[0];

const fmtDT = d => d ? new Date(d).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtD  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";

function slaScadenza(ticket, slaProfiles={}, clienti=[]) {
  if (!ticket.created_at) return null;
  
  // Prova a usare il profilo SLA del cliente
  let ore = null;
  if (ticket.cliente_id && slaProfiles) {
    const cl = clienti.find(c => c.id === ticket.cliente_id);
    const profiloId = cl?.slaProfilo_id;
    const profilo = profiloId ? slaProfiles[profiloId] : slaProfiles['default'];
    if (profilo?.sla_profilo_config?.length) {
      // Trova la voce SLA più adatta per priorità
      const PRIO_ORD = { critica:0, alta:1, media:2, bassa:3 };
      const voci = [...profilo.sla_profilo_config].sort((a,b)=>(a.ordine||0)-(b.ordine||0));
      const voce = voci[PRIO_ORD[ticket.priorita]] || voci[0];
      if (voce?.ore_risoluzione) ore = voce.ore_risoluzione;
    }
  }
  
  // Fallback sulle ore di default per tipo+priorità
  if (!ore) ore = SLA_ORE_DEFAULT[ticket.tipo]?.[ticket.priorita] || 24;
  return new Date(new Date(ticket.created_at).getTime() + ore*60*60*1000);
}

function SLABadge({ ticket }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{
    const t = setInterval(()=>setNow(new Date()), 60000);
    return ()=>clearInterval(t);
  },[]);

  if (["chiuso","annullato","risolto"].includes(ticket.stato)) return null;
  const scad = slaScadenza(ticket);
  if (!scad) return null;
  const diffH = (scad - now) / 3600000;
  const col   = diffH < 0 ? "#DC2626" : diffH < 2 ? "#F59E0B" : "#059669";
  const bg    = diffH < 0 ? "#FEF2F2" : diffH < 2 ? "#FFFBEB" : "#ECFDF5";
  const label = diffH < 0
    ? `SLA scaduto ${Math.abs(Math.round(diffH))}h fa`
    : diffH < 24
    ? `SLA ${Math.round(diffH)}h rimaste`
    : `SLA ${Math.ceil(diffH/24)}g rimasti`;

  return (
    <span style={{
      fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
      background:bg, color:col, border:`1px solid ${col}33`, whiteSpace:"nowrap",
    }}>⏱ {label}</span>
  );
}

// ─── Badge tipo/priorità/stato ────────────────────────────────────────────
function BadgeTipo({ tipo }) {
  const t = tipoInfo(tipo);
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:t.bg,color:t.col,border:`1px solid ${t.col}22`,whiteSpace:"nowrap"}}>{t.l}</span>;
}
function BadgePri({ priorita }) {
  const p = prioritaInfo(priorita);
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:p.col+"18",color:p.col,border:`1px solid ${p.col}33`,whiteSpace:"nowrap"}}>{p.l}</span>;
}
function BadgeStato({ stato }) {
  const s = statoInfo(stato);
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:s.bg,color:s.col,border:`1px solid ${s.col}33`,whiteSpace:"nowrap"}}>{s.l}</span>;
}

// ─── Form nuovo/modifica ticket ───────────────────────────────────────────
function FormTicket({ ticket=null, clienti=[], assets=[], operatori=[], tenantId, onSalva, onClose }) {
  const vuoto = {
    titolo:"", tipo:"correttiva", priorita:"media", stato:"aperto",
    cliente_id:"", asset_id:"", operatore_id:"",
    descrizione:"", causa_guasto:"", fermo_impianto:false, downtime_ore:"",
    segnalatore_nome:"", segnalatore_email:"",
  };
  const [f, sf] = useState(ticket ? {
    titolo:              ticket.titolo||"",
    tipo:                ticket.tipo||"correttiva",
    priorita:            ticket.priorita||"media",
    stato:               ticket.stato||"aperto",
    cliente_id:          String(ticket.cliente_id||""),
    asset_id:            String(ticket.asset_id||""),
    operatore_id:        String(ticket.operatore_id||""),
    descrizione:         ticket.descrizione||"",
    causa_guasto:        ticket.causa_guasto||"",
    fermo_impianto:      ticket.fermo_impianto||false,
    downtime_ore:        ticket.downtime_ore||"",
    segnalatore_nome:    ticket.segnalatore_nome||"",
    segnalatore_email:   ticket.segnalatore_email||"",
  } : vuoto);
  const [saving, setSaving] = useState(false);
  const [aiSugg, setAiSugg] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiTimer = useRef(null);
  const set = (k,v) => {
    sf(p=>({...p,[k]:v}));
    // Auto-classifica quando cambia descrizione o titolo
    if (k === "descrizione" || k === "titolo") {
      clearTimeout(aiTimer.current);
      const newText = k === "descrizione" ? v : f.descrizione;
      const newTitle = k === "titolo" ? v : f.titolo;
      const combined = [newTitle, newText].filter(Boolean).join(" - ");
      if (combined.length > 15) {
        aiTimer.current = setTimeout(async () => {
          setAiLoading(true);
          const sugg = await classificaTicket(combined, assets, clienti);
          setAiSugg(sugg);
          setAiLoading(false);
        }, 1500);
      }
    }
  };

  const assetsCliente = useMemo(()=>
    f.cliente_id ? assets.filter(a=>String(a.clienteId||a.cliente_id)===f.cliente_id) : assets
  , [f.cliente_id, assets]);

  const fornitori = operatori.filter(o=>o.tipo==="fornitore");

  const applicaAI = (sugg) => {
    sf(p => ({
      ...p,
      tipo:          sugg.tipo        || p.tipo,
      priorita:      sugg.priorita    || p.priorita,
      causa_guasto:  sugg.causa_guasto || p.causa_guasto,
      fermo_impianto:sugg.fermo_impianto ?? p.fermo_impianto,
      titolo:        (!p.titolo && sugg.titolo_suggerito) ? sugg.titolo_suggerito : p.titolo,
    }));
    setAiSugg(null);
  };

  const submit = async () => {
    if (!f.titolo.trim()) return;
    setSaving(true);
    try {
      const payload = {
        titolo:           f.titolo.trim(),
        tipo:             f.tipo,
        priorita:         f.priorita,
        stato:            f.stato,
        cliente_id:       f.cliente_id ? Number(f.cliente_id) : null,
        asset_id:         f.asset_id   ? Number(f.asset_id)   : null,
        operatore_id:     f.operatore_id ? Number(f.operatore_id) : null,
        descrizione:      f.descrizione||null,
        causa_guasto:     f.causa_guasto||null,
        fermo_impianto:   f.fermo_impianto,
        downtime_ore:     f.downtime_ore ? Number(f.downtime_ore) : null,
        segnalatore_nome: f.segnalatore_nome||null,
        segnalatore_email:f.segnalatore_email||null,
        tenant_id:        tenantId,
      };
      await onSalva(payload, ticket?.id);
      onClose();
    } catch(e) {
      console.error("Ticket error:", e.message);
    } finally { setSaving(false); }
  };

  const inp = { width:"100%", padding:"9px 11px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:13, background:"var(--surface)", color:"var(--text-1)", boxSizing:"border-box" };
  const sel = { ...inp };

  return (
    <Overlay>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)", width:"min(560px,96vw)", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:16 }}>
            {ticket ? "Modifica Ticket" : "Nuovo Ticket"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"var(--text-3)" }}>✕</button>
        </div>

        <div style={{ padding:"20px 24px", display:"grid", gap:14 }}>
          <Field label="Titolo *">
            <input style={inp} value={f.titolo} onChange={e=>set("titolo",e.target.value)} placeholder="Descrizione breve del problema..." />
          </Field>

          {/* Suggerimento AI */}
          {aiLoading && (
            <div style={{ fontSize:12, color:"var(--text-3)", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span>
              Analisi AI in corso...
            </div>
          )}
          {aiSugg && !aiLoading && (
            <AIClassificaBadge suggerimento={aiSugg} onApplica={applicaAI} />
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Tipo">
              <select style={sel} value={f.tipo} onChange={e=>set("tipo",e.target.value)}>
                {TICKET_TIPI.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Field>
            <Field label="Priorità">
              <select style={sel} value={f.priorita} onChange={e=>set("priorita",e.target.value)}>
                {TICKET_PRIORITA.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>
          </div>

          {ticket && (
            <Field label="Stato">
              <select style={sel} value={f.stato} onChange={e=>set("stato",e.target.value)}>
                {TICKET_STATI.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Cliente">
              <select style={sel} value={f.cliente_id} onChange={e=>{set("cliente_id",e.target.value);set("asset_id","");}}>
                <option value="">— Nessun cliente —</option>
                {clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
              </select>
            </Field>
            <Field label="Asset / Impianto">
              <select style={sel} value={f.asset_id} onChange={e=>set("asset_id",e.target.value)}>
                <option value="">— Nessun asset —</option>
                {assetsCliente.map(a=><option key={a.id} value={String(a.id)}>{a.nome}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Assegna a tecnico">
            <select style={sel} value={f.operatore_id} onChange={e=>set("operatore_id",e.target.value)}>
              <option value="">— Non assegnato —</option>
              {fornitori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}{o.spec?` · ${o.spec}`:""}</option>)}
            </select>
          </Field>

          <Field label="Descrizione / Note">
            <textarea style={{...inp, resize:"vertical"}} rows={3} value={f.descrizione} onChange={e=>set("descrizione",e.target.value)} placeholder="Dettagli del problema, cosa è successo, cosa si è già tentato..." />
          </Field>

          {(f.tipo==="correttiva"||f.tipo==="urgente") && (
            <div style={{ background:"var(--surface-2)", borderRadius:"var(--radius)", padding:"14px", display:"grid", gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:2 }}>Dettagli guasto</div>
              <Field label="Causa guasto">
                <select style={sel} value={f.causa_guasto} onChange={e=>set("causa_guasto",e.target.value)}>
                  <option value="">— Non specificata —</option>
                  {["Usura componente","Guasto elettrico","Guasto meccanico","Corrosione","Errore operatore","Mancata manutenzione preventiva","Causa esterna","Difetto fabbricazione","Sconosciuta","Altro"].map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                <input type="checkbox" checked={f.fermo_impianto} onChange={e=>set("fermo_impianto",e.target.checked)} />
                <span>⛔ Fermo impianto</span>
              </label>
              {f.fermo_impianto && (
                <Field label="Ore downtime">
                  <input style={inp} type="number" min="0" step="0.5" value={f.downtime_ore} onChange={e=>set("downtime_ore",e.target.value)} placeholder="0.0" />
                </Field>
              )}
            </div>
          )}

          <div style={{ background:"var(--surface-2)", borderRadius:"var(--radius)", padding:"14px", display:"grid", gap:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:2 }}>Chi ha segnalato</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Nome">
                <input style={inp} value={f.segnalatore_nome} onChange={e=>set("segnalatore_nome",e.target.value)} placeholder="Nome e cognome" />
              </Field>
              <Field label="Email">
                <input style={inp} type="email" value={f.segnalatore_email} onChange={e=>set("segnalatore_email",e.target.value)} placeholder="email@azienda.it" />
              </Field>
            </div>
          </div>
        </div>

        <div style={{ padding:"0 24px 20px", borderTop:"1px solid var(--border)", paddingTop:16, display:"flex", justifyContent:"space-between", gap:10 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={submit} disabled={!f.titolo.trim()||saving} className="btn-primary">
            {saving ? "Salvataggio..." : ticket ? "Salva modifiche" : "Crea ticket"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Modal Converti in OdL ────────────────────────────────────────────────
function ModalConvertOdL({ ticket, operatori=[], onConverti, onClose }) {
  const fornitori = operatori.filter(o=>o.tipo==="fornitore");
  const [dataInizio, setDataI] = useState(new Date().toISOString().split("T")[0]);
  const [dataFine,   setDataF] = useState("");
  const [opId,       setOpId]  = useState(String(ticket.operatore_id||""));
  const [note,       setNote]  = useState(ticket.descrizione||"");
  const [saving,     setSav]   = useState(false);

  const submit = async () => {
    setSav(true);
    try { await onConverti({ dataInizio, dataFine, operatoreId:opId?Number(opId):null, note }); }
    catch(e) { console.error(e.message); setSav(false); }
  };

  const inp = { width:"100%", padding:"9px 11px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:13, background:"var(--surface)", color:"var(--text-1)", boxSizing:"border-box" };

  return (
    <Overlay zIndex={2000}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)", width:"min(460px,96vw)", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:16 }}>📋 Converti in Ordine di Lavoro</div>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:3 }}>
            Verrà creato un OdL collegato a questo ticket
          </div>
        </div>
        <div style={{ padding:"20px 24px", background:"var(--surface-2)", margin:"0 24px", borderRadius:"var(--radius)", marginTop:16, marginBottom:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", marginBottom:4 }}>Ticket: {ticket.numero}</div>
          <div style={{ fontSize:14, fontWeight:700 }}>{ticket.titolo}</div>
        </div>
        <div style={{ padding:"16px 24px 20px", display:"grid", gap:13 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Data inizio *">
              <input style={inp} type="date" value={dataInizio} onChange={e=>setDataI(e.target.value)} />
            </Field>
            <Field label="Data fine (opz.)">
              <input style={inp} type="date" value={dataFine} min={dataInizio} onChange={e=>setDataF(e.target.value)} />
            </Field>
          </div>
          <Field label="Tecnico assegnato">
            <select style={inp} value={opId} onChange={e=>setOpId(e.target.value)}>
              <option value="">— Non assegnato —</option>
              {fornitori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}</option>)}
            </select>
          </Field>
          <Field label="Note per l'OdL">
            <textarea style={{...inp, resize:"vertical"}} rows={2} value={note} onChange={e=>setNote(e.target.value)} />
          </Field>
        </div>
        <div style={{ padding:"0 24px 20px", borderTop:"1px solid var(--border)", paddingTop:16, display:"flex", justifyContent:"space-between", gap:10 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={submit} disabled={!dataInizio||saving} className="btn-primary">
            {saving ? "Creazione..." : "📋 Crea OdL"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Pannello dettaglio ticket (slide-in laterale) ────────────────────────
function PanelloDettaglio({ ticket, clienti=[], assets=[], operatori=[], tenantId, onStato, onMod, onDel, onConvertOdL, onClose, onApriOdl }) {
  const [commenti,  setCommenti]  = useState([]);
  const [testoComm, setTesto]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [converting, setConverting] = useState(false);
  const endRef = useRef(null);

  const cl  = clienti.find(c=>c.id===ticket.cliente_id);
  const as  = assets.find(a=>a.id===ticket.asset_id);
  const op  = operatori.find(o=>o.id===ticket.operatore_id);
  const tipo = tipoInfo(ticket.tipo);
  const stato = statoInfo(ticket.stato);

  useEffect(()=>{
    if (!ticket) return;
    supabase.from("ticket_commenti")
      .select("*").eq("ticket_id",ticket.id).order("created_at")
      .then(({data})=>setCommenti(data||[]));
  },[ticket?.id]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[commenti]);

  const inviaCommento = async () => {
    if (!testoComm.trim()) return;
    setSending(true);
    try {
    const { data } = await supabase.from("ticket_commenti").insert({
      ticket_id: ticket.id,
      testo:     testoComm.trim(),
      autore_nome: "Admin",
      tenant_id: tenantId,
    }).select().single();
    if (data) setCommenti(p=>[...p,data]);
    setTesto("");
    } catch(e) { console.error("inviaCommento:", e.message); }
    finally { setSending(false); }
  };

  // NEXT e NEXT_LBL definite a livello modulo

  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(500px,100vw)", background:"var(--surface)", borderLeft:"1px solid var(--border)", boxShadow:"-4px 0 32px rgba(0,0,0,.18)", zIndex:500, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", fontFamily:"var(--font-head)" }}>{ticket.numero}</span>
              <BadgeTipo tipo={ticket.tipo} />
              <BadgePri priorita={ticket.priorita} />
              <BadgeStato stato={ticket.stato} />
              <SLABadge ticket={ticket} />
              {ticket.fermo_impianto && <span style={{ fontSize:10, fontWeight:700, color:"#DC2626", background:"#FEF2F2", padding:"2px 7px", borderRadius:99, border:"1px solid #FECACA" }}>⛔ Fermo impianto</span>}
            </div>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:15, lineHeight:1.3 }}>{ticket.titolo}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"var(--text-3)", flexShrink:0, padding:"4px 8px" }}>✕</button>
        </div>
      </div>

      {/* Corpo scrollabile */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 20px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* Info principali */}
        <div style={{ display:"grid", gap:8, fontSize:13 }}>
          {cl && <div style={{ display:"flex", gap:8 }}><span style={{ color:"var(--text-3)", minWidth:80 }}>Cliente</span><span style={{ fontWeight:600, color:"#7F77DD" }}>🏢 {cl.rs}</span></div>}
          {as && <div style={{ display:"flex", gap:8 }}><span style={{ color:"var(--text-3)", minWidth:80 }}>Asset</span><span>⚙ {as.nome}{as.tipo?` (${as.tipo})`:""}</span></div>}
          {op && <div style={{ display:"flex", gap:8, alignItems:"center" }}><span style={{ color:"var(--text-3)", minWidth:80 }}>Tecnico</span><span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:"50%", background:op.col, display:"inline-block" }}/>{op.nome}</span></div>}
          {!op && <div style={{ display:"flex", gap:8 }}><span style={{ color:"var(--text-3)", minWidth:80 }}>Tecnico</span><span style={{ color:"#F59E0B", fontWeight:600 }}>⚠ Non assegnato</span></div>}
          <div style={{ display:"flex", gap:8 }}><span style={{ color:"var(--text-3)", minWidth:80 }}>Aperto il</span><span>{fmtDT(ticket.created_at)}</span></div>
          {ticket.segnalatore_nome && <div style={{ display:"flex", gap:8 }}><span style={{ color:"var(--text-3)", minWidth:80 }}>Segnalato da</span><span>{ticket.segnalatore_nome}{ticket.segnalatore_email?` · ${ticket.segnalatore_email}`:""}</span></div>}
          {ticket.odl_id && (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ color:"var(--text-3)", minWidth:80 }}>OdL</span>
              <button onClick={()=>onApriOdl&&onApriOdl(ticket.odl_id)}
                style={{ background:"#EFF6FF", color:"#1D4ED8", border:"1px solid #BFDBFE",
                  borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:700,
                  cursor:onApriOdl?"pointer":"default", display:"flex", alignItems:"center", gap:5 }}>
                📋 Apri OdL collegato →
              </button>
            </div>
          )}
        </div>

        {/* Descrizione */}
        {ticket.descrizione && (
          <div style={{ background:"var(--surface-2)", borderRadius:"var(--radius)", padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:6 }}>Descrizione</div>
            <div style={{ fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{ticket.descrizione}</div>
          </div>
        )}

        {/* Dettagli guasto */}
        {(ticket.causa_guasto || ticket.downtime_ore) && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:"var(--radius)", padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#991B1B", textTransform:"uppercase", letterSpacing:".04em", marginBottom:6 }}>Dettagli guasto</div>
            {ticket.causa_guasto && <div style={{ fontSize:13, marginBottom:4 }}>🔍 <strong>Causa:</strong> {ticket.causa_guasto}</div>}
            {ticket.downtime_ore && <div style={{ fontSize:13 }}>⏱ <strong>Downtime:</strong> {ticket.downtime_ore}h</div>}
          </div>
        )}

        {/* Commenti / Log */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:8 }}>Attività & Commenti</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {commenti.length===0 && <div style={{ fontSize:12, color:"var(--text-3)", fontStyle:"italic" }}>Nessun commento. Aggiungi note sull'intervento.</div>}
            {commenti.map(c=>(
              <div key={c.id} style={{ background:"var(--surface-2)", borderRadius:"var(--radius-sm)", padding:"10px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:700 }}>{c.autore_nome||"Sistema"}</span>
                  <span style={{ fontSize:10, color:"var(--text-3)" }}>{fmtDT(c.created_at)}</span>
                </div>
                <div style={{ fontSize:12, lineHeight:1.5, whiteSpace:"pre-wrap" }}>{c.testo}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {/* Input commento */}
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <textarea
              value={testoComm}
              onChange={e=>setTesto(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)) inviaCommento(); }}
              placeholder="Aggiungi nota o aggiornamento... (Ctrl+Enter per inviare)"
              rows={2}
              style={{ flex:1, padding:"8px 10px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:12, resize:"none", background:"var(--surface)", color:"var(--text-1)" }}
            />
            <button onClick={inviaCommento} disabled={!testoComm.trim()||sending}
              style={{ padding:"8px 14px", background:"var(--navy)", color:"white", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:700, flexShrink:0, alignSelf:"flex-end" }}>
              {sending?"...":"Invia"}
            </button>
          </div>
        </div>
      </div>

      {/* Footer azioni */}
      <div style={{ padding:"14px 20px", borderTop:"1px solid var(--border)", flexShrink:0, display:"flex", flexDirection:"column", gap:8 }}>
        {/* Avanza stato */}
        {NEXT[ticket.stato] && (
          <button onClick={()=>onStato(ticket.id, NEXT[ticket.stato])}
            style={{ width:"100%", padding:"10px", background:ticket.stato==="in_attesa"?"#059669":"var(--amber)", color:ticket.stato==="in_attesa"?"white":"#0D1B2A", border:"none", borderRadius:"var(--radius-sm)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            {ticket.stato==="in_attesa" ? "✅ Approva richiesta" : NEXT_LBL[NEXT[ticket.stato]]}
          </button>
        )}
        {ticket.stato==="in_attesa" && (
          <button onClick={()=>onStato(ticket.id,"rifiutato")}
            style={{ width:"100%", padding:"8px", background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", borderRadius:"var(--radius-sm)", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            ✕ Rifiuta richiesta
          </button>
        )}

        <div style={{ display:"flex", gap:8 }}>
          {/* Converti in OdL */}
          {!ticket.odl_id && !["chiuso","annullato","rifiutato","in_attesa"].includes(ticket.stato) && (
            <button onClick={()=>setConverting(true)}
              style={{ flex:1, padding:"8px", background:"#EFF6FF", color:"#1D4ED8", border:"1px solid #BFDBFE", borderRadius:"var(--radius-sm)", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              📋 Converti in OdL
            </button>
          )}
          <button onClick={()=>onMod(ticket)}
            style={{ padding:"8px 14px", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", cursor:"pointer", fontSize:12 }}>✏ Modifica</button>
          {["chiuso","annullato"].includes(ticket.stato) && (
            <button onClick={()=>onDel(ticket.id)}
              style={{ padding:"8px 14px", background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", borderRadius:"var(--radius-sm)", cursor:"pointer", fontSize:12 }}>✕</button>
          )}
        </div>
      </div>

      {/* Modal converti */}
      {converting && (
        <ModalConvertOdL
          ticket={ticket}
          operatori={operatori}
          onConverti={async(params)=>{ await onConvertOdL(ticket, params); setConverting(false); }}
          onClose={()=>setConverting(false)}
        />
      )}
    </div>
  );
}

// ─── Vista principale Ticket ──────────────────────────────────────────────
export function GestioneTicket({ clienti=[], assets=[], operatori=[], tenantId, isAdmin=true, onOdlCreato, onApriOdl, ticketIniziale=null, mostraInAttesa=false }) {
  const [tickets,   setTickets]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [sel,       setSel]       = useState(null);   // ticket aperto nel pannello
  const [form,      setForm]      = useState(null);   // null | "nuovo" | ticket da modificare
  const [fStato,    setFS]        = useState(mostraInAttesa ? "in_attesa" : "aperto");
  const [fTipo,     setFT]        = useState("tutti");
  const [fPri,      setFP]        = useState("tutti");
  const [fOp,       setFO]        = useState("tutti");
  const [fCliente,  setFC]        = useState("tutti");
  const [cerca,     setCerca]     = useState("");

  const [ticketEvidenziato, setTicketEv] = useState(ticketIniziale?.id||null);
  useEffect(()=>{
    if (!ticketIniziale?.id) return;
    setTicketEv(ticketIniziale.id);
    // Apri automaticamente il pannello dettaglio sul ticket iniziale
    const t = tickets.find(x=>x.id===ticketIniziale.id);
    if (t) setSel(t);
    const el = document.getElementById(`ticket-row-${ticketIniziale.id}`);
    if (el) el.scrollIntoView({behavior:"smooth",block:"center"});
    const timer = setTimeout(()=>setTicketEv(null), 3000);
    return ()=>clearTimeout(timer);
  }, [ticketIniziale?.id, tickets]);

  // Profili SLA per calcolare scadenze reali per cliente
  const [slaProfiles, setSlaProfiles] = useState({});
  useEffect(()=>{
    if (!tenantId) return;
    supabase.from("sla_profili")
      .select("id, nome, is_default, sla_profilo_config(*)")
      .eq("tenant_id", tenantId)
      .then(({data})=>{
        if (!data) return;
        const map = {};
        data.forEach(p=>{
          map[p.id] = p;
          if (p.is_default) map['default'] = p;
        });
        setSlaProfiles(map);
      });
  }, [tenantId]);

  const carica = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase.from("tickets")
      .select("*").eq("tenant_id", tenantId)
      .order("created_at", {ascending:false});
    setTickets(data||[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(()=>{ carica(); }, [carica]);

  // Filtrati
  const ticketsView = useMemo(()=>{
    return tickets.filter(t=>{
      if (fStato==="attivi") { if (!STATI_ATTIVI.includes(t.stato)) return false; }
      else if (fStato!=="tutti" && t.stato!==fStato) return false;
      if (fTipo!=="tutti"  && t.tipo!==fTipo)   return false;
      if (fPri!=="tutti"   && t.priorita!==fPri) return false;
      if (fOp!=="tutti"    && String(t.operatore_id)!==fOp) return false;
      if (fCliente!=="tutti"&&String(t.cliente_id)!==fCliente) return false;
      if (cerca.trim() && !t.titolo.toLowerCase().includes(cerca.toLowerCase()) &&
          !t.numero?.toLowerCase().includes(cerca.toLowerCase())) return false;
      return true;
    });
  }, [tickets, fStato, fTipo, fPri, fOp, fCliente, cerca]);

  // KPI
  const kpi = useMemo(()=>({
    aperti:       tickets.filter(t=>t.stato==="aperto").length,
    inLavorazione:tickets.filter(t=>t.stato==="in_lavorazione").length,
    slaScaduti:   tickets.filter(t=>{
      if (["chiuso","annullato","risolto"].includes(t.stato)) return false;
      const sc = slaScadenza(t, slaProfiles, clienti); return sc && sc < new Date();
    }).length,
    inAttesa: tickets.filter(t => t.stato === "in_attesa").length,
    critici:      tickets.filter(t=>t.priorita==="critica"&&![...STATI_TERMINALI,"risolto"].includes(t.stato)).length,
  }), [tickets]);

  const clientiUsati = useMemo(()=>{
    const ids=[...new Set(tickets.map(t=>t.cliente_id).filter(Boolean))];
    return ids.map(id=>clienti.find(c=>c.id===id)).filter(Boolean);
  },[tickets,clienti]);

  const opUsati = useMemo(()=>{
    const ids=[...new Set(tickets.map(t=>t.operatore_id).filter(Boolean))];
    return ids.map(id=>operatori.find(o=>o.id===id)).filter(Boolean);
  },[tickets,operatori]);

  // CRUD
  const salvaTicket = async (payload, id) => {
    try {
      if (id) {
        const { data, error } = await supabase.from("tickets").update(payload).eq("id",id).eq("tenant_id",tenantId).select().single();
        if (error) throw error;
        setTickets(p=>p.map(t=>t.id===id?data:t));
        if (sel?.id===id) setSel(data);
      } else {
        const anno = new Date().getFullYear();
        const count = tickets.filter(t=>(t.numero||"").startsWith(`TKT-${anno}`)).length+1;
        const numero = `TKT-${anno}-${String(count).padStart(3,"0")}`;
        const { data, error } = await supabase.from("tickets").insert({...payload, numero}).select().single();
        if (error) throw error;
        setTickets(p=>[data,...p]);
      }
    } catch(e) { throw e; } // ri-lancia per gestione nel form
  };

  const aggiornaStat = async (id, stato) => {
    try {
    const extra = stato==="risolto" ? {risolto_at:new Date().toISOString()} : {};
    const { data, error } = await supabase.from("tickets").update({stato,...extra}).eq("id",id).eq("tenant_id",tenantId).select().single();
    if (error) { console.error("Errore aggiornaStat:", error.message); return; }
    setTickets(p=>p.map(t=>t.id===id?data:t));
    if (sel?.id===id) setSel(data);
    // Aggiungi log
    const testo = stato === "aperto"    ? "✅ Richiesta approvata — ticket aperto" :
                  stato === "rifiutato" ? "✕ Richiesta rifiutata" :
                  `Stato aggiornato → ${statoInfo(stato).l}`;
    await supabase.from("ticket_commenti").insert({
      ticket_id:id, testo, autore_nome:"Sistema", tipo:"log", tenant_id:tenantId,
    });
    } catch(e) { console.error("aggiornaStat:", e.message); }
  };

  const eliminaTicket = async (id) => {
    try { await supabase.from("tickets").delete().eq("id",id); } catch(e) { console.error(e); return; }
    setTickets(p=>p.filter(t=>t.id!==id));
    if (sel?.id===id) setSel(null);
  };

  // Converti in OdL
  const convertToOdL = async (ticket, { dataInizio, dataFine, operatoreId, note }) => {
    const anno = new Date().getFullYear();
    const num = `OdL-${anno}-${String(Math.floor(Math.random()*9000)+1000)}`;
    const { data: odlData, error } = await supabase.from("ordini_lavoro").insert({
      titolo:       `[TKT] ${ticket.titolo}`,
      numero:       num,
      stato:        "confermato",
      piano_id:     null,
      cliente_id:   ticket.cliente_id,
      operatore_id: operatoreId,
      data_inizio:  dataInizio,
      data_fine:    dataFine||dataInizio,
      note:         note||ticket.descrizione||null,
      tenant_id:    tenantId,
    }).select().single();
    if (error) throw error;

    // Collega ticket → OdL
    const { data: upd } = await supabase.from("tickets")
      .update({ odl_id: odlData.id, stato:"in_lavorazione" }).eq("id",ticket.id).eq("tenant_id",tenantId).select().single();
    if (upd) { setTickets(p=>p.map(t=>t.id===ticket.id?upd:t)); setSel(upd); }

    // Log
    await supabase.from("ticket_commenti").insert({
      ticket_id:ticket.id, testo:`OdL creato: ${num}`,
      autore_nome:"Sistema", tipo:"log", tenant_id:tenantId,
    });

    onOdlCreato?.(odlData);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { l:"In attesa",     v:kpi.inAttesa||0,   col:kpi.inAttesa>0?"#D97706":"#6B7280", icon:"⏳" },
          { l:"Aperti",        v:kpi.aperti,        col:"#3B82F6", icon:"📬" },
          { l:"In lavorazione",v:kpi.inLavorazione,  col:"#F59E0B", icon:"🔧" },
          { l:"SLA scaduti",   v:kpi.slaScaduti,    col:kpi.slaScaduti>0?"#DC2626":"#059669", icon:"⏱" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--surface-2)", borderRadius:"var(--radius)", padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>{k.icon} {k.l}</div>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:22, color:k.col }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Filtri + bottone nuovo */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input value={cerca} onChange={e=>setCerca(e.target.value)}
          placeholder="🔍 Cerca per titolo o numero..."
          style={{ padding:"8px 12px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:13, flex:"1 1 180px", minWidth:180, background:"var(--surface)", color:"var(--text-1)" }} />
        <select value={fStato} onChange={e=>setFS(e.target.value)} style={{ padding:"8px 10px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:12 }}>
          <option value="tutti">Tutti gli stati</option>
          {TICKET_STATI.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select value={fTipo} onChange={e=>setFT(e.target.value)} style={{ padding:"8px 10px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:12 }}>
          <option value="tutti">Tutti i tipi</option>
          {TICKET_TIPI.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <select value={fPri} onChange={e=>setFP(e.target.value)} style={{ padding:"8px 10px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:12 }}>
          <option value="tutti">Tutte le priorità</option>
          {TICKET_PRIORITA.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
        {clientiUsati.length>1 && (
          <select value={fCliente} onChange={e=>setFC(e.target.value)} style={{ padding:"8px 10px", border:"1px solid var(--border-dim)", borderRadius:7, fontSize:12 }}>
            <option value="tutti">Tutti i clienti</option>
            {clientiUsati.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
          </select>
        )}
        {(fStato!=="aperto"||fTipo!=="tutti"||fPri!=="tutti"||fCliente!=="tutti"||cerca) && (
          <button onClick={()=>{setFS("aperto");setFT("tutti");setFP("tutti");setFC("tutti");setCerca("");}} className="btn-ghost" style={{fontSize:12}}>✕ Reset</button>
        )}
        <div style={{flex:1}}/>
        {isAdmin && (
          <button onClick={()=>setForm("nuovo")} className="btn-primary" style={{whiteSpace:"nowrap"}}>
            + Nuovo ticket
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:"var(--text-3)" }}>Caricamento ticket...</div>
      ) : ticketsView.length===0 ? (
        <div className="empty">
          <div className="empty-icon">🎫</div>
          <div className="empty-text">
            {tickets.length===0 ? "Nessun ticket. Creane uno per segnalare un intervento straordinario." : "Nessun ticket corrisponde ai filtri selezionati."}
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gap:8 }}>
          {ticketsView.map(t=>{
            const cl  = clienti.find(c=>c.id===t.cliente_id);
            const as  = assets.find(a=>a.id===t.asset_id);
            const op  = operatori.find(o=>o.id===t.operatore_id);
            const tip = tipoInfo(t.tipo);
            const st  = statoInfo(t.stato);
            const pr  = prioritaInfo(t.priorita);
            const scad = slaScadenza(t, slaProfiles, clienti);
            const slaOk = !scad || scad > new Date() || [...STATI_TERMINALI, "risolto"].includes(t.stato);
            const isSel = sel?.id===t.id;
            return (
              <div key={t.id}
                id={`ticket-row-${t.id}`}
                onClick={()=>setSel(isSel?null:t)}
                style={{
                  background:"var(--surface)",
                  transition:"box-shadow .3s",
                  ...(ticketEvidenziato===t.id ? {boxShadow:"0 0 0 3px var(--amber)",animation:"highlightOdl 3s ease"} : {}),
                  border:`1px solid ${isSel?"var(--amber)":slaOk?"var(--border)":"#FECACA"}`,
                  borderLeft:`4px solid ${tip.col}`,
                  borderRadius:"var(--radius-xl)",
                  padding:"12px 16px",
                  cursor:"pointer",
                  transition:"all .15s",
                  outline:isSel?"2px solid var(--amber)":"none",
                  outlineOffset:-1,
                }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  {/* Left: date box */}
                  <div style={{ width:40, height:40, borderRadius:"var(--radius)", background:tip.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:tip.col, lineHeight:1 }}>
                      {new Date(t.created_at).getDate()}
                    </span>
                    <span style={{ fontSize:8, color:tip.col, textTransform:"uppercase" }}>
                      {new Date(t.created_at).toLocaleDateString("it-IT",{month:"short"})}
                    </span>
                  </div>

                  {/* Center: info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:3 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", fontFamily:"var(--font-head)" }}>{t.numero}</span>
                      <BadgeTipo tipo={t.tipo} />
                      <BadgePri priorita={t.priorita} />
                      <BadgeStato stato={t.stato} />
                      {!slaOk && <SLABadge ticket={t} scadenza={slaScadenza(t, slaProfiles, clienti)} />}
                      {t.fermo_impianto && <span style={{ fontSize:10, fontWeight:700, color:"#DC2626" }}>⛔</span>}
                      {t.odl_id && <span style={{ fontSize:10, color:"#3B82F6", fontWeight:700 }}>📋 OdL</span>}
                    </div>
                    <div style={{ fontWeight:700, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>{t.titolo}</div>
                    <div style={{ fontSize:11, color:"var(--text-3)", display:"flex", gap:8, flexWrap:"wrap" }}>
                      {cl && <span style={{ color:"#7F77DD", fontWeight:600 }}>🏢 {cl.rs}</span>}
                      {as && <span>⚙ {as.nome}</span>}
                      {op ? <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:7, height:7, borderRadius:"50%", background:op.col, display:"inline-block" }}/>{op.nome}</span> : <span style={{ color:"#F59E0B" }}>⚠ Non assegnato</span>}
                    </div>
                  </div>

                  {/* Right: azioni rapide */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                    {NEXT[t.stato] && (
                      <button onClick={()=>aggiornaStat(t.id, NEXT[t.stato])}
                        style={{ padding:"4px 10px", fontSize:11, fontWeight:700,
                          background:NEXT[t.stato]==="risolto"?"#ECFDF5":NEXT[t.stato]==="in_lavorazione"?"#FEF3C7":"#EFF6FF",
                          color:NEXT[t.stato]==="risolto"?"#059669":NEXT[t.stato]==="in_lavorazione"?"#92400E":"#1E40AF",
                          border:"none", borderRadius:6, cursor:"pointer", whiteSpace:"nowrap" }}>
                        {NEXT_LBL[NEXT[t.stato]]}
                      </button>
                    )}
                    <span style={{ fontSize:10, color:"var(--text-3)" }}>{fmtDT(t.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overlay cliccato fuori */}
      {sel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.25)", zIndex:499 }} onClick={()=>setSel(null)} />
      )}

      {/* Pannello dettaglio */}
      {sel && (
        <PanelloDettaglio
          ticket={sel}
          clienti={clienti} assets={assets} operatori={operatori}
          tenantId={tenantId}
          onStato={aggiornaStat}
          onMod={(t)=>{ setForm(t); setSel(null); }}
          onDel={eliminaTicket}
          onConvertOdL={convertToOdL}
          onApriOdl={onApriOdl}
          onClose={()=>setSel(null)}
        />
      )}

      {/* Form nuovo/modifica */}
      {form && (
        <FormTicket
          ticket={form==="nuovo"?null:form}
          clienti={clienti} assets={assets} operatori={operatori}
          tenantId={tenantId}
          onSalva={salvaTicket}
          onClose={()=>setForm(null)}
        />
      )}
    </div>
  );
}
