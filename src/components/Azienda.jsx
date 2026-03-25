import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { CatalogoRicambi } from "./GestioneRicambi"
import { ConfigSLA } from "./SLABadge"
import { richiediPermessoNotifiche } from "./Notifiche"
import { GestioneSLAProfili } from "./GestioneSLAProfili"
import { OrdiniAcquisto } from "./OrdiniAcquisto"
import { ConfigurazioneMenu } from "./ConfigurazioneMenu"



// ─── Banner guida multi-tenant ────────────────────────────────────────────
function BannerMTGuida({ isAdmin }) {
  const [vis, setVis] = useState(!localStorage.getItem("manuMan_mt_guide_ok"));
  if (!vis || !isAdmin) return null;

  return (
    <div style={{
      background:"#0D1B2A", borderRadius:12, padding:"20px 22px",
      color:"white", position:"relative",
    }}>
      <button onClick={()=>{ localStorage.setItem("manuMan_mt_guide_ok","1"); setVis(false); }}
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
function TabEmail({ emailConfig={}, onSalva }) {
  const [cfg, setCfg] = useState({
    abilitato:    emailConfig.abilitato    ?? false,
    odlAssegnato: emailConfig.odlAssegnato ?? true,
    completamento:emailConfig.completamento?? true,
    slaAlert:     emailConfig.slaAlert     ?? true,
    scadenzeNorm: emailConfig.scadenzeNorm ?? true,
    mittente:     emailConfig.mittente     || "",
  });
  const s = (k,v) => setCfg(p=>({...p,[k]:v}));
  const [salvato, setSalvato] = useState(false);

  const salva = () => {
    onSalva?.(cfg);
    setSalvato(true);
    setTimeout(()=>setSalvato(false), 2000);
  };

  const Toggle = ({label, sub, k}) => (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
      gap:12, padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{sub}</div>}
      </div>
      <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
        opacity: !cfg.abilitato && k!=="abilitato" ? 0.4 : 1 }}>
        <div style={{ position:"relative", width:40, height:22 }}>
          <input type="checkbox" checked={cfg[k]}
            disabled={!cfg.abilitato && k!=="abilitato"}
            onChange={e=>s(k,e.target.checked)}
            style={{ position:"absolute", opacity:0, width:"100%", height:"100%", cursor:"pointer", margin:0 }} />
          <div style={{ width:40, height:22, borderRadius:11,
            background: cfg[k] ? "#059669" : "var(--border)",
            transition:"background .2s", position:"relative" }}>
            <div style={{ position:"absolute", top:2,
              left: cfg[k] ? 20 : 2,
              width:18, height:18, borderRadius:"50%", background:"white",
              transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
          </div>
        </div>
      </label>
    </div>
  );

  return (
    <div style={{ display:"grid", gap:16 }}>

      {/* Setup banner */}
      <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE",
        borderRadius:10, padding:"16px 18px" }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#1E40AF", marginBottom:8 }}>
          📧 Come funziona l'invio email
        </div>
        <div style={{ fontSize:12, color:"#1E40AF", lineHeight:1.7 }}>
          ManuMan usa <strong>Resend</strong> (gratuito fino a 3.000 email/mese) come provider email.<br/>
          Per attivare l'invio devi:
        </div>
        <ol style={{ fontSize:12, color:"#1E40AF", lineHeight:2, marginLeft:18, marginTop:8 }}>
          <li>Crea un account gratuito su <strong>resend.com</strong></li>
          <li>Genera una API Key dal dashboard Resend</li>
          <li>Vai su <strong>Supabase → Edge Functions → notifica-email → Secrets</strong></li>
          <li>Aggiungi il segreto <code style={{background:"#DBEAFE",padding:"1px 5px",borderRadius:4}}>RESEND_API_KEY</code> con il valore della tua API Key</li>
          <li>Assicurati che le email di operatori e clienti siano compilate in ManuMan</li>
        </ol>
      </div>

      {/* Toggles */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:10, padding:"16px 18px" }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Notifiche automatiche</div>
        <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:12 }}>
          Le email vengono inviate solo se l'indirizzo email è configurato sull'operatore o sul cliente.
        </div>

        <Toggle k="abilitato"
          label="Abilita invio email"
          sub="Attiva o disattiva tutte le notifiche email" />
        <Toggle k="odlAssegnato"
          label="OdL confermato → email al tecnico"
          sub="Quando un OdL passa a 'Confermato', il tecnico assegnato riceve l'email con i dettagli" />
        <Toggle k="completamento"
          label="OdL completato → email al cliente"
          sub="Quando un OdL viene chiuso, il cliente riceve la conferma di avvenuto intervento" />
        <Toggle k="slaAlert"
          label="Avviso SLA in scadenza"
          sub="Email al responsabile quando un'attività urgente sta per superare l'SLA" />
        <Toggle k="scadenzeNorm"
          label="Scadenze normative in avvicinarsi"
          sub="Email di promemoria per adempimenti normativi in scadenza nei prossimi 30 giorni" />
      </div>

      {/* Mittente personalizzato */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:10, padding:"16px 18px" }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>Mittente personalizzato</div>
        <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:10 }}>
          Lascia vuoto per usare il mittente predefinito (noreply@manutenzioni.app).<br/>
          Per usare il tuo dominio devi verificarlo su Resend.
        </div>
        <input value={cfg.mittente} onChange={e=>s("mittente",e.target.value)}
          style={{ width:"100%" }} type="email"
          placeholder="manutenzioni@tua-azienda.it" />
      </div>

      {/* Salva */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
        {salvato && <span style={{ fontSize:13, color:"#059669", alignSelf:"center" }}>✅ Salvato!</span>}
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
        <TabEmail emailConfig={emailConfig} onSalva={onEmailConfig} />
      )}

    </div>
  )
}
