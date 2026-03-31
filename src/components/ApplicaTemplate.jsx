import React, { useState, useEffect } from "react";
import { PRI_COL } from '../constants';
import { supabase } from "../supabase";
import { Overlay, Field } from "./ui/Atoms";

const isoDate = d => d.toISOString().split("T")[0];
const fmtData  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const FREQ_L   = { settimanale:"Settimanale", mensile:"Mensile", bimestrale:"Bimestrale",
                   trimestrale:"Trimestrale", semestrale:"Semestrale", annuale:"Annuale" };
// ── Modal: applica template a un asset specifico ──────────────────────────
// Crea piano + assegnazione + genera attività in un solo click
export function ModalApplicaTemplate({
  asset, clienti=[], operatori=[], tenantId, uid,
  aggPiano, aggAssegnazione,
  onClose,
}) {
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [step, setStep]             = useState("scegli"); // scegli | configura | fatto
  const [templateScelto, setTemplateScelto] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [risultato, setRisultato]   = useState(null);

  // Configurazione assegnazione
  const oggi = isoDate(new Date());
  const [cfg, setCfg] = useState({
    operatoreId: "",
    dataInizio:  oggi,
    dataFine:    "",     // opzionale
  });
  const sc = (k,v) => setCfg(p => ({ ...p, [k]:v }));

  useEffect(() => {
    if (!tenantId || !asset?.tipo) { setLoading(false); return; }
    supabase.from("asset_tipo_template")
      .select("*, template_checklist_steps(id,testo,obbligatorio,ordine), template_ricambi(id,ricambio_id,nome_libero,quantita,ricambi(nome,codice,quantita_stock))")
      .eq("tenant_id", tenantId)
      .eq("tipo_asset", asset.tipo)
      .eq("attivo", true)
      .order("nome")
      .then(({ data }) => { setTemplates(data || []); setLoading(false); });
  }, [tenantId, asset?.tipo]);

  const applica = async () => {
    if (!templateScelto) return;
    setSaving(true);
    try {
      const steps = templateScelto.template_checklist_steps || [];

      // 1. Crea piano via App.jsx (che aggiorna anche lo state React)
      const pianoRow = await aggPiano({
        nome:        templateScelto.nome,
        descrizione: templateScelto.descrizione || "",
        tipo:        templateScelto.tipo_attivita,
        frequenza:   templateScelto.frequenza,
        durata:      templateScelto.durata,
        priorita:    templateScelto.priorita,
        attivo:      true,
        stima_costo: templateScelto.stima_costo || null,
        template_id: templateScelto.id,
      });
      if (!pianoRow?.id) throw new Error("Piano non creato");

      // 2. Copia checklist steps del template nel nuovo piano
      if (steps.length > 0) {
        await supabase.from("piano_checklist").insert(
          steps.sort((a,b) => a.ordine - b.ordine).map((s, idx) => ({
            piano_id:     pianoRow.id,
            testo:        s.testo,
            obbligatorio: s.obbligatorio,
            ordine:       i,
          }))
        );
      }

      // 3. Crea assegnazione piano → asset e genera attività (via App.jsx)
      // Passiamo pianoRow direttamente per evitare race condition con React 18 state batching
      const pianoMapped = {
        id: pianoRow.id, nome: pianoRow.nome,
        tipo: pianoRow.tipo, frequenza: pianoRow.frequenza,
        durata: pianoRow.durata, priorita: pianoRow.priorita,
        attivo: pianoRow.attivo, descrizione: pianoRow.descrizione||"",
      };
      await aggAssegnazione({
        pianoId:     pianoRow.id,
        assetId:     asset.id,
        clienteId:   asset.clienteId || null,
        operatoreId: cfg.operatoreId ? Number(cfg.operatoreId) : null,
        dataInizio:  cfg.dataInizio,
        dataFine:    cfg.dataFine || null,
        attivo:      true,
      }, pianoMapped); // <-- pianoOverride: evita race condition

      setRisultato({ pianoNome: pianoRow.nome, steps: steps.length });
      setStep("fatto");
    } catch(e) {
      console.error("[ApplicaTemplate] Errore:", e);
      console.warn("Errore: " + e.message);
    } finally { setSaving(false); }
  };

  const fornitori = operatori.filter(o => o.tipo === "fornitore");

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(580px,96vw)", maxHeight:"88vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)",
      }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:16 }}>
            🔧 Applica template a questo asset
          </div>
          <div style={{ fontSize:13, color:"var(--text-3)", marginTop:4 }}>
            <strong>{asset.nome}</strong>
            {asset.tipo && <span> · {asset.tipo}</span>}
            {asset.matricola && <span> · {asset.matricola}</span>}
          </div>
        </div>

        <div style={{ padding:"20px 24px" }}>

          {/* ── STEP 1: scegli template ── */}
          {step === "scegli" && (
            <>
              {loading && (
                <div style={{ textAlign:"center", padding:"32px", color:"var(--text-3)" }}>
                  Caricamento template...
                </div>
              )}

              {!loading && templates.length === 0 && (
                <div style={{ textAlign:"center", padding:"32px 20px" }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>
                    Nessun template per "{asset.tipo}"
                  </div>
                  <div style={{ fontSize:13, color:"var(--text-3)", lineHeight:1.6 }}>
                    Vai in <strong>🔧 Template</strong> e crea un template per il tipo
                    <strong> "{asset.tipo}"</strong>, poi torna qui.
                  </div>
                  <button onClick={onClose} className="btn-primary" style={{ marginTop:20 }}>
                    Chiudi
                  </button>
                </div>
              )}

              {!loading && templates.length > 0 && (
                <div style={{ display:"grid", gap:10 }}>
                  <div style={{ fontSize:13, color:"var(--text-2)", marginBottom:4 }}>
                    Scegli il template da applicare a questo asset:
                  </div>
                  {templates.map(t => (
                    <div key={t.id}
                      onClick={() => { setTemplateScelto(t); setStep("configura"); }}
                      style={{
                        border:`2px solid ${templateScelto?.id===t.id ? "var(--amber)" : "var(--border)"}`,
                        borderRadius:"var(--radius-lg)", padding:"14px 16px",
                        cursor:"pointer", background:"var(--surface)",
                        transition:"border-color .15s, background .15s",
                        borderLeft:`5px solid ${PRI_COL[t.priorita]||"#94A3B8"}`,
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="var(--surface)"}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14 }}>{t.nome}</div>
                          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:3 }}>
                            {FREQ_L[t.frequenza] || t.frequenza} · {t.durata} min · {t.priorita}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                          {(t.template_checklist_steps?.length > 0) && (
                            <span style={{ fontSize:10, background:"#ECFDF5", color:"#065F46",
                              padding:"2px 7px", borderRadius:99, fontWeight:700 }}>
                              ✅ {t.template_checklist_steps.length} passi
                            </span>
                          )}
                          {(t.template_ricambi?.length > 0) && (
                            <span style={{ fontSize:10, background:"#EFF6FF", color:"#1E40AF",
                              padding:"2px 7px", borderRadius:99, fontWeight:700 }}>
                              📦 {t.template_ricambi.length} ricambi
                            </span>
                          )}
                          {t.stima_costo && (
                            <span style={{ fontSize:10, background:"#FEF3C7", color:"#92400E",
                              padding:"2px 7px", borderRadius:99, fontWeight:700 }}>
                              ~€{Number(t.stima_costo).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                      {t.descrizione && (
                        <div style={{ fontSize:12, color:"var(--text-3)", marginTop:8, lineHeight:1.4,
                          fontStyle:"italic" }}>
                          {t.descrizione.slice(0,120)}{t.descrizione.length>120?"...":""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── STEP 2: configura assegnazione ── */}
          {step === "configura" && templateScelto && (
            <div style={{ display:"grid", gap:14 }}>
              {/* Riepilogo template scelto */}
              <div style={{ background:"var(--surface-2)", borderRadius:8, padding:"12px 14px",
                borderLeft:`4px solid ${PRI_COL[templateScelto.priorita]||"#94A3B8"}` }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{templateScelto.nome}</div>
                <div style={{ fontSize:12, color:"var(--text-3)", marginTop:2 }}>
                  {FREQ_L[templateScelto.frequenza]} · {templateScelto.durata} min · priorità {templateScelto.priorita}
                </div>
                <button onClick={() => setStep("scegli")}
                  style={{ fontSize:11, color:"var(--amber)", background:"none", border:"none",
                    cursor:"pointer", marginTop:4, padding:0 }}>
                  ← Cambia template
                </button>
              </div>

              {/* Configurazione */}
              <Field label="Assegna a operatore / fornitore (opzionale)">
                <select value={cfg.operatoreId} onChange={e=>sc("operatoreId",e.target.value)} style={{width:"100%"}}>
                  <option value="">— Non assegnato —</option>
                  {fornitori.map(o => <option key={o.id} value={o.id}>{o.nome}{o.spec?` · ${o.spec}`:""}</option>)}
                </select>
              </Field>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Data inizio piano *">
                  <input type="date" value={cfg.dataInizio} min={oggi}
                    onChange={e=>sc("dataInizio",e.target.value)} style={{width:"100%"}} />
                </Field>
                <Field label="Data fine (lascia vuoto = 12 mesi)">
                  <input type="date" value={cfg.dataFine} min={cfg.dataInizio}
                    onChange={e=>sc("dataFine",e.target.value)} style={{width:"100%"}} />
                </Field>
              </div>

              {/* Anteprima ricambi con stock */}
              {(templateScelto.template_ricambi?.length > 0) && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", marginBottom:8 }}>
                    📦 Ricambi previsti per ogni intervento
                  </div>
                  <div style={{ display:"grid", gap:6 }}>
                    {templateScelto.template_ricambi.map((r, idx) => {
                      const stock = r.ricambi?.quantita_stock ?? null;
                      const scarso = stock !== null && stock < r.quantita;
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                          background:"var(--surface-2)", borderRadius:6, padding:"8px 12px",
                          fontSize:12 }}>
                          <span>📦</span>
                          <span style={{ flex:1 }}>{r.ricambi?.nome || r.nome_libero}</span>
                          <span style={{ fontWeight:700 }}>×{r.quantita}</span>
                          {stock !== null && (
                            <span style={{
                              fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
                              background: scarso ? "#FEF2F2" : "#F0FDF4",
                              color: scarso ? "#DC2626" : "#166534",
                            }}>
                              stock: {stock} {scarso ? "⚠ scarso" : "✓"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Riepilogo checklist */}
              {(templateScelto.template_checklist_steps?.length > 0) && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", marginBottom:8 }}>
                    ✅ Checklist inclusa ({templateScelto.template_checklist_steps.length} passi)
                  </div>
                  <div style={{ display:"grid", gap:4 }}>
                    {templateScelto.template_checklist_steps
                      .sort((a,b)=>a.ordine-b.ordine)
                      .slice(0,4)
                      .map((s, idx) => (
                        <div key={i} style={{ fontSize:12, color:"var(--text-2)",
                          display:"flex", gap:6, alignItems:"flex-start" }}>
                          <span>{s.obbligatorio ? "🔴" : "⬜"}</span>
                          <span>{s.testo}</span>
                        </div>
                      ))
                    }
                    {templateScelto.template_checklist_steps.length > 4 && (
                      <div style={{ fontSize:11, color:"var(--text-3)" }}>
                        + altri {templateScelto.template_checklist_steps.length - 4} passi...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: fatto ── */}
          {step === "fatto" && risultato && (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Piano attivato!</div>
              <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>
                Il piano <strong>"{risultato.pianoNome}"</strong> è stato creato<br/>
                e le attività sono state generate automaticamente.<br/>
                {risultato.steps > 0 && <span>La checklist con {risultato.steps} passi è inclusa in ogni attività.</span>}
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:20 }}>
                <button onClick={onClose} className="btn-primary">Perfetto ✓</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "fatto" && (
          <div style={{ padding:"0 24px 20px", display:"flex", justifyContent:"space-between",
            alignItems:"center", borderTop:"1px solid var(--border)", paddingTop:16, gap:10 }}>
            <button onClick={onClose} className="btn-ghost">Annulla</button>
            {step === "configura" && (
              <button onClick={applica}
                disabled={saving || !cfg.dataInizio || !templateScelto}
                className="btn-primary">
                {saving ? "Generazione attività..." : `⚡ Attiva piano e genera attività`}
              </button>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}


// ── Pannello piani attivi sull'asset (mostra nella card asset) ────────────
export function PianiAsset({ asset, assegnazioni=[], piani=[], onApplica }) {
  const pianiAsset = assegnazioni
    .filter(a => a.assetId === asset.id && a.attivo)
    .map(a => ({ ...a, piano: piani.find(p => p.id === a.pianoId) }))
    .filter(a => a.piano);

  if (pianiAsset.length === 0) {
    return (
      <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid var(--border-dim)" }}>
        <button onClick={() => onApplica(asset)}
          style={{ width:"100%", padding:"8px", background:"var(--amber-glow)12",
            border:"1px dashed var(--amber)", borderRadius:6, color:"var(--amber-dim)",
            fontSize:12, fontWeight:700, cursor:"pointer" }}>
          + Applica template di manutenzione
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid var(--border-dim)" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", marginBottom:6,
        textTransform:"uppercase", letterSpacing:".04em" }}>
        Piani attivi
      </div>
      {pianiAsset.map(a => (
        <div key={a.id} style={{ display:"flex", alignItems:"center", gap:6,
          fontSize:12, color:"var(--text-2)", marginBottom:4 }}>
          <span style={{ width:8, height:8, borderRadius:"50%",
            background:"var(--green)", flexShrink:0 }} />
          <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {a.piano.nome}
          </span>
          <span style={{ fontSize:11, color:"var(--text-3)" }}>
            {a.piano.frequenza}
          </span>
        </div>
      ))}
      <button onClick={() => onApplica(asset)}
        style={{ marginTop:6, fontSize:11, color:"var(--amber)", background:"none",
          border:"none", cursor:"pointer", padding:0 }}>
        + Aggiungi altro piano
      </button>
    </div>
  );
}
