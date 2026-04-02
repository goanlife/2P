import React, { useState, useEffect, useMemo } from "react";
import { PRI_COL } from '../constants';
import { supabase } from "../supabase";
import { Field, Modal, Overlay } from "./ui/Atoms";

// ── Tipi asset standard (stessi del ModalAsset) ──────────────────────────
const TIPI_ASSET = [
  "Impianto elettrico","Linea produzione","Impianto termico",
  "Impianto pneumatico","Impianto idraulico","Sicurezza","Meccanico","Altro"
];
const PRI = [{v:"bassa",l:"Bassa"},{v:"media",l:"Media"},{v:"alta",l:"Alta"},{v:"urgente",l:"Urgente"}];
const fmtEuro = v => v ? `€${Number(v).toFixed(0)}` : null;

// ── Modal Template ────────────────────────────────────────────────────────
function ModalTemplate({ ini, tenantId, ricambiCatalogo=[], onClose, onSalva }) {
  const vuoto = { tipo_asset:"", nome:"", descrizione:"", tipo_attivita:"ordinaria",
    frequenza:"mensile", durata:60, priorita:"media", stima_costo:"", attivo:true };
  const [f, sf] = useState(ini || vuoto);
  const [steps, setSteps]   = useState([]);
  const [ricambi, setRicambi] = useState([]);
  const [nuovoStep, setNuovoStep] = useState("");
  const [nuovoRc, setNuovoRc]   = useState({ ricambioId:"", nomeLibero:"", quantita:1 });
  const [tab, setTab]   = useState("info");
  const [saving, setSaving] = useState(false);
  const s = (k,v) => sf(p => ({ ...p, [k]:v }));

  // Carica checklist e ricambi se modifica
  useEffect(() => {
    if (!ini?.id) return;
    Promise.all([
      supabase.from("template_checklist_steps").select("*").eq("template_id", ini.id).order("ordine"),
      supabase.from("template_ricambi").select("*, ricambi(nome,codice)").eq("template_id", ini.id),
    ]).then(([{data:cs},{data:rc}]) => {
      setSteps(cs || []);
      setRicambi(rc || []);
    }).catch(e => console.warn("DB:", e.message));
  }, [ini?.id]);

  const aggiungiStep = () => {
    if (!nuovoStep.trim()) return;
    setSteps(p => [...p, { testo:nuovoStep.trim(), obbligatorio:false, ordine:p.length, _new:true }]);
    setNuovoStep("");
  };

  const aggiungiRicambio = () => {
    const rc = ricambiCatalogo.find(r => String(r.id) === nuovoRc.ricambioId);
    setRicambi(p => [...p, {
      ricambio_id: rc ? rc.id : null,
      nome_libero: rc ? null : (nuovoRc.nomeLibero || "Ricambio"),
      quantita: Number(nuovoRc.quantita) || 1,
      ricambi: rc ? { nome: rc.nome, codice: rc.codice } : null,
      _new: true,
    }]);
    setNuovoRc({ ricambioId:"", nomeLibero:"", quantita:1 });
  };

  const salva = async () => {
    if (!f.nome.trim() || !f.tipo_asset) return;
    setSaving(true);
    try {
      const payload = {
        nome: f.nome.trim(), tipo_asset: f.tipo_asset,
        descrizione: f.descrizione || null,
        tipo_attivita: f.tipo_attivita, frequenza: f.frequenza,
        durata: Number(f.durata) || 60, priorita: f.priorita,
        stima_costo: f.stima_costo ? Number(f.stima_costo) : null,
        attivo: f.attivo !== false, tenant_id: tenantId,
      };

      let templateId = ini?.id;
      if (templateId) {
        await supabase.from("asset_tipo_template").update(payload).eq("id", templateId);
      } else {
        const { data } = await supabase.from("asset_tipo_template").insert(payload).select().single();
        templateId = data.id;
      }

      // Salva checklist steps
      const stepsNew = steps.filter(s => s._new);
      if (stepsNew.length) {
        await supabase.from("template_checklist_steps").insert(
          stepsNew.map((s, idx) => ({ template_id: templateId, testo: s.testo, obbligatorio: s.obbligatorio, ordine: i }))
        );
      }

      // Salva ricambi nuovi
      const rcNew = ricambi.filter(r => r._new);
      if (rcNew.length) {
        await supabase.from("template_ricambi").insert(
          rcNew.map(r => ({ template_id: templateId, ricambio_id: r.ricambio_id, nome_libero: r.nome_libero, quantita: r.quantita }))
        );
      }

      onSalva({ ...f, id: templateId, steps, ricambi });
    } finally { setSaving(false); }
  };

  const tabStyle = (t) => ({
    padding:"8px 16px", border:"none", background:"none", cursor:"pointer",
    fontWeight: tab===t ? 700 : 400, fontSize:13,
    color: tab===t ? "var(--navy)" : "var(--text-3)",
    borderBottom: tab===t ? "2px solid var(--amber)" : "2px solid transparent",
  });

  return (
    <Overlay onClose={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)", width:"min(640px,96vw)",
        maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ padding:"20px 24px 0", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:17, marginBottom:12 }}>
            {ini ? "Modifica template" : "Nuovo template attività"}
          </div>
          <div style={{ display:"flex", gap:0 }}>
            {["info","checklist","ricambi"].map(t => (
              <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                {t==="info" ? "📋 Informazioni" : t==="checklist" ? `✅ Checklist (${steps.length})` : `📦 Ricambi previsti (${ricambi.length})`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {tab === "info" && (
            <div style={{ display:"grid", gap:12 }}>
              <Field label="Tipo asset *">
                <select value={f.tipo_asset} onChange={e=>s("tipo_asset",e.target.value)} style={{width:"100%"}}>
                  <option value="">— Seleziona tipo —</option>
                  {TIPI_ASSET.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Nome attività *">
                <input value={f.nome} onChange={e=>s("nome",e.target.value)} style={{width:"100%"}}
                  placeholder={`Es. Revisione mensile ${f.tipo_asset || "asset"}`} />
              </Field>
              <Field label="Descrizione (istruzioni generali)">
                <textarea value={f.descrizione||""} onChange={e=>s("descrizione",e.target.value)}
                  rows={2} style={{width:"100%",resize:"vertical"}} placeholder="Procedure, attenzioni, riferimenti normativi..." />
              </Field>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:12 }}>
                <Field label="Tipo">
                  <select value={f.tipo_attivita} onChange={e=>s("tipo_attivita",e.target.value)} style={{width:"100%"}}>
                    <option value="ordinaria">Ordinaria</option>
                    <option value="straordinaria">Straordinaria</option>
                  </select>
                </Field>
                <Field label="Priorità">
                  <select value={f.priorita} onChange={e=>s("priorita",e.target.value)} style={{width:"100%"}}>
                    {PRI.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </Field>
                <Field label="Frequenza suggerita">
                  <select value={f.frequenza} onChange={e=>s("frequenza",e.target.value)} style={{width:"100%"}}>
                    {FREQUENZE.map(fr=><option key={fr.v} value={fr.v}>{fr.l}</option>)}
                  </select>
                </Field>
                <Field label="Durata stimata (min)">
                  <input type="number" min="15" step="15" value={f.durata}
                    onChange={e=>s("durata",e.target.value)} style={{width:"100%"}} />
                </Field>
              </div>
              <Field label="Stima costo intervento (€)">
                <input type="number" min="0" step="10" value={f.stima_costo||""}
                  onChange={e=>s("stima_costo",e.target.value)} style={{width:"100%"}}
                  placeholder="Es. 150 — inclusi ricambi e manodopera" />
              </Field>
            </div>
          )}

          {tab === "checklist" && (
            <div style={{ display:"grid", gap:10 }}>
              <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:4 }}>
                Definisci i passi specifici per questo tipo di asset. Verranno precompilati in ogni intervento generato da questo template.
              </div>
              {steps.map((step, idx) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                  background:"var(--surface-2)", borderRadius:6, padding:"8px 12px" }}>
                  <input type="checkbox" checked={step.obbligatorio}
                    onChange={e=>setSteps(p=>p.map((s,j)=>j===i?{...s,obbligatorio:e.target.checked}:s))}
                    title="Obbligatorio" />
                  <span style={{ flex:1, fontSize:13 }}>{step.testo}</span>
                  {step.obbligatorio && <span style={{ fontSize:10, color:"var(--red)", fontWeight:700 }}>OBB.</span>}
                  <button onClick={()=>setSteps(p=>p.filter((_,j)=>j!==i))}
                    style={{ background:"none", border:"none", color:"var(--text-3)", cursor:"pointer", fontSize:16, lineHeight:1 }}>✕</button>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <input value={nuovoStep} onChange={e=>setNuovoStep(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&aggiungiStep()}
                  placeholder="Nuovo passo checklist... (es. Verificare livello olio)"
                  style={{ flex:1 }} />
                <button onClick={aggiungiStep} className="btn-primary" style={{ whiteSpace:"nowrap" }}>+ Aggiungi</button>
              </div>
              {steps.length === 0 && (
                <div style={{ textAlign:"center", color:"var(--text-3)", fontSize:13, padding:"20px 0" }}>
                  Nessun passo definito. Aggiungi i controlli specifici per questo tipo di asset.
                </div>
              )}
            </div>
          )}

          {tab === "ricambi" && (
            <div style={{ display:"grid", gap:10 }}>
              <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:4 }}>
                Ricambi tipicamente necessari per questo intervento. Il sistema avviserà se lo stock è basso prima dell'intervento.
              </div>
              {ricambi.map((r, idx) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                  background:"var(--surface-2)", borderRadius:6, padding:"8px 12px" }}>
                  <span style={{ fontSize:18 }}>📦</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{r.ricambi?.nome || r.nome_libero}</div>
                    {r.ricambi?.codice && <div style={{ fontSize:11, color:"var(--text-3)" }}>{r.ricambi.codice}</div>}
                  </div>
                  <span style={{ fontSize:12, background:"var(--blue-bg)", color:"var(--blue-bd)",
                    padding:"2px 8px", borderRadius:99, fontWeight:700 }}>×{r.quantita}</span>
                  <button onClick={()=>setRicambi(p=>p.filter((_,j)=>j!==i))}
                    style={{ background:"none", border:"none", color:"var(--text-3)", cursor:"pointer", fontSize:16 }}>✕</button>
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:8, marginTop:4 }}>
                {ricambiCatalogo.length > 0 ? (
                  <select value={nuovoRc.ricambioId}
                    onChange={e=>setNuovoRc(p=>({...p,ricambioId:e.target.value,nomeLibero:""}))}
                    style={{width:"100%"}}>
                    <option value="">— Da catalogo o libero —</option>
                    {ricambiCatalogo.map(r=><option key={r.id} value={r.id}>{r.nome} {r.codice?`[${r.codice}]`:""}</option>)}
                  </select>
                ) : (
                  <input value={nuovoRc.nomeLibero} onChange={e=>setNuovoRc(p=>({...p,nomeLibero:e.target.value}))}
                    placeholder="Nome ricambio" style={{width:"100%"}} />
                )}
                <input type="number" min="1" step="1" value={nuovoRc.quantita}
                  onChange={e=>setNuovoRc(p=>({...p,quantita:e.target.value}))}
                  style={{width:70}} placeholder="Qtà" />
                <button onClick={aggiungiRicambio} className="btn-primary">+ Aggiungi</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"0 24px 20px", display:"flex", justifyContent:"flex-end", gap:10, borderTop:"1px solid var(--border)", paddingTop:16 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={salva} disabled={saving || !f.nome.trim() || !f.tipo_asset} className="btn-primary">
            {saving ? "Salvataggio..." : ini ? "Aggiorna template" : "✅ Crea template"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Gestione Template ─────────────────────────────────────────────────────
export function GestioneTemplateAsset({ tenantId, ricambi=[] }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showM, setShowM]         = useState(false);
  const [inMod, setInMod]         = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("tutti");

  useEffect(() => { if(tenantId) carica(); }, [tenantId]);

  const carica = async () => {
    setLoading(true);
    const { data } = await supabase.from("asset_tipo_template")
      .select("*, template_ricambi(id), template_checklist_steps(id)")
      .eq("tenant_id", tenantId).order("tipo_asset").order("nome");
    setTemplates(data || []);
    setLoading(false);
  };

  const onSalva = async (t) => {
  try {

    await carica();
    setShowM(false); setInMod(null);
    } catch(e) { console.error("onSalva:", e.message); }
};

  const delTemplate = async (id) => {
  try {

    await supabase.from("asset_tipo_template").delete().eq("id", id);
    setTemplates(p => p.filter(t => t.id !== id));
    } catch(e) { console.error("delTemplate:", e.message); }
};

  const tipiDistinct = [...new Set(templates.map(t => t.tipo_asset))].sort();
  const filtrati = filtroTipo === "tutti" ? templates : templates.filter(t => t.tipo_asset === filtroTipo);

  if (loading) return <div style={{ padding:32, textAlign:"center", color:"var(--text-3)" }}>Caricamento...</div>;

  return (
    <div style={{ display:"grid", gap:14 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:18 }}>🔧 Template attività per tipo asset</div>
          <div style={{ fontSize:13, color:"var(--text-3)", marginTop:2 }}>
            Definisci checklist e ricambi previsti per ogni tipo di asset. Vengono usati come punto di partenza per i piani.
          </div>
        </div>
        <button className="btn-primary" onClick={() => { setInMod(null); setShowM(true); }}>+ Nuovo template</button>
      </div>

      {/* Filtro tipo */}
      {tipiDistinct.length > 1 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["tutti",...tipiDistinct].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} style={{
              padding:"5px 14px", borderRadius:99, border:"1px solid var(--border)",
              background: filtroTipo===t ? "var(--navy)" : "var(--surface)",
              color: filtroTipo===t ? "white" : "var(--text-2)",
              fontSize:12, fontWeight:600, cursor:"pointer",
            }}>{t==="tutti" ? "Tutti i tipi" : t}</button>
          ))}
        </div>
      )}

      {/* Lista template */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
        {filtrati.map(t => (
          <div key={t.id} style={{
            background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:"var(--radius-xl)", padding:"18px 20px",
            borderLeft:`4px solid ${PRI_COL[t.priorita]||"#94A3B8"}`,
          }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{t.nome}</div>
                <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>
                  <span style={{ background:"var(--surface-2)", padding:"2px 7px", borderRadius:99, marginRight:4 }}>{t.tipo_asset}</span>
                  <span>{FREQUENZE.find(f=>f.v===t.frequenza)?.l || t.frequenza} · {t.durata} min</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                <button className="btn-sm btn-icon" onClick={() => { setInMod(t); setShowM(true); }}>✏</button>
                <button className="btn-sm btn-icon btn-danger" onClick={() => delTemplate(t.id)}>✕</button>
              </div>
            </div>

            {t.descrizione && (
              <div style={{ fontSize:12, color:"var(--text-2)", fontStyle:"italic", marginBottom:10, lineHeight:1.4 }}>
                {t.descrizione.slice(0, 120)}{t.descrizione.length > 120 ? "..." : ""}
              </div>
            )}

            <div style={{ display:"flex", gap:8, flexWrap:"wrap", fontSize:11 }}>
              {(t.template_checklist_steps?.length > 0) && (
                <span style={{ background:"#ECFDF5", color:"#065F46", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>
                  ✅ {t.template_checklist_steps.length} passi checklist
                </span>
              )}
              {(t.template_ricambi?.length > 0) && (
                <span style={{ background:"#EFF6FF", color:"#1E40AF", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>
                  📦 {t.template_ricambi.length} ricambi previsti
                </span>
              )}
              {t.stima_costo && (
                <span style={{ background:"#FEF3C7", color:"#92400E", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>
                  💰 {fmtEuro(t.stima_costo)}
                </span>
              )}
              {!t.attivo && (
                <span style={{ background:"#FEF2F2", color:"#991B1B", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>
                  Disattivo
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtrati.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 20px", color:"var(--text-3)" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔧</div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Nessun template</div>
          <div style={{ fontSize:13, marginBottom:20 }}>
            Crea il primo template per {filtroTipo !== "tutti" ? `il tipo "${filtroTipo}"` : "iniziare"}.<br/>
            I template definiscono checklist e ricambi standard per ogni tipo di asset.
          </div>
          <button className="btn-primary" onClick={() => { setInMod(null); setShowM(true); }}>+ Crea primo template</button>
        </div>
      )}

      {showM && (
        <ModalTemplate ini={inMod} tenantId={tenantId} ricambiCatalogo={ricambi}
          onClose={() => { setShowM(false); setInMod(null); }}
          onSalva={onSalva} />
      )}
    </div>
  );
}

// ── Badge salute asset (ore utilizzo vs soglia) ──────────────────────────
export function AssetSaluteBadge({ asset }) {
  if (!asset.soglia_ore || !asset.ore_utilizzo) return null;
  const pct = (asset.ore_utilizzo / asset.soglia_ore) * 100;
  if (pct < 70) return null; // sotto il 70% non mostrare

  const scaduto = pct >= 100;
  const critico = pct >= 85;

  return (
    <span style={{
      fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
      background: scaduto ? "#FEF2F2" : critico ? "#FEF3C7" : "#F0FDF4",
      color: scaduto ? "#DC2626" : critico ? "#92400E" : "#166534",
      border: `1px solid ${scaduto?"#FECACA":critico?"#FDE68A":"#BBF7D0"}`,
      display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap",
    }}>
      {scaduto ? "🔴" : critico ? "🟡" : "🟢"} {Math.round(asset.ore_utilizzo)}h / {asset.soglia_ore}h
    </span>
  );
}

// ── Suggerimento ricambi per template ─────────────────────────────────────
export function SuggerimentoRicambi({ templateId, ricambiCatalogo=[], onOrdina }) {
  const [ricambi, setRicambi] = useState([]);

  useEffect(() => {
    if (!templateId) return;
    supabase.from("template_ricambi")
      .select("*, ricambi(id,nome,codice,quantita_stock,soglia_minima)")
      .eq("template_id", templateId)
      .then(({ data }) => setRicambi(data || [])).catch(e => console.warn("DB:", e.message));
  }, [templateId]);

  const critici = ricambi.filter(r => {
    const stock = r.ricambi?.quantita_stock ?? 0;
    const soglia = r.ricambi?.soglia_minima ?? 0;
    return r.ricambi && stock <= soglia + (r.quantita || 1);
  });

  if (!critici.length) return null;

  return (
    <div style={{
      background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:8,
      padding:"12px 14px", marginBottom:12,
    }}>
      <div style={{ fontWeight:700, fontSize:13, color:"#92400E", marginBottom:8 }}>
        ⚠ Stock insufficiente per questo intervento
      </div>
      <div style={{ display:"grid", gap:6 }}>
        {critici.map(r => (
          <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
            <span>📦 {r.ricambi.nome}</span>
            <span style={{ color:"#DC2626", fontWeight:700 }}>
              stock: {r.ricambi.quantita_stock} (serve: {r.quantita})
            </span>
          </div>
        ))}
      </div>
      {onOrdina && (
        <button onClick={onOrdina} className="btn-primary" style={{ marginTop:10, fontSize:12, padding:"6px 14px" }}>
          📦 Apri ordine di acquisto
        </button>
      )}
    </div>
  );
}
