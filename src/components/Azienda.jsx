import React, { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { CatalogoRicambi } from "./GestioneRicambi"
import { ConfigSLA } from "./SLABadge"
import { richiediPermessoNotifiche } from "./Notifiche"
import { GestioneSLAProfili } from "./GestioneSLAProfili"
import { OrdiniAcquisto } from "./OrdiniAcquisto"
import { ConfigurazioneMenu } from "./ConfigurazioneMenu"



// ─── Banner guida multi-tenant ────────────────────────────────────────────
function BannerMTGuida({ isAdmin }) {
  const [vis, setVis] = useState(() => { try { return !localStorage.getItem("manuMan_mt_guide_ok"); } catch { return true; } });
  if (!vis || !isAdmin) return null;

  return (
    <div style={{
      background:"#0D1B2A", borderRadius:12, padding:"20px 22px",
      color:"white", position:"relative",
    }}>
      <button onClick={()=>{ try { localStorage.setItem("manuMan_mt_guide_ok","1"); } catch {} setVis(false); }}
        style={{ position:"absolute", top:12, right:12, background:"none", border:"none",
          color:"#8899aa", cursor:"pointer", fontSize:16 }}>✕</button>

      <div style={{ fontWeight:800, fontSize:16, color:"#F59E0B", marginBottom:4 }}>
        ⚙ ManuMan — Come funziona per più aziende
      </div>
      <div style={{ fontSize:12, color:"#8899aa", marginBottom:16 }}>
        Sei l'amministratore di questo tenant. Ecco il modello completo.
      </div>

      {/* Schema visivo */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr auto 1fr", gap:8,
        alignItems:"center", marginBottom:16 }}>

        {/* TU */}
        <div style={{ background:"#1a2a3a", borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:20, marginBottom:4 }}>🏭</div>
          <div style={{ fontSize:12, fontWeight:700, color:"#F59E0B" }}>Tu (fornitore)</div>
          <div style={{ fontSize:10, color:"#8899aa", marginTop:3, lineHeight:1.4 }}>
            Vendi ManuMan a<br/>N aziende clienti
          </div>
        </div>

        <div style={{ color:"#F59E0B", fontSize:18, textAlign:"center" }}>→</div>

        {/* TENANT */}
        <div style={{ background:"#1a2a3a", borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:20, marginBottom:4 }}>🏢</div>
          <div style={{ fontSize:12, fontWeight:700, color:"white" }}>Ogni azienda</div>
          <div style={{ fontSize:10, color:"#8899aa", marginTop:3, lineHeight:1.4 }}>
            = un Tenant separato<br/>con dati isolati
          </div>
          <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:3 }}>
            {["Azienda A","Azienda B","Azienda C"].map(a=>(
              <div key={a} style={{ fontSize:10, background:"#253545", borderRadius:4,
                padding:"2px 6px", color:"#aabbcc" }}>{a}</div>
            ))}
          </div>
        </div>

        <div style={{ color:"#F59E0B", fontSize:18, textAlign:"center" }}>→</div>

        {/* UTENTI */}
        <div style={{ background:"#1a2a3a", borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:20, marginBottom:4 }}>👥</div>
          <div style={{ fontSize:12, fontWeight:700, color:"white" }}>Utenti per tenant</div>
          <div style={{ fontSize:10, color:"#8899aa", marginTop:3, lineHeight:1.5 }}>
            <span style={{color:"#F59E0B"}}>👑 Admin</span> → gestisce tutto<br/>
            <span style={{color:"#7EC8E3"}}>🔧 Tecnico</span> → sue attività<br/>
            <span style={{color:"#A8D8A8"}}>🏢 Cliente</span> → solo lettura
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ fontSize:12, color:"#8899aa", lineHeight:2 }}>
        <span style={{ color:"#F59E0B", fontWeight:700 }}>Come vendere a una nuova azienda:</span>
        {"  "}<span style={{ background:"#253545", borderRadius:4, padding:"1px 6px", margin:"0 2px" }}>1</span>
        L'admin dell'azienda cliente si registra su ManuMan
        {"  "}<span style={{ background:"#253545", borderRadius:4, padding:"1px 6px", margin:"0 2px" }}>2</span>
        Crea la sua azienda (tenant) al primo accesso
        {"  "}<span style={{ background:"#253545", borderRadius:4, padding:"1px 6px", margin:"0 2px" }}>3</span>
        Invita i propri tecnici via codice (tab Invito)
        {"  "}<span style={{ background:"#253545", borderRadius:4, padding:"1px 6px", margin:"0 2px" }}>4</span>
        Oppure crea direttamente le credenziali dai Utenti → 🔑
      </div>
    </div>
  );
}

// ─── Tab configurazione email ─────────────────────────────────────────────

