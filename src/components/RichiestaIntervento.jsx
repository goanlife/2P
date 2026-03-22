import React, { useState } from "react";
import { supabase } from "../supabase";

// ─── Portale richiesta intervento (visibile al cliente loggato) ───────────────
export function RichiestaIntervento({ meOperatore, siti=[], assets=[], tenantId, onCreata }) {
  const vuoto = { titolo:"", tipo:"straordinaria", priorita:"media", assetId:"", note:"", data:"" };
  const [f, sf]           = useState(vuoto);
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState("");

  const clienteIds = siti.filter(s => s.operatoreId === meOperatore?.id).map(s => s.clienteId);
  const myAssets   = assets.filter(a => clienteIds.includes(a.clienteId));

  const invia = async () => {
    if (!f.titolo.trim()) { setError("Inserisci un titolo per la richiesta."); return; }
    setSaving(true); setError("");
    const { data, error: err } = await supabase.from("manutenzioni").insert({
      titolo:      f.titolo.trim(),
      tipo:        f.tipo,
      stato:       "richiesta",          // nuovo stato
      priorita:    f.priorita,
      asset_id:    f.assetId ? Number(f.assetId) : null,
      cliente_id:  clienteIds[0] || null,
      note:        f.note || null,
      data:        f.data || new Date().toISOString().split("T")[0],
      user_id:     meOperatore?.authUserId || null,
      tenant_id:   tenantId,
    }).select().single();

    if (err) { setError("Errore invio: " + err.message); setSaving(false); return; }

    // Aggiungi commento automatico "Richiesta inviata"
    if (data?.id) {
      await supabase.from("attivita_commenti").insert({
        manutenzione_id: data.id,
        autore_nome:     meOperatore?.nome || "Cliente",
        autore_id:       meOperatore?.id || null,
        testo:           "Richiesta di intervento inviata dal portale cliente.",
        tipo:            "richiesta",
        tenant_id:       tenantId,
      });
    }
    setSaving(false);
    setDone(true);
    onCreata?.(data);
    setTimeout(() => { setDone(false); sf(vuoto); }, 3000);
  };

  const st = {
    inp: { width:"100%", padding:"8px 10px", border:"1px solid var(--border-dim)", borderRadius:6, fontSize:13, background:"var(--surface)", color:"var(--text-1)", boxSizing:"border-box" },
    lbl: { fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".04em" },
    row: { display:"grid", gap:12, marginBottom:14 },
  };

  if (done) return (
    <div style={{textAlign:"center",padding:"32px 20px"}}>
      <div style={{fontSize:40,marginBottom:12}}>✅</div>
      <div style={{fontWeight:700,fontSize:16}}>Richiesta inviata!</div>
      <div style={{fontSize:13,color:"var(--text-3)",marginTop:6}}>Il team riceverà la tua richiesta e ti contatterà presto.</div>
    </div>
  );

  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"20px 24px"}}>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>📋 Nuova richiesta di intervento</div>
      <div style={{fontSize:12,color:"var(--text-3)",marginBottom:18}}>Compila il form per richiedere un intervento al team di manutenzione.</div>

      <div style={st.row}>
        <div>
          <label style={st.lbl}>Descrizione richiesta *</label>
          <input value={f.titolo} onChange={e=>sf(p=>({...p,titolo:e.target.value}))}
            placeholder="Es. Sostituzione filtro aria compressore B12"
            style={{...st.inp, borderColor: error&&!f.titolo?"#EF4444":""}} />
        </div>
      </div>

      <div style={{...st.row, gridTemplateColumns:"1fr 1fr"}}>
        <div>
          <label style={st.lbl}>Tipo</label>
          <select value={f.tipo} onChange={e=>sf(p=>({...p,tipo:e.target.value}))} style={st.inp}>
            <option value="ordinaria">Ordinaria</option>
            <option value="straordinaria">Straordinaria</option>
          </select>
        </div>
        <div>
          <label style={st.lbl}>Urgenza</label>
          <select value={f.priorita} onChange={e=>sf(p=>({...p,priorita:e.target.value}))} style={st.inp}>
            <option value="bassa">🔵 Bassa — nessuna fretta</option>
            <option value="media">🟡 Media — entro la settimana</option>
            <option value="alta">🟠 Alta — entro 24 ore</option>
            <option value="urgente">🔴 Urgente — il prima possibile</option>
          </select>
        </div>
      </div>

      {myAssets.length > 0 && (
        <div style={{...st.row}}>
          <div>
            <label style={st.lbl}>Asset interessato</label>
            <select value={f.assetId} onChange={e=>sf(p=>({...p,assetId:e.target.value}))} style={st.inp}>
              <option value="">— Seleziona asset (opzionale) —</option>
              {myAssets.map(a=><option key={a.id} value={a.id}>{a.nome}{a.matricola?` [${a.matricola}]`:""}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{...st.row, gridTemplateColumns:"1fr 1fr"}}>
        <div>
          <label style={st.lbl}>Data preferita (opzionale)</label>
          <input type="date" value={f.data} min={new Date().toISOString().split("T")[0]}
            onChange={e=>sf(p=>({...p,data:e.target.value}))} style={st.inp} />
        </div>
      </div>

      <div style={st.row}>
        <div>
          <label style={st.lbl}>Note aggiuntive</label>
          <textarea rows={3} value={f.note} onChange={e=>sf(p=>({...p,note:e.target.value}))}
            placeholder="Descrivi il problema nel dettaglio, sintomi, quando è iniziato..."
            style={{...st.inp,resize:"vertical"}} />
        </div>
      </div>

      {error && <div style={{fontSize:12,color:"#DC2626",marginBottom:10,background:"#FEF2F2",padding:"8px 12px",borderRadius:6}}>⚠ {error}</div>}

      <button onClick={invia} disabled={saving||!f.titolo.trim()}
        style={{padding:"10px 24px",background:"var(--amber)",color:"#0D1B2A",border:"none",borderRadius:7,fontWeight:700,fontSize:14,cursor:"pointer",opacity:(!f.titolo.trim()?.5:1)}}>
        {saving ? "Invio in corso..." : "📤 Invia richiesta"}
      </button>
    </div>
  );
}
