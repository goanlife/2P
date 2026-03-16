import { useState, useEffect } from "react"
import { supabase } from "../supabase"

export default function Azienda({ tenant, session, operatori, ruoloTenant, onTenantUpdate }) {
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
        {[["info","📋 Informazioni"], ["logo","🖼 Logo"], ["invito","🔗 Invito"], ["membri","👥 Membri"]].map(([id, label]) =>
          <button key={id} style={st.tab(tab===id)} onClick={() => setTab(id)}>{label}</button>
        )}
      </div>

      {msg && <div style={{ background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:8, padding:"10px 14px", color:"#065F46", fontSize:13 }}>{msg}</div>}
      {errore && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", color:"#991B1B", fontSize:13 }}>{errore}</div>}

      {/* Tab Info */}
      {tab === "info" && (
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
    </div>
  )
}