// ─── Componente test email ────────────────────────────────────────────────
function TestEmail() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [risultato, setRis]   = useState(null); // {ok, msg}

  const invia = async () => {
    if (!email.trim()) return;
    setLoading(true); setRis(null);
    try {
      const SUPA_URL  = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || ANON_KEY;

      const res = await fetch(`${SUPA_URL}/functions/v1/notifica-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo: "odl_assegnato",
          destinatario: email.trim(),
          dati: {
            numero: "OdL-TEST-001",
            titolo: "Email di prova da ManuMan",
            cliente: "Cliente di esempio",
            data_inizio: new Date().toLocaleDateString("it-IT"),
            n_attivita: 3,
            durata_ore: 2.5,
            url: window.location.origin,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setRis({ ok:true, msg:`✅ Email inviata a ${email}! Controlla la casella (anche spam).` });
      } else {
        const errMsg = data.error || data.message || `HTTP ${res.status}`;
        if (errMsg.includes("RESEND_API_KEY")) {
          setRis({ ok:false, msg:"❌ RESEND_API_KEY non configurata. Segui i passi sotto per aggiungerla a Supabase." });
        } else if (errMsg.includes("not found") || res.status === 404) {
          setRis({ ok:false, msg:"❌ Edge Function 'notifica-email' non trovata. Va deployata su Supabase (vedi istruzioni)." });
        } else {
          setRis({ ok:false, msg:`❌ Errore: ${errMsg}` });
        }
      }
    } catch(e) {
      const msg = e.message || "";
      if (msg.includes("offline") || msg.includes("not valid JSON") || msg.includes("Failed to fetch")) {
        setRis({ ok:false, tipo:"not_deployed", msg:"❌ Edge Function non ancora deployata su Supabase." });
      } else {
        setRis({ ok:false, msg:`❌ Errore: ${msg}` });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:"var(--surface)", border:"2px solid var(--amber)",
      borderRadius:10, padding:"16px 18px" }}>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>
        🧪 Testa invio email
      </div>
      <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:12 }}>
        Inserisci la tua email e clicca Invia per verificare che tutto funzioni correttamente.
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          placeholder="tua@email.it"
          style={{ flex:1 }}
          onKeyDown={e=>e.key==="Enter" && !loading && email.trim() && invia()}
        />
        <button
          onClick={invia}
          disabled={loading || !email.trim()}
          style={{
            padding:"8px 18px", borderRadius:7, fontWeight:700, fontSize:13,
            background: loading ? "var(--surface-3)" : "#059669",
            color: loading ? "var(--text-3)" : "white",
            border:"none", cursor: loading || !email.trim() ? "default" : "pointer",
            whiteSpace:"nowrap", flexShrink:0,
          }}>
          {loading ? "⏳ Invio..." : "📨 Invia prova"}
        </button>
      </div>

      {risultato && (
        <div style={{
          marginTop:10, padding:"10px 14px", borderRadius:7, fontSize:13,
          background: risultato.ok ? "#ECFDF5" : "#FEF2F2",
          border: `1px solid ${risultato.ok ? "#A7F3D0" : "#FECACA"}`,
          color: risultato.ok ? "#065F46" : "#991B1B",
          lineHeight:1.5,
        }}>
          {risultato.msg}
          {!risultato.ok && risultato.msg.includes("RESEND_API_KEY") && (
            <div style={{ marginTop:8, fontSize:12 }}>
              <strong>Come aggiungere la chiave:</strong>
              <ol style={{ marginLeft:16, marginTop:6, lineHeight:2 }}>
                <li>Vai su <a href="https://resend.com" target="_blank" style={{color:"#DC2626"}}>resend.com</a> → crea account gratuito</li>
                <li>Dashboard Resend → <strong>API Keys</strong> → Create API Key → copia il valore <code style={{background:"#FEE2E2",padding:"1px 4px",borderRadius:3}}>re_xxxx...</code></li>
                <li>Vai su <a href="https://supabase.com/dashboard/project/nnsylkjahuhttwajuxls/settings/functions" target="_blank" style={{color:"#DC2626"}}>Supabase → Project Settings → Edge Functions</a></li>
                <li>Sezione <strong>"Edge Function Secrets"</strong> → Add secret</li>
                <li>Nome: <code style={{background:"#FEE2E2",padding:"1px 4px",borderRadius:3}}>RESEND_API_KEY</code> · Valore: la tua chiave copiata</li>
                <li>Clicca <strong>Save</strong> e riprova qui</li>
              </ol>
            </div>
          )}
          {!risultato.ok && (risultato.msg.includes("Edge Function") || risultato.tipo==="not_deployed") && (
            <div style={{ marginTop:10, fontSize:12, lineHeight:1.8 }}>
              <strong>La funzione non è deployata. Per farlo:</strong>
              <ol style={{ marginLeft:16, marginTop:6, lineHeight:2.2 }}>
                <li>
                  Vai su{" "}
                  <a href="https://supabase.com/dashboard/project/nnsylkjahuhttwajuxls/functions"
                    target="_blank" style={{color:"#DC2626",fontWeight:600}}>
                    Supabase → Edge Functions
                  </a>
                </li>
                <li>Clicca <strong>"Deploy a new function"</strong> o <strong>"Via editor"</strong></li>
                <li>Nome funzione: <code style={{background:"#FEE2E2",padding:"2px 6px",borderRadius:3}}>notifica-email</code></li>
                <li>Copia il codice dal file <code style={{background:"#FEE2E2",padding:"2px 6px",borderRadius:3}}>supabase/functions/notifica-email/index.ts</code> nel repo GitHub</li>
                <li>Clicca <strong>Deploy</strong></li>
                <li>Poi aggiungi il secret <code style={{background:"#FEE2E2",padding:"2px 6px",borderRadius:3}}>RESEND_API_KEY</code> in <strong>Project Settings → Edge Functions</strong></li>
              </ol>
              <div style={{marginTop:8, padding:"8px 10px", background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:6}}>
                💡 <strong>Alternativa più rapida:</strong> aggiungi{" "}
                <code style={{background:"#FEE2E2",padding:"2px 5px",borderRadius:3}}>SUPABASE_ACCESS_TOKEN</code>{" "}
                nei secrets di GitHub e il workflow automatico la deplyerà ad ogni push.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabEmail({ emailConfig={}, onSalva, tenant, operatori=[], clienti=[] }) {

  // ── Struttura per ogni tipo di notifica ──────────────────────────────────
  const DEFAULT_NOTIFICHE = {
    odl_assegnato: {
      abilitato: true,
      label: "OdL confermato → tecnico",
      icon: "📋",
      desc: "Inviata quando un OdL passa a 'Confermato'",
      vars: ["nome_tecnico","numero_odl","titolo","cliente","data","n_attivita"],
      dest_operatore: true,
      dest_email_sito: false,
      dest_cliente: false,
      extra_emails: "",
      oggetto: "",
      corpo: "",
    },
    intervento_completato: {
      abilitato: true,
      label: "Intervento completato → cliente",
      icon: "✅",
      desc: "Inviata quando un OdL viene chiuso completato",
      vars: ["titolo","tecnico","chiuso_at","ore_effettive","cliente"],
      dest_operatore: false,
      dest_email_sito: false,
      dest_cliente: true,
      extra_emails: "",
      oggetto: "",
      corpo: "",
    },
    richiesta_ricevuta: {
      abilitato: true,
      label: "Nuova richiesta → admin",
      icon: "🔔",
      desc: "Inviata quando un cliente invia una nuova segnalazione",
      vars: ["titolo","cliente","asset","priorita","sottotipo","causa","fermo"],
      dest_operatore: false,
      dest_email_sito: true,
      dest_cliente: false,
      extra_emails: "",
      oggetto: "",
      corpo: "",
    },
    richiesta_approvata: {
      abilitato: true,
      label: "Richiesta approvata → cliente",
      icon: "✅",
      desc: "Inviata al cliente quando la sua segnalazione viene approvata",
      vars: ["titolo","cliente","operatore","data","durata"],
      dest_operatore: false,
      dest_email_sito: false,
      dest_cliente: true,
      extra_emails: "",
      oggetto: "",
      corpo: "",
    },
    richiesta_rifiutata: {
      abilitato: true,
      label: "Richiesta rifiutata → cliente",
      icon: "❌",
      desc: "Inviata al cliente quando la sua segnalazione non viene approvata",
      vars: ["titolo","cliente","motivo"],
      dest_operatore: false,
      dest_email_sito: false,
      dest_cliente: true,
      extra_emails: "",
      oggetto: "",
      corpo: "",
    },
    sla_alert: {
      abilitato: true,
      label: "SLA in scadenza",
      icon: "⚠️",
      desc: "Alert quando un'attività urgente sta per superare i tempi SLA",
      vars: ["titolo","cliente","ore_rimanenti","priorita"],
      dest_operatore: false,
      dest_email_sito: true,
      dest_cliente: false,
      extra_emails: "",
      oggetto: "",
      corpo: "",
    },
    scadenza_normativa: {
      abilitato: true,
      label: "Scadenza normativa",
      icon: "📅",
      desc: "Promemoria 30 giorni prima di adempimenti normativi",
      vars: ["titolo","cliente","scadenza","giorni_rimanenti","norma"],
      dest_operatore: false,
      dest_email_sito: true,
      dest_cliente: false,
      extra_emails: "",
      oggetto: "",
      corpo: "",
    },
  };

  // Merge config salvata con i default
  const buildCfg = () => {
    const saved = emailConfig.notifiche || {};
    const out = {};
    for (const [k, def] of Object.entries(DEFAULT_NOTIFICHE)) {
      out[k] = { ...def, ...(saved[k] || {}) };
    }
    return out;
  };

  const [abilitato,  setAbilitato]  = React.useState(emailConfig.abilitato ?? false);
  const [mittente,   setMittente]   = React.useState(emailConfig.mittente || "");
  const [emailSito,  setEmailSito]  = React.useState(emailConfig.emailSito || tenant?.email || "");
  const [notifiche,  setNotifiche]  = React.useState(buildCfg);
  const [espanso,    setEspanso]    = React.useState(null); // quale tipo è espanso
  const [salvato,    setSalvato]    = React.useState(false);

  const setN = (tipo, campo, val) =>
    setNotifiche(p => ({ ...p, [tipo]: { ...p[tipo], [campo]: val } }));

  const salva = () => {
    onSalva?.({ abilitato, mittente, emailSito, notifiche });
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  };

  // ── Componente toggle switch ──────────────────────────────────────────────
  const SwitchToggle = ({ on, onChange, disabled=false }) => (
    <label style={{ display:"flex", alignItems:"center", cursor:disabled?"default":"pointer", flexShrink:0 }}>
      <div style={{ position:"relative", width:40, height:22 }}>
        <input type="checkbox" checked={on} disabled={disabled} onChange={e=>onChange(e.target.checked)}
          style={{ position:"absolute", opacity:0, width:"100%", height:"100%", cursor:"pointer", margin:0 }} />
        <div style={{ width:40, height:22, borderRadius:11,
          background: on ? "#059669" : "var(--border)", transition:"background .2s",
          opacity: disabled ? .4 : 1 }}>
          <div style={{ position:"absolute", top:2, left:on?20:2, width:18, height:18,
            borderRadius:"50%", background:"white", transition:"left .2s",
            boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
        </div>
      </div>
    </label>
  );

  // ── Editor di una singola notifica ────────────────────────────────────────
  const EditorNotifica = ({ tipo, cfg: nc }) => {
    const def = DEFAULT_NOTIFICHE[tipo];
    const isOpen = espanso === tipo;

    return (
      <div style={{ border:"1px solid var(--border)", borderRadius:10, overflow:"hidden",
        opacity: !abilitato ? .5 : 1 }}>

        {/* Header riga */}
        <div style={{ display:"flex", alignItems:"center", padding:"12px 16px",
          background:"var(--surface)", gap:12 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{def.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{def.label}</div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginTop:1 }}>{def.desc}</div>
          </div>
          <SwitchToggle on={nc.abilitato} disabled={!abilitato}
            onChange={v=>setN(tipo,"abilitato",v)} />
          <button onClick={()=>setEspanso(isOpen?null:tipo)}
            disabled={!abilitato}
            style={{ background:"none", border:"1px solid var(--border)", borderRadius:6,
              padding:"4px 10px", cursor:"pointer", fontSize:11, color:"var(--text-3)",
              fontWeight:600 }}>
            {isOpen ? "▲ Chiudi" : "⚙ Configura"}
          </button>
        </div>

        {/* Pannello configurazione esteso */}
        {isOpen && (
          <div style={{ padding:"16px", borderTop:"1px solid var(--border)",
            background:"var(--surface-2)", display:"grid", gap:16 }}>

            {/* Destinatari */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".05em", color:"var(--text-3)", marginBottom:10 }}>
                Destinatari
              </div>
              <div style={{ display:"grid", gap:8 }}>
                {def.dest_operatore !== undefined && (
                  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                    <input type="checkbox" checked={nc.dest_operatore}
                      onChange={e=>setN(tipo,"dest_operatore",e.target.checked)} />
                    👤 Operatore/tecnico assegnato
                  </label>
                )}
                {def.dest_cliente !== undefined && (
                  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                    <input type="checkbox" checked={nc.dest_cliente}
                      onChange={e=>setN(tipo,"dest_cliente",e.target.checked)} />
                    🏢 Email del cliente (anagrafica clienti)
                  </label>
                )}
                {def.dest_email_sito !== undefined && (
                  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                    <input type="checkbox" checked={nc.dest_email_sito}
                      onChange={e=>setN(tipo,"dest_email_sito",e.target.checked)} />
                    📬 Email sito ({emailSito || "configura sotto"})
                  </label>
                )}
                <div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>
                    Email aggiuntive (separate da virgola)
                  </div>
                  <input value={nc.extra_emails}
                    onChange={e=>setN(tipo,"extra_emails",e.target.value)}
                    placeholder="es. responsabile@azienda.it, admin@azienda.it"
                    style={{ width:"100%", fontSize:12 }} />
                </div>
              </div>
            </div>

            {/* Oggetto personalizzato */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".05em", color:"var(--text-3)", marginBottom:6 }}>
                Oggetto email
              </div>
              <input value={nc.oggetto}
                onChange={e=>setN(tipo,"oggetto",e.target.value)}
                placeholder="Lascia vuoto per usare il default automatico"
                style={{ width:"100%" }} />
              <div style={{ fontSize:10, color:"var(--text-3)", marginTop:4 }}>
                Variabili disponibili: {def.vars.map(v=>`{{${v}}}`).join(", ")}
              </div>
            </div>

            {/* Corpo personalizzato */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".05em", color:"var(--text-3)", marginBottom:6 }}>
                Testo aggiuntivo nel corpo email
              </div>
              <textarea value={nc.corpo}
                onChange={e=>setN(tipo,"corpo",e.target.value)}
                rows={3} style={{ width:"100%", fontSize:12, resize:"vertical" }}
                placeholder={`Es. Per urgenze contattare il numero 02-123456. Usa {{titolo}}, {{cliente}} ecc. per includere dati dinamici.`} />
              <div style={{ fontSize:10, color:"var(--text-3)", marginTop:4 }}>
                Questo testo viene aggiunto al template base. Puoi usare le stesse variabili dell'oggetto.
              </div>
            </div>

          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display:"grid", gap:16 }}>

      {/* Setup banner */}
      <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE",
        borderRadius:10, padding:"16px 18px" }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#1E40AF", marginBottom:8 }}>
          📧 Setup email — Resend
        </div>
        <div style={{ fontSize:12, color:"#1E40AF", lineHeight:1.7 }}>
          ManuMan usa <strong>Resend</strong> (gratuito fino a 3.000 email/mese).<br/>
          1. Crea account su <strong>resend.com</strong> · 2. Genera API Key<br/>
          3. <a href="https://supabase.com/dashboard/project/nnsylkjahuhttwajuxls/settings/functions" target="_blank" style={{color:"#1D4ED8"}}>Supabase → Settings → Edge Functions</a> → aggiungi segreto <code style={{background:"#DBEAFE",padding:"1px 5px",borderRadius:4}}>RESEND_API_KEY</code>
        </div>
      </div>

      {/* Impostazioni globali */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:10, padding:"16px 18px", display:"grid", gap:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14 }}>Abilita notifiche email</div>
            <div style={{ fontSize:12, color:"var(--text-3)", marginTop:2 }}>
              Attiva o disattiva globalmente tutte le email automatiche
            </div>
          </div>
          <SwitchToggle on={abilitato} onChange={setAbilitato} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, opacity:abilitato?.1:1 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:".05em", color:"var(--text-3)", marginBottom:5 }}>
              Email sito (admin / responsabile)
            </div>
            <input value={emailSito} onChange={e=>setEmailSito(e.target.value)}
              type="email" placeholder="admin@tua-azienda.it"
              style={{ width:"100%" }}
              disabled={!abilitato} />
            <div style={{ fontSize:10, color:"var(--text-3)", marginTop:3 }}>
              Usata come destinatario per le notifiche interne
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:".05em", color:"var(--text-3)", marginBottom:5 }}>
              Mittente personalizzato (opz.)
            </div>
            <input value={mittente} onChange={e=>setMittente(e.target.value)}
              type="email" placeholder="noreply@tua-azienda.it"
              style={{ width:"100%" }}
              disabled={!abilitato} />
            <div style={{ fontSize:10, color:"var(--text-3)", marginTop:3 }}>
              Lascia vuoto per usare il default. Richiede dominio verificato su Resend.
            </div>
          </div>
        </div>
      </div>

      {/* Una riga per tipo di notifica */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
          letterSpacing:".05em", color:"var(--text-3)", marginBottom:10 }}>
          Configura ogni notifica — clicca ⚙ Configura per destinatari, oggetto e testo custom
        </div>
        <div style={{ display:"grid", gap:8 }}>
          {Object.entries(notifiche).map(([tipo, nc]) => (
            <EditorNotifica key={tipo} tipo={tipo} cfg={nc} />
          ))}
        </div>
      </div>

      {/* Test email */}
      <TestEmail />

      {/* Salva */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, alignItems:"center" }}>
        {salvato && <span style={{ fontSize:13, color:"#059669" }}>✅ Salvato!</span>}
        <button className="btn-primary" onClick={salva}>Salva configurazione</button>
      </div>
    </div>
  );
}


export default function Azienda({ tenant, session, operatori=[], ruoloTenant, onTenantUpdate, gruppi=[], clienti=[], emailConfig={}, onEmailConfig }) {
  const [tab, setTab] = useState("info")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [errore, setErrore] = useState(null)
  const [membri, setMembri] = useState([])
  const [codiceInvito, setCodiceInvito] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Form anagrafica
  const [form, setForm] = useState({
    nome: tenant?.nome || "",
    piva: tenant?.piva || "",
    indirizzo: tenant?.indirizzo || "",
    citta: tenant?.citta || "",
    cap: tenant?.cap || "",
    tel: tenant?.tel || "",
    email: tenant?.email || "",
    sito: tenant?.sito || "",
    logo_url: tenant?.logo_url || "",
  })

  const s = k => v => setForm(p => ({ ...p, [k]: v }))
  const meOp = operatori.find(o => o.email === session?.user?.email)
  // isAdmin basato sul ruolo reale in tenant_users
  const isAdmin = ruoloTenant === "admin"

  useEffect(() => {
    caricaMembri()
    caricaInvito()
  }, [tenant?.id])

  const caricaMembri = async () => {
    if (!tenant?.id) return
    const { data } = await supabase
      .from("tenant_users").select("*, user_id")
      .eq("tenant_id", tenant.id)
    setMembri(data || [])
  }

  const caricaInvito = async () => {
    if (!tenant?.id) return
    const { data } = await supabase
      .from("tenant_inviti")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("usato", false)
      .maybeSingle()
    if (data) setCodiceInvito(data)
    else await creaInvito()
  }

  const creaInvito = async () => {
    const { data } = await supabase
      .from("tenant_inviti")
      .insert({ tenant_id: tenant.id, usato: false })
      .select().single()
    if (data) setCodiceInvito(data)
  }

  const rigeneraInvito = async () => {
    if (codiceInvito) await supabase.from("tenant_inviti").update({ usato: true }).eq("id", codiceInvito.id)
    await creaInvito()
    setMsg("Nuovo codice generato!")
    setTimeout(() => setMsg(null), 3000)
  }

  const salvaInfo = async () => {
    setLoading(true); setErrore(null)
    const { error } = await supabase.from("tenants")
      .update({
        nome: form.nome.trim(),
        piva: form.piva,
        indirizzo: form.indirizzo,
        citta: form.citta,
        cap: form.cap,
        tel: form.tel,
        email: form.email,
        sito: form.sito,
      })
      .eq("id", tenant.id)
    if (error) { setErrore(error.message); setLoading(false); return }
    onTenantUpdate({ ...tenant, ...form })
    setMsg("Salvato ✅"); setTimeout(() => setMsg(null), 3000)
    setLoading(false)
  }

  const uploadLogo = async (file) => {
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split(".").pop()
    const path = `${tenant.id}/logo.${ext}`
    const { error: upErr } = await supabase.storage.from("loghi").upload(path, file, { upsert: true })
    if (upErr) { setErrore("Errore upload: " + upErr.message); setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from("loghi").getPublicUrl(path)
    const { error } = await supabase.from("tenants").update({ logo_url: publicUrl }).eq("id", tenant.id)
    if (!error) {
      setForm(p => ({ ...p, logo_url: publicUrl }))
      onTenantUpdate({ ...tenant, logo_url: publicUrl })
      setMsg("Logo aggiornato ✅"); setTimeout(() => setMsg(null), 3000)
    }
    setUploadingLogo(false)
  }

  const rimuoviMembro = async (userId) => {
    if (userId === session.user.id) { setErrore("Non puoi rimuovere te stesso"); return }
    await supabase.from("tenant_users").delete().eq("tenant_id", tenant.id).eq("user_id", userId)
    caricaMembri()
  }

  const cambiaRuolo = async (userId, nuovoRuolo) => {
    // Non permettere di rimuovere l'ultimo admin
    if (nuovoRuolo === "membro") {
      const admins = membri.filter(m => m.ruolo === "admin")
      if (admins.length <= 1 && admins[0]?.user_id === userId) {
        setErrore("Non puoi rimuovere l'ultimo amministratore"); return
      }
    }
    await supabase.from("tenant_users").update({ ruolo: nuovoRuolo }).eq("tenant_id", tenant.id).eq("user_id", userId)
    caricaMembri()
  }

  const st = {
    wrap: { display:"grid", gap:20 },
    card: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", padding:"24px 28px" },
    head: { fontFamily:"var(--font-head)", fontWeight:700, fontSize:16, marginBottom:16 },
    grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
    lbl: { fontSize:11, fontWeight:700, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:".04em", display:"block", marginBottom:5 },
    inp: { width:"100%", padding:"10px 12px", border:"1px solid var(--border-dim)", borderRadius:"var(--radius-sm)", fontSize:14, background:"var(--surface)", color:"var(--text-1)", boxSizing:"border-box" },
    tabs: { display:"flex", gap:4, borderBottom:"1px solid var(--border)", marginBottom:20 },
    tab: (active) => ({ border:"none", borderBottom: active ? "2px solid var(--amber)" : "2px solid transparent", background:"none", padding:"10px 18px", fontWeight: active ? 700 : 400, color: active ? "var(--amber)" : "var(--text-2)", cursor:"pointer", fontSize:14 }),
  }

  return (
    <div style={st.wrap}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        {form.logo_url
          ? <img src={form.logo_url} alt="logo" style={{ width:56, height:56, borderRadius:12, objectFit:"contain", background:"var(--surface-2)", border:"1px solid var(--border)" }} />
          : <div style={{ width:56, height:56, borderRadius:12, background:"var(--navy-3)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🏢</div>
        }
        <div>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:22 }}>{tenant?.nome}</div>
          <div style={{ fontSize:13, color:"var(--text-3)", marginTop:2 }}>{membri.length} {membri.length === 1 ? "membro" : "membri"} · {isAdmin ? "👑 Amministratore" : "Membro"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={st.tabs}>
        {[["info","📋 Informazioni"], ["logo","🖼 Logo"], ["invito","🔗 Invito"], ["membri","👥 Membri"], ["ricambi","🔩 Ricambi"], ["sla","⏱ SLA"], ["menu","🎛 Menu"], ["email","📧 Email"]].map(([id, label]) =>
          <button key={id} style={st.tab(tab===id)} onClick={() => setTab(id)}>{label}</button>
        )}
      </div>

      {msg && <div style={{ background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:8, padding:"10px 14px", color:"#065F46", fontSize:13 }}>{msg}</div>}
      {errore && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", color:"#991B1B", fontSize:13 }}>{errore}</div>}

      {/* Tab Info */}
      {tab === "info" && (
        <div style={{display:"grid",gap:16}}>

        {/* Banner guida multi-tenant — mostrato solo una volta */}
        <BannerMTGuida isAdmin={isAdmin} />

        <div style={st.card}>
          <div style={st.head}>Anagrafica azienda</div>
          <div style={{ display:"grid", gap:14 }}>
            <div>
              <label style={st.lbl}>Nome azienda *</label>
              <input style={st.inp} value={form.nome} onChange={e => s("nome")(e.target.value)} />
            </div>
            <div style={st.grid2}>
              <div>
                <label style={st.lbl}>Partita IVA</label>
                <input style={st.inp} value={form.piva} onChange={e => s("piva")(e.target.value)} placeholder="IT12345678901" />
              </div>
              <div>
                <label style={st.lbl}>Email aziendale</label>
                <input style={st.inp} type="email" value={form.email} onChange={e => s("email")(e.target.value)} placeholder="info@azienda.it" />
              </div>
            </div>
            <div>
              <label style={st.lbl}>Indirizzo</label>
              <input style={st.inp} value={form.indirizzo} onChange={e => s("indirizzo")(e.target.value)} placeholder="Via Roma 1" />
            </div>
            <div style={st.grid2}>
              <div>
                <label style={st.lbl}>Città</label>
                <input style={st.inp} value={form.citta} onChange={e => s("citta")(e.target.value)} placeholder="Milano" />
              </div>
              <div>
                <label style={st.lbl}>CAP</label>
                <input style={st.inp} value={form.cap} onChange={e => s("cap")(e.target.value)} placeholder="20100" />
              </div>
            </div>
            <div style={st.grid2}>
              <div>
                <label style={st.lbl}>Telefono</label>
                <input style={st.inp} value={form.tel} onChange={e => s("tel")(e.target.value)} placeholder="+39 02 1234567" />
              </div>
              <div>
                <label style={st.lbl}>Sito web</label>
                <input style={st.inp} value={form.sito} onChange={e => s("sito")(e.target.value)} placeholder="www.azienda.it" />
              </div>
            </div>
            {isAdmin && (
              <button onClick={salvaInfo} disabled={loading} style={{ padding:"11px 24px", background:"var(--amber)", color:"#0D1B2A", border:"none", borderRadius:"var(--radius-sm)", fontWeight:700, fontSize:14, cursor:"pointer", justifySelf:"start" }}>
                {loading ? "Salvataggio…" : "Salva modifiche"}
              </button>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Tab Logo */}
      {tab === "logo" && (
        <div style={st.card}>
          <div style={st.head}>Logo aziendale</div>
          <p style={{ fontSize:13, color:"var(--text-2)", marginBottom:20 }}>Il logo viene mostrato nella barra superiore dell'app per tutti gli utenti della tua azienda.</p>
          {form.logo_url && (
            <div style={{ marginBottom:20, padding:16, background:"var(--surface-2)", borderRadius:"var(--radius-sm)", textAlign:"center" }}>
              <img src={form.logo_url} alt="logo" style={{ maxHeight:80, maxWidth:240, objectFit:"contain" }} />
              <div style={{ fontSize:11, color:"var(--text-3)", marginTop:8 }}>Logo attuale</div>
            </div>
          )}
          {isAdmin && (
            <label style={{ display:"block", border:"2px dashed var(--border-dim)", borderRadius:"var(--radius-sm)", padding:"24px 20px", textAlign:"center", cursor: uploadingLogo ? "not-allowed" : "pointer" }}>
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => uploadLogo(e.target.files[0])} disabled={uploadingLogo} />
              {uploadingLogo ? "⏳ Caricamento…" : <>
                <div style={{ fontSize:28, marginBottom:8 }}>🖼</div>
                <div style={{ fontSize:14, fontWeight:600 }}>Clicca per caricare un logo</div>
                <div style={{ fontSize:12, color:"var(--text-3)", marginTop:4 }}>PNG, JPG, SVG · max 2MB</div>
              </>}
            </label>
          )}
          <div style={{ marginTop:16, padding:"10px 14px", background:"var(--surface-2)", borderRadius:"var(--radius-sm)", fontSize:12, color:"var(--text-3)" }}>
            ℹ Per il logo usa un'immagine con sfondo trasparente (PNG o SVG) per un risultato migliore nella topbar.
          </div>
        </div>
      )}

      {/* Tab Invito */}
      {tab === "invito" && (
        <div style={st.card}>
          <div style={st.head}>Codice invito</div>
          <p style={{ fontSize:13, color:"var(--text-2)", marginBottom:20 }}>
            Condividi questo codice con i tuoi collaboratori. Dovranno inserirlo durante la registrazione per unirsi alla tua azienda.
          </p>
          {codiceInvito ? (
            <div style={{ textAlign:"center", padding:"28px 20px", background:"var(--surface-2)", borderRadius:"var(--radius-lg)", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Codice invito</div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:36, fontWeight:800, letterSpacing:8, color:"var(--amber)", marginBottom:16 }}>{codiceInvito.codice}</div>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                <button onClick={() => { navigator.clipboard.writeText(codiceInvito.codice); setMsg("Copiato!"); setTimeout(()=>setMsg(null),2000) }}
                  style={{ padding:"9px 20px", background:"var(--amber)", color:"#0D1B2A", border:"none", borderRadius:"var(--radius-sm)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  📋 Copia codice
                </button>
                {isAdmin && (
                  <button onClick={rigeneraInvito}
                    style={{ padding:"9px 20px", background:"var(--surface)", color:"var(--text-2)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:13, cursor:"pointer" }}>
                    🔄 Rigenera
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:24, color:"var(--text-3)" }}>Nessun invito disponibile</div>
          )}
        </div>
      )}

      {/* Tab Ricambi */}
      {tab === "ricambi" && (
        <div style={st.card}>
          <CatalogoRicambi tenantId={tenant?.id} />
        </div>
      )}

      {/* Tab SLA */}
      {tab === "sla" && (
        <div style={st.card}>
          <GestioneSLAProfili tenantId={tenant?.id} clienti={clienti} />
        </div>
      )}

      {/* Tab Menu */}
      {tab === "menu" && (
        <div style={st.card}>
          <ConfigurazioneMenu gruppi={gruppi} tenantId={tenant?.id} />
        </div>
      )}

      {/* Tab Membri */}
      {tab === "membri" && (
        <div style={st.card}>
          <div style={st.head}>Membri ({membri.length})</div>
          <div style={{ display:"grid", gap:8 }}>
            {membri.map(m => {
              const op = operatori.find(o => o.authUserId === m.user_id) || operatori.find(o => o.email === session?.user?.email && m.user_id === session?.user?.id)
              const isMe = m.user_id === session?.user?.id
              return (
                <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"var(--surface-2)", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"var(--navy-3)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:"var(--amber)", flexShrink:0 }}>
                    {op?.nome ? op.nome.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{op?.nome || "Utente"}{isMe ? " (tu)" : ""}</div>
                    <div style={{ fontSize:12, color:"var(--text-3)" }}>{op?.email || ""}</div>
                  </div>
                  {isAdmin && !isMe ? (
                    <select value={m.ruolo} onChange={e => cambiaRuolo(m.user_id, e.target.value)}
                      style={{ fontSize:12, padding:"4px 8px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-1)", marginRight:8 }}>
                      <option value="admin">Admin</option>
                      <option value="membro">Membro</option>
                    </select>
                  ) : (
                    <span style={{ fontSize:12, padding:"3px 10px", borderRadius:20, background: m.ruolo==="admin" ? "#FEF3C7" : "var(--surface-3)", color: m.ruolo==="admin" ? "#92400E" : "var(--text-2)", fontWeight:600, marginRight:8 }}>
                      {m.ruolo === "admin" ? "Admin" : "Membro"}
                    </span>
                  )}
                  {isAdmin && !isMe && (
                    <button onClick={() => rimuoviMembro(m.user_id)}
                      style={{ background:"#FEF2F2", border:"1px solid #FECACA", color:"#DC2626", borderRadius:6, padding:"4px 8px", fontSize:12, cursor:"pointer" }}>
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === "email" && (
        <TabEmail emailConfig={emailConfig} onSalva={onEmailConfig} tenant={tenant} operatori={operatori} clienti={clienti} />
      )}

    </div>
  )
}
