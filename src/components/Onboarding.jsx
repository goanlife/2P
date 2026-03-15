import { useState } from "react";
import { supabase } from "../supabase";

export function Onboarding({ session, onTenantReady }) {
  const [step, setStep] = useState("scelta");
  const [nome, setNome] = useState("");
  const [codice, setCodice] = useState("");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  const creaAzienda = async () => {
    if (!nome.trim()) { setErrore("Inserisci il nome dell'azienda"); return; }
    setLoading(true); setErrore("");
    try {
      const { data: tenant, error: e1 } = await supabase
        .from("tenants").insert({ nome: nome.trim() }).select().single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("tenant_users")
        .insert({ user_id: session.user.id, tenant_id: tenant.id, ruolo: "admin" });
      if (e2) throw e2;
      await supabase.from("tenant_inviti").insert({ tenant_id: tenant.id });
      onTenantReady(tenant);
    } catch (e) { setErrore(e.message || "Errore durante la creazione"); }
    setLoading(false);
  };

  const unisciAzienda = async () => {
    if (!codice.trim()) { setErrore("Inserisci il codice invito"); return; }
    setLoading(true); setErrore("");
    try {
      const { data: inv, error: e1 } = await supabase
        .from("tenant_inviti").select("*, tenants(*)")
        .eq("codice", codice.trim().toUpperCase()).eq("usato", false).single();
      if (e1 || !inv) { setErrore("Codice non valido o già usato"); setLoading(false); return; }
      const { error: e2 } = await supabase.from("tenant_users")
        .insert({ user_id: session.user.id, tenant_id: inv.tenant_id, ruolo: "membro" });
      if (e2 && !e2.message.includes("duplicate")) throw e2;
      await supabase.from("tenant_inviti").update({ usato: true }).eq("id", inv.id);
      onTenantReady(inv.tenants);
    } catch (e) { setErrore(e.message || "Errore durante l'accesso"); }
    setLoading(false);
  };

  const s = {
    wrap:  { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0D1B2A", fontFamily:"DM Sans,sans-serif" },
    card:  { background:"#1a2a3a", borderRadius:16, padding:40, width:"100%", maxWidth:440, boxShadow:"0 8px 32px #0006" },
    logo:  { fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:800, color:"#F59E0B", marginBottom:8 },
    sub:   { color:"#8899aa", fontSize:14, marginBottom:32 },
    btn:   { width:"100%", padding:"13px 0", borderRadius:10, border:"none", fontSize:15, fontWeight:600, cursor:"pointer", marginBottom:12 },
    inp:   { width:"100%", padding:"12px 14px", borderRadius:10, background:"#253545", border:"1px solid #334", color:"#e8eaf0", fontSize:15, marginBottom:16, boxSizing:"border-box" },
    lbl:   { display:"block", fontSize:13, color:"#8899aa", marginBottom:6 },
    err:   { background:"#c0392b22", border:"1px solid #c0392b", borderRadius:8, padding:"10px 14px", color:"#e74c3c", fontSize:13, marginBottom:16 },
    back:  { background:"none", border:"none", color:"#8899aa", cursor:"pointer", fontSize:13, marginBottom:20, padding:0 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>⚙ ManuMan</div>
        <div style={s.sub}>Gestione manutenzioni</div>

        {step === "scelta" && <>
          <p style={{ color:"#e8eaf0", fontSize:16, marginBottom:24, lineHeight:1.5 }}>
            Benvenuto! Crea la tua azienda o entra in una esistente.
          </p>
          <button style={{...s.btn, background:"#F59E0B", color:"#0D1B2A"}} onClick={()=>setStep("crea")}>
            ➕ Crea la mia azienda
          </button>
          <button style={{...s.btn, background:"#253545", color:"#e8eaf0"}} onClick={()=>setStep("unisci")}>
            🔗 Entra con codice invito
          </button>
          <button style={s.back} onClick={()=>supabase.auth.signOut()}>← Esci</button>
        </>}

        {step === "crea" && <>
          <button style={s.back} onClick={()=>{setStep("scelta");setErrore("");}}>← Indietro</button>
          <p style={{ color:"#e8eaf0", fontSize:16, marginBottom:24 }}>Come si chiama la tua azienda?</p>
          {errore && <div style={s.err}>{errore}</div>}
          <label style={s.lbl}>Nome azienda</label>
          <input style={s.inp} placeholder="es. Mario Impianti Srl" value={nome}
            onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&creaAzienda()} autoFocus />
          <button style={{...s.btn, background:"#F59E0B", color:"#0D1B2A", opacity:loading?.6:1}}
            onClick={creaAzienda} disabled={loading}>
            {loading ? "Creazione..." : "Crea azienda →"}
          </button>
        </>}

        {step === "unisci" && <>
          <button style={s.back} onClick={()=>{setStep("scelta");setErrore("");}}>← Indietro</button>
          <p style={{ color:"#e8eaf0", fontSize:16, marginBottom:24 }}>Inserisci il codice invito.</p>
          {errore && <div style={s.err}>{errore}</div>}
          <label style={s.lbl}>Codice invito</label>
          <input style={{...s.inp, textTransform:"uppercase", letterSpacing:3, textAlign:"center", fontSize:18}}
            placeholder="XXXXXXXX" value={codice}
            onChange={e=>setCodice(e.target.value)} onKeyDown={e=>e.key==="Enter"&&unisciAzienda()} autoFocus />
          <button style={{...s.btn, background:"#F59E0B", color:"#0D1B2A", opacity:loading?.6:1}}
            onClick={unisciAzienda} disabled={loading}>
            {loading ? "Verifica..." : "Entra →"}
          </button>
        </>}
      </div>
    </div>
  );
}
