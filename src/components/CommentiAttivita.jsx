import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

const fmtDataOra = d => d ? new Date(d).toLocaleString("it-IT", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "";

const TIPO_STYLE = {
  nota:         { bg:"var(--surface-2)", bd:"var(--border)",   icon:"💬", label:"Nota" },
  approvazione: { bg:"#ECFDF5",          bd:"#A7F3D0",          icon:"✅", label:"Approvata" },
  rifiuto:      { bg:"#FEF2F2",          bd:"#FECACA",          icon:"❌", label:"Rifiutata" },
  richiesta:    { bg:"#EFF6FF",          bd:"#BFDBFE",          icon:"📋", label:"Richiesta" },
};

export function CommentiAttivita({ manutenzioneId, meOperatore, onStatoChange, tenantId }) {
  const [commenti, setCommenti] = useState([]);
  const [testo, setTesto]       = useState("");
  const [tipo, setTipo]         = useState("nota");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (manutenzioneId) carica(); }, [manutenzioneId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [commenti]);

  const carica = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("attivita_commenti")
        .select("*")
        .eq("manutenzione_id", manutenzioneId)
        .order("created_at");
      setCommenti(data || []);
    } catch(e) {
      console.error("Errore caricamento commenti:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const invia = async () => {
    if (!testo.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("attivita_commenti").insert({
      manutenzione_id: manutenzioneId,
      autore_nome:     meOperatore?.nome || "Admin",
      autore_id:       meOperatore?.id || null,
      testo:           testo.trim(),
      tipo,
      ...(tenantId && { tenant_id: tenantId }),
    }).select().single();

    if (!error && data) {
      setCommenti(p => [...p, data]);
      setTesto("");
      // Se approvazione o rifiuto, notifica il parent
      if (tipo === "approvazione") onStatoChange?.("pianificata");
      if (tipo === "rifiuto")      onStatoChange?.("rifiutata");
    }
    setSaving(false);
  };

  const isAdmin = !meOperatore || meOperatore.tipo !== "fornitore";

  const st = {
    bubble: (t) => ({
      padding: "10px 14px",
      background: TIPO_STYLE[t]?.bg || "var(--surface-2)",
      border: `1px solid ${TIPO_STYLE[t]?.bd || "var(--border)"}`,
      borderRadius: 10, marginBottom: 8, maxWidth: "85%",
    }),
    inp: { width: "100%", padding: "8px 10px", border: "1px solid var(--border-dim)", borderRadius: 6, fontSize: 13, resize: "vertical", fontFamily: "var(--font-body)", background: "var(--surface)", color: "var(--text-1)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
        💬 Note e comunicazioni {commenti.length > 0 && `(${commenti.length})`}
      </div>

      {/* Lista commenti */}
      <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 12, paddingRight: 4 }}>
        {loading && <div style={{ fontSize: 12, color: "var(--text-3)" }}>Caricamento...</div>}
        {!loading && commenti.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
            Nessuna nota ancora — scrivi la prima!
          </div>
        )}
        {commenti.map(c => {
          const st2 = TIPO_STYLE[c.tipo] || TIPO_STYLE.nota;
          const isMe = c.autore_id === meOperatore?.id;
          return (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              <div style={st.bubble(c.tipo)}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span>{st2.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>{c.autore_nome}</span>
                  {c.tipo !== "nota" && <span style={{ fontSize: 10, background: st2.bd, padding: "1px 5px", borderRadius: 99, color: "var(--text-1)" }}>{st2.label}</span>}
                  <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>{fmtDataOra(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.testo}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input nuovo commento */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {["nota","approvazione","rifiuto"].map(t => (
              <button key={t} onClick={() => setTipo(t)}
                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, border: `1px solid ${tipo===t ? TIPO_STYLE[t].bd : "var(--border-dim)"}`,
                  background: tipo===t ? TIPO_STYLE[t].bg : "var(--surface)", cursor: "pointer", fontWeight: tipo===t ? 700 : 400 }}>
                {TIPO_STYLE[t].icon} {TIPO_STYLE[t].label}
              </button>
            ))}
          </div>
        )}
        <textarea rows={2} value={testo} onChange={e => setTesto(e.target.value)}
          placeholder={tipo === "approvazione" ? "Aggiungi nota di approvazione..." : tipo === "rifiuto" ? "Motivo del rifiuto..." : "Scrivi una nota interna..."}
          style={st.inp}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) invia(); }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>Ctrl+Enter per inviare</span>
          <button onClick={invia} disabled={saving || !testo.trim()}
            style={{ padding: "6px 16px", background: tipo==="approvazione"?"#059669":tipo==="rifiuto"?"#DC2626":"var(--amber)", color: tipo==="nota"?"#0D1B2A":"white", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !testo.trim() ? .5 : 1 }}>
            {saving ? "..." : "Invia"}
          </button>
        </div>
      </div>
    </div>
  );
}
