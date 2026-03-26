import React, { useState } from "react";
import { supabase } from "../supabase";

const SOTTOTIPI = [
  { v:"correttiva", l:"🔧 Correttiva",  desc:"Guasto in corso o appena risolto" },
  { v:"urgente",    l:"⚡ Urgente",      desc:"Rischio blocco imminente" },
  { v:"miglioria",  l:"⬆ Miglioria",    desc:"Miglioramento non urgente" },
  { v:"normativa",  l:"⚖ Normativa",    desc:"Adempimento normativo non pianificato" },
];

const CAUSE = [
  "Usura componente","Guasto elettrico","Guasto meccanico","Corrosione/ossidazione",
  "Errore operatore","Mancata manutenzione preventiva","Causa esterna",
  "Difetto di fabbricazione","Cause sconosciute","Altro",
];

export function RichiestaIntervento({ meOperatore, siti=[], assets=[], tenantId, onCreata, onRichiestaCreata }) {
  const vuoto = {
    titolo:"", sottotipo:"correttiva", priorita:"media",
    assetId:"", note:"", data:"",
    causaGuasto:"", fermoImpianto:false, downtimeOre:"",
  };
  const [f, sf]   = useState(vuoto);
  const [step,    setStep]   = useState(1); // 1=tipo, 2=dettagli, 3=conferma
  const [saving,  setSaving] = useState(false);
  const [done,    setDone]   = useState(false);
  const [error,   setError]  = useState("");

  const clienteIds = siti.filter(s=>s.operatoreId===meOperatore?.id).map(s=>s.clienteId);
  const myAssets   = assets.filter(a=>clienteIds.includes(a.clienteId));
  const s          = (k,v) => sf(p=>({...p,[k]:v}));
  const st = {
    inp: { width:"100%", padding:"9px 11px", border:"1px solid var(--border-dim)",
      borderRadius:7, fontSize:13, background:"var(--surface)", color:"var(--text-1)", boxSizing:"border-box" },
    lbl: { fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block",
      marginBottom:5, textTransform:"uppercase", letterSpacing:".04em" },
  };

  const invia = async () => {
    if (!f.titolo.trim()) { setError("Inserisci una descrizione."); return; }
    setSaving(true); setError("");
    try {
      const { data, error: err } = await supabase.from("manutenzioni").insert({
        titolo:          f.titolo.trim(),
        tipo:            "straordinaria",
        sottotipo:       f.sottotipo,
        stato:           "richiesta",
        priorita:        f.priorita,
        asset_id:        f.assetId ? Number(f.assetId) : null,
        cliente_id:      clienteIds[0] || null,
        note:            f.note || null,
        data:            f.data || new Date().toISOString().split("T")[0],
        causa_guasto:    f.causaGuasto || null,
        fermo_impianto:  f.fermoImpianto,
        downtime_ore:    f.downtimeOre ? Number(f.downtimeOre) : null,
        user_id:         meOperatore?.authUserId || null,
        tenant_id:       tenantId,
        durata:          60,
      }).select().single();
      if (err) throw err;
      if (data?.id) {
        await supabase.from("attivita_commenti").insert({
          manutenzione_id: data.id,
          autore_nome:     meOperatore?.nome || "Cliente",
          autore_id:       meOperatore?.id || null,
          testo:           `Richiesta di intervento inviata: ${SOTTOTIPI.find(s=>s.v===f.sottotipo)?.l}`,
          tipo:            "richiesta",
          tenant_id:       tenantId,
        });
      }
      setDone(true);
      onCreata?.(data);
      onRichiestaCreata?.(data); // per trigger email admin
      setTimeout(()=>{ setDone(false); sf(vuoto); setStep(1); }, 3500);
    } catch(e) {
      setError("Errore: "+e.message);
    } finally { setSaving(false); }
  };

  if (done) return (
    <div style={{ textAlign:"center", padding:"40px 20px" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
      <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>Richiesta inviata!</div>
      <div style={{ fontSize:13, color:"var(--text-3)" }}>
        Il team di manutenzione la valuterà e ti risponderà al più presto.
      </div>
    </div>
  );

  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
      borderRadius:12, padding:"20px 24px", maxWidth:580 }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>
          🔧 Nuova richiesta di intervento
        </div>
        <div style={{ fontSize:12, color:"var(--text-3)" }}>
          Passo {step} di 2 — {step===1?"Tipo intervento":"Dettagli e descrizione"}
        </div>
        {/* Progress bar */}
        <div style={{ height:3, background:"var(--border)", borderRadius:99,
          overflow:"hidden", marginTop:8 }}>
          <div style={{ height:"100%", width:`${step*50}%`,
            background:"var(--amber)", borderRadius:99, transition:"width .3s" }}/>
        </div>
      </div>

      {/* Step 1: Scegli tipo */}
      {step===1 && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase",
            letterSpacing:".05em", color:"var(--text-3)", marginBottom:12 }}>
            Che tipo di intervento devi segnalare?
          </div>
          <div style={{ display:"grid", gap:10 }}>
            {SOTTOTIPI.map(tipo=>(
              <div key={tipo.v} onClick={()=>s("sottotipo",tipo.v)}
                style={{
                  padding:"14px 16px", borderRadius:10, cursor:"pointer",
                  border:`2px solid ${f.sottotipo===tipo.v?"#F59E0B":"var(--border)"}`,
                  background:f.sottotipo===tipo.v?"#FFFBEB":"var(--surface-2)",
                  display:"flex", alignItems:"center", gap:14,
                }}>
                <div style={{ fontSize:24 }}>{tipo.l.split(" ")[0]}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{tipo.l.slice(2)}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{tipo.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16 }}>
            <button onClick={()=>setStep(2)} className="btn-primary">
              Continua →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Dettagli */}
      {step===2 && (
        <div style={{ display:"grid", gap:14 }}>
          <div>
            <label style={st.lbl}>Descrizione del problema *</label>
            <textarea rows={3} value={f.titolo}
              onChange={e=>s("titolo",e.target.value)}
              placeholder={
                f.sottotipo==="correttiva" ? "Descrivi il guasto: cosa non funziona, sintomi, quando è iniziato..." :
                f.sottotipo==="urgente"    ? "Descrivi il rischio imminente e cosa sta accadendo..." :
                f.sottotipo==="miglioria"  ? "Descrivi cosa vuoi migliorare e il beneficio atteso..." :
                "Descrivi l'adempimento normativo richiesto..."
              }
              style={{...st.inp, resize:"vertical"}}
              autoFocus />
          </div>

          {/* Campi specifici correttiva/urgente */}
          {(f.sottotipo==="correttiva"||f.sottotipo==="urgente") && (
            <>
              <div>
                <label style={st.lbl}>Causa del guasto</label>
                <select value={f.causaGuasto} onChange={e=>s("causaGuasto",e.target.value)} style={st.inp}>
                  <option value="">— Sconosciuta / da determinare —</option>
                  {CAUSE.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={st.lbl}>Impianto fermo?</label>
                  <div style={{ display:"flex", gap:10, marginTop:4 }}>
                    {[["Sì, è fermo",true],["No, funziona",false]].map(([l,v])=>(
                      <label key={String(v)} style={{ display:"flex", alignItems:"center",
                        gap:6, cursor:"pointer", fontSize:13 }}>
                        <input type="radio" checked={f.fermoImpianto===v}
                          onChange={()=>s("fermoImpianto",v)} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                {f.fermoImpianto && (
                  <div>
                    <label style={st.lbl}>Ore di fermo (se noto)</label>
                    <input type="number" min={0} step={0.5} value={f.downtimeOre}
                      onChange={e=>s("downtimeOre",e.target.value)}
                      style={st.inp} placeholder="es. 2.5" />
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={st.lbl}>Urgenza</label>
              <select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={st.inp}>
                <option value="bassa">🔵 Bassa — quando possibile</option>
                <option value="media">🟡 Media — entro la settimana</option>
                <option value="alta">🟠 Alta — entro 24 ore</option>
                <option value="urgente">🔴 Urgente — subito</option>
              </select>
            </div>
            <div>
              <label style={st.lbl}>Data richiesta (opz.)</label>
              <input type="date" value={f.data}
                min={new Date().toISOString().split("T")[0]}
                onChange={e=>s("data",e.target.value)} style={st.inp} />
            </div>
          </div>

          {myAssets.length>0 && (
            <div>
              <label style={st.lbl}>Asset / impianto coinvolto</label>
              <select value={f.assetId} onChange={e=>s("assetId",e.target.value)} style={st.inp}>
                <option value="">— Nessuno / non so —</option>
                {myAssets.map(a=><option key={a.id} value={a.id}>
                  {a.nome}{a.matricola?` [${a.matricola}]`:""}{a.ubicazione?` · ${a.ubicazione}`:""}
                </option>)}
              </select>
            </div>
          )}

          <div>
            <label style={st.lbl}>Note aggiuntive</label>
            <textarea rows={2} value={f.note} onChange={e=>s("note",e.target.value)}
              placeholder="Foto, documenti allegati, contesto utile al tecnico..."
              style={{...st.inp, resize:"vertical"}} />
          </div>

          {error && (
            <div style={{ fontSize:12, color:"#DC2626", background:"#FEF2F2",
              padding:"8px 12px", borderRadius:6 }}>⚠ {error}</div>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
            <button onClick={()=>setStep(1)} className="btn-ghost">← Indietro</button>
            <button onClick={invia} disabled={saving||!f.titolo.trim()}
              style={{ padding:"10px 24px", background:"var(--amber)", color:"#0D1B2A",
                border:"none", borderRadius:7, fontWeight:700, fontSize:14,
                cursor:saving||!f.titolo.trim()?"not-allowed":"pointer",
                opacity:!f.titolo.trim()?.7:1 }}>
              {saving ? "⏳ Invio..." : "📤 Invia richiesta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
