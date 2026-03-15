import { useState } from "react";
import { supabase } from "../supabase";

export function Onboarding({ session, onTenantReady }) {
  const [step, setStep] = useState("scelta"); // scelta | crea | unisci
  const [nome, setNome] = useState("");
  const [codice, setCodice] = useState("");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  const creaAzienda = async () => {
    if (!nome.trim()) { setErrore("Inserisci il nome dell'azienda"); return; }
    setLoading(true); setErrore("");
    try {
      // 1. Crea tenant
      const { data: tenant, error: e1 } = await supabase
        .from("tenants").insert({ nome: nome.trim() }).select().single();
      if (e1) throw e1;
      // 2. Associa utente
      const { error: e2 } = await supabase.from("tenant_users")
        .insert({ user_id: session.user.id, tenant_id: tenant.id, ruolo: "admin" });
      if (e2) throw e2;
      // 3. Genera codice invito
      await supabase.from("tenant_inviti").insert({ tenant_id: tenant.id });
      onTenantReady(tenant);
    } catch (e) {
      setErrore(e.message || "Errore durante la creazione");
    }
    setLoading(false);
  };

  const unisciAzienda = async () => {
    if (!codice.trim()) { setErrore("Inserisci il codice invito"); return; }
    setLoading(true); setErrore("");
    try {
      // 1. Cerca invito valido
      const { data: inv, error: e1 } = await supabase
        .from("tenant_inviti")
        .select("*, tenants(*)")
        .eq("codice", codice.trim().toUpperCase())
        .eq("usato", false)
        .single();
      if (e1 || !inv) { setErrore("Codice invito non valido o già usato"); setLoading(false); return; }
      // 2. Associa utente al tenant
      const { error: e2 } = await supabase.from("tenant_users")
        .insert({ user_id: session.user.id, tenant_id: inv.tenant_id, ruolo: "membro" });
      if (e2 && !e2.message.includes("duplicate")) throw e2;
      // 3. Marca invito come usato
      await supabase.from("tenant_inviti").update({ usato: true }).eq("id", inv.id);
      onTenantReady(inv.tenants);
    } catch (e) {
      setErrore(e.message || "Errore durante l'accesso");
    }
    setLoading(false);
  };

  const stile = {
    wrap: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"var(--bg, #0D1B2A)", fontFamily:"DM Sans, sans-serif" },
    card: { background:"var(--surface-1, #1a2a3a)", borderRadius:16, padding:40,
      width:"100%", maxWidth:440, boxShadow:"0 8px 32px #0006" },
    logo: { fontFamily:"Syne, sans-serif", fontSize:28, fontWeight:800,
      color:"var(--accent, #F59E0B)", marginBottom:8, letterSpacing:-1 },
    sub: { color:"var(--text-2, #8899aa)", fontSize:14, marginBottom:32 },
    btn: { width:"100%", padding:"13px 0", borderRadius:10, border:"none",
      fontSize:15, fontWeight:600, cursor:"pointer", marginBottom:12, transition:"opacity .2s" },
    btnPrimary: { background:"var(--accent, #F59E0B)", color:"#0D1B2A" },
    btnSecondary: { background:"var(--surface-2, #253545)", color:"var(--text-1, #e8eaf0)" },
    input: { width:"100%", padding:"12px 14px", borderRadius:10,
      background:"var(--surface-2, #253545)", border:"1px solid var(--border, #334)",
      color:"var(--text-1, #e8eaf0)", fontSize:15, marginBottom:16, boxSizing:"border-box" },
    label: { display:"block", fontSize:13, color:"var(--text-2, #8899aa)", marginBottom:6 },
    err: { background:"#c0392b22", border:"1px solid #c0392b", borderRadius:8,
      padding:"10px 14px", color:"#e74c3c", fontSize:13, marginBottom:16 },
    back: { background:"none", border:"none", color:"var(--text-2, #8899aa)",
      cursor:"pointer", fontSize:13, marginBottom:20, padding:0 },
  };

  return (
    <div style={stile.wrap}>
      <div style={stile.card}>
        <div style={stile.logo}>⚙ ManuMan</div>
        <div style={stile.sub}>Gestione manutenzioni</div>

        {step === "scelta" && (
          <>
            <p style={{ color:"var(--text-1,#e8eaf0)", fontSize:16, marginBottom:24, lineHeight:1.5 }}>
              Benvenuto! Per iniziare, crea la tua azienda o entra in una esistente.
            </p>
            <button style={{...stile.btn, ...stile.btnPrimary}}
              onClick={() => setStep("crea")}>
              ➕ Crea la mia azienda
            </button>
            <button style={{...stile.btn, ...stile.btnSecondary}}
              onClick={() => setStep("unisci")}>
              🔗 Entra con codice invito
            </button>
            <button style={{...stile.back, marginTop:8}} onClick={() => supabase.auth.signOut()}>
              ← Esci
            </button>
          </>
        )}

        {step === "crea" && (
          <>
            <button style={stile.back} onClick={() => { setStep("scelta"); setErrore(""); }}>← Indietro</button>
            <p style={{ color:"var(--text-1,#e8eaf0)", fontSize:16, marginBottom:24 }}>
              Come si chiama la tua azienda?
            </p>
            {errore && <div style={stile.err}>{errore}</div>}
            <label style={stile.label}>Nome azienda</label>
            <input style={stile.input} placeholder="es. Mario Impianti Srl"
              value={nome} onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === "Enter" && creaAzienda()} autoFocus />
            <button style={{...stile.btn, ...stile.btnPrimary, opacity: loading ? .6 : 1}}
              onClick={creaAzienda} disabled={loading}>
              {loading ? "Creazione..." : "Crea azienda →"}
            </button>
          </>
        )}

        {step === "unisci" && (
          <>
            <button style={stile.back} onClick={() => { setStep("scelta"); setErrore(""); }}>← Indietro</button>
            <p style={{ color:"var(--text-1,#e8eaf0)", fontSize:16, marginBottom:24 }}>
              Inserisci il codice invito che ti ha fornito il tuo amministratore.
            </p>
            {errore && <div style={stile.err}>{errore}</div>}
            <label style={stile.label}>Codice invito</label>
            <input style={{...stile.input, textTransform:"uppercase", letterSpacing:3, textAlign:"center", fontSize:18}}
              placeholder="ES. A1B2C3D4"
              value={codice} onChange={e => setCodice(e.target.value)}
              onKeyDown={e => e.key === "Enter" && unisciAzienda()} autoFocus />
            <button style={{...stile.btn, ...stile.btnPrimary, opacity: loading ? .6 : 1}}
              onClick={unisciAzienda} disabled={loading}>
              {loading ? "Verifica..." : "Entra nell'azienda →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
