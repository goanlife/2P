import React, { useState, useMemo } from "react";
import { supabase } from "../supabase";
import { SelettoreTema, TEMI} from "./AllegatiTemi";
import { AvatarComp, Overlay, Modal, Field } from "./ui/Atoms";

const COLORI_OP = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6"];

const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7   },
  { v:"mensile",     l:"Mensile",     giorni:30  },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60  },
  { v:"trimestrale", l:"Trimestrale", giorni:90  },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";

const STATO_LABEL = { pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };

const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };

const TIPO_OP = {
  fornitore: { label:"Fornitore", cls:"badge", style:{background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE"} },
  cliente:   { label:"Cliente",   cls:"badge", style:{background:"#EEEDFE",color:"#4F46E5",border:"1px solid #C4B5FD"} },
  interno:   { label:"Interno",   cls:"badge", style:{background:"#ECFDF5",color:"#065F46",border:"1px solid #A7F3D0"} },
};
const COLORI_GRUPPI = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6","#0EA5E9","#84CC16"];

// ─── Modal Siti Cliente ───────────────────────────────────────────────────
export function ModalSitiCliente({operatore, clienti=[], siti=[], onClose, onSave}) {
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
export function VistaCliente({operatore, clienti=[], assets=[], manutenzioni=[], piani=[], siti=[], onClose}) {
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
export function ModalUtente({ini, onClose, onSalva}) {
  const [f,sf]=useState(ini||{nome:"",spec:"",col:"#378ADD",tipo:"fornitore",email:"",tema:"navy",tariffa_ora:""});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  return (
    <Modal title={ini?"Modifica utente":"Nuovo utente"} onClose={onClose} onSave={()=>onSalva(f)} saveOk={!!f.nome.trim()} saveLabel={ini?"Aggiorna":"Aggiungi"}>
      <Field label="Nome e cognome *"><input value={f.nome} onChange={e=>s("nome",e.target.value)} placeholder="Es. Mario Rossi..." style={{width:"100%"}} /></Field>
      <Field label="Email (per accesso app)"><input type="email" value={f.email||""} onChange={e=>s("email",e.target.value)} placeholder="nome@azienda.it" style={{width:"100%"}} /></Field>
      {f.tipo==="fornitore" && <Field label="Tariffa oraria (€/h)"><input type="number" min="0" step="0.5" value={f.tariffa_ora||""} onChange={e=>s("tariffa_ora",e.target.value)} placeholder="Es. 45.00" style={{width:"100%"}} /></Field>}
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


// ─── Gestione Utenti ──────────────────────────────────────────────────────
export function ModalCreaAccesso({operatore, onClose, onSuccess}) {
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


// ─── Pannello guida configurazione utenti ────────────────────────────────
function GuidaSetup({ operatori=[], onCrea, onClose }) {
  const haTecnici  = operatori.some(o => o.tipo === "fornitore"  && o.authUserId);
  const haClienti  = operatori.some(o => o.tipo === "cliente"    && o.authUserId);
  const totUtenti  = operatori.filter(o => o.authUserId).length;
  const totAnag    = operatori.length;

  const Step = ({ num, done, title, sub, action, actionLabel }) => (
    <div style={{
      display:"flex", gap:14, padding:"14px 16px",
      background: done ? "#ECFDF5" : "var(--surface)",
      border:`1px solid ${done ? "#A7F3D0" : "var(--border)"}`,
      borderRadius:10, marginBottom:8,
    }}>
      <div style={{
        width:32, height:32, borderRadius:"50%", flexShrink:0,
        background: done ? "#059669" : "var(--navy)",
        color:"white", display:"flex", alignItems:"center",
        justifyContent:"center", fontWeight:700, fontSize:13,
      }}>
        {done ? "✓" : num}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:13, color: done ? "#065F46" : "var(--text-1)" }}>
          {title}
        </div>
        <div style={{ fontSize:12, color: done ? "#059669" : "var(--text-3)", marginTop:3, lineHeight:1.5 }}>
          {sub}
        </div>
      </div>
      {!done && action && (
        <button onClick={action} className="btn-primary"
          style={{ fontSize:12, padding:"6px 14px", flexShrink:0, alignSelf:"center" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );

  return (
    <div style={{
      background:"var(--surface)", border:"1px solid var(--amber)",
      borderRadius:12, padding:"18px 20px", marginBottom:16,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>🚀 Guida configurazione utenti</div>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:3 }}>
            Segui questi passi per configurare chi può accedere all'app
          </div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
          color:"var(--text-3)", fontSize:16, padding:"4px 8px" }}>✕</button>
      </div>

      <Step
        num={1} done={totAnag > 0}
        title="Aggiungi i tuoi tecnici / fornitori"
        sub={totAnag > 0
          ? `✅ ${totAnag} operatori in anagrafica`
          : "Crea i profili dei tecnici e fornitori che eseguono le manutenzioni. Non hanno ancora accesso all'app — servono solo per assegnare le attività."}
        action={onCrea} actionLabel="+ Aggiungi tecnico"
      />

      <Step
        num={2} done={haTecnici}
        title="Crea l'accesso login ai tecnici"
        sub={haTecnici
          ? "✅ Almeno un tecnico ha le credenziali di accesso"
          : "Opzionale ma consigliato: clicca 🔑 sulla card del tecnico per creare email+password. Il tecnico vedrà solo le sue attività assegnate."}
      />

      <Step
        num={3} done={haClienti}
        title="Aggiungi i tuoi clienti come utenti (opzionale)"
        sub={haClienti
          ? "✅ Almeno un cliente ha accesso al portale"
          : "Crea un operatore di tipo 'Cliente' e collegalo al cliente in anagrafica. Vedrà solo le attività del suo sito in sola lettura."}
      />

      <div style={{
        background:"#EFF6FF", border:"1px solid #BFDBFE",
        borderRadius:8, padding:"12px 14px", marginTop:4,
      }}>
        <div style={{ fontWeight:700, fontSize:12, color:"#1E40AF", marginBottom:6 }}>
          💡 Come funziona il multi-tenant
        </div>
        <div style={{ fontSize:12, color:"#1E40AF", lineHeight:1.7 }}>
          <strong>Ogni azienda cliente è un tenant separato</strong> — i dati sono completamente isolati.<br/>
          Quando vendi ManuMan a una nuova azienda, il loro admin fa login, crea la propria azienda
          e gestisce autonomamente i propri utenti.<br/>
          Tu (il fornitore ManuMan) non vedi i dati degli altri tenant.
        </div>
      </div>
    </div>
  );
}

export function GestioneUtenti({operatori=[], man=[], clienti=[], siti=[], onAgg, onMod, onDel, onSaveSiti, onCreaAccesso}) {
  const [showM,ssM]=useState(false);const [inMod,siM]=useState(null);
  const [sitiModal,setSitiModal]=useState(null);const [vistaModal,setVistaModal]=useState(null);
  const [accessoModal,setAccessoModal]=useState(null);
  const [filtroTipo,setFiltroTipo]=useState("tutti");
  const [showGuida, setShowGuida]=useState(()=>{
    // Mostra la guida la prima volta o se non ci sono utenti con accesso
    return !localStorage.getItem("manuMan_guidaUtentiDismissed");
  });
  const assets=[];// passed through but not needed here
  const filtrati=useMemo(()=>operatori.filter(o=>filtroTipo==="tutti"||o.tipo===filtroTipo),[operatori,filtroTipo]);

  const chiudiGuida = () => {
    try { localStorage.setItem("manuMan_guidaUtentiDismissed","1"); } catch {}
    setShowGuida(false);
  };

  return (
    <div style={{display:"grid",gap:12}}>
      {/* Guida setup */}
      {showGuida && (
        <GuidaSetup
          operatori={operatori}
          onCrea={()=>{ siM(null); ssM(true); }}
          onClose={chiudiGuida}
        />
      )}
      {!showGuida && (
        <button onClick={()=>setShowGuida(true)}
          style={{textAlign:"left", background:"none", border:"none", cursor:"pointer",
            fontSize:12, color:"var(--text-3)", padding:"0 0 4px" }}>
          ❓ Mostra guida configurazione utenti
        </button>
      )}

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
                <AvatarComp nome={op.nome} col={op.col} size={44} />
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
                  {(()=>{const tema=TEMI.find(t=>t.id===op.tema);return tema?(<>
                      <div style={{width:16,height:16,borderRadius:3,background:tema.top,flexShrink:0}} />
                      <div style={{width:8,height:16,borderRadius:2,background:tema.bot,flexShrink:0}} />
                      <span style={{fontSize:11.5,fontWeight:600,color:"var(--text-2)"}}>Tema: {tema.nome}</span>
                    </>):null;})()}
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
export function ModalGruppo({ini, onClose, onSalva}) {
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

export function ModalAssegnaGruppo({gruppo, operatori=[], clienti=[], gOps=[], gSiti=[], onClose, onSave}) {
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
                <AvatarComp nome={o.nome} col={o.col} size={28} />
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

export function GestioneGruppi({gruppi=[], operatori=[], clienti=[], man=[], gOps=[], gSiti=[], onAgg, onMod, onDel, onSaveAssoc}) {
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




// ─── Modal Crea Accesso ────────────────────────────────────────────────────