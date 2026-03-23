import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Field, Modal, Overlay } from "./ui/Atoms";

const SLA_DEFAULT_ORE = {
  urgente: { ore_risposta:2,  ore_risoluzione:8   },
  alta:    { ore_risposta:8,  ore_risoluzione:24  },
  media:   { ore_risposta:24, ore_risoluzione:72  },
  bassa:   { ore_risposta:72, ore_risoluzione:168 },
};
const PRIORITA = ['urgente','alta','media','bassa'];
const PRI_COL  = { urgente:"#EF4444", alta:"#3B82F6", media:"#F59E0B", bassa:"#94A3B8" };
const COLORI_PROFILO = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316"];

// ── Modal crea/modifica profilo ───────────────────────────────────────────
function ModalProfilo({ ini, tenantId, onClose, onSalva }) {
  const vuoto = { nome:"", descrizione:"", colore:"#3B82F6", is_default:false };
  const [f, sf]   = useState(ini || vuoto);
  const [cfg, setCfg] = useState(
    PRIORITA.map(p => ({
      priorita: p,
      ore_risposta:    ini?.config?.find(c=>c.priorita===p)?.ore_risposta    ?? SLA_DEFAULT_ORE[p].ore_risposta,
      ore_risoluzione: ini?.config?.find(c=>c.priorita===p)?.ore_risoluzione ?? SLA_DEFAULT_ORE[p].ore_risoluzione,
    }))
  );
  const [saving, setSaving] = useState(false);
  const s = (k,v) => sf(p=>({...p,[k]:v}));
  const aggiorna = (priorita, field, val) =>
    setCfg(prev => prev.map(c => c.priorita===priorita ? {...c,[field]:Number(val)||1} : c));

  const salva = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    try {
      let profiloId = ini?.id;
      const payload = { nome:f.nome.trim(), descrizione:f.descrizione||null,
        colore:f.colore, is_default:f.is_default, tenant_id:tenantId };
      if (profiloId) {
        await supabase.from("sla_profili").update(payload).eq("id", profiloId);
      } else {
        const { data } = await supabase.from("sla_profili").insert(payload).select().single();
        profiloId = data.id;
      }
      // Salva configurazione priorità
      for (const c of cfg) {
        await supabase.from("sla_profilo_config").upsert({
          profilo_id:      profiloId,
          priorita:        c.priorita,
          ore_risposta:    c.ore_risposta,
          ore_risoluzione: c.ore_risoluzione,
        }, { onConflict:"profilo_id,priorita" });
      }
      onSalva();
    } finally { setSaving(false); }
  };

  const inp = { padding:"6px 8px", border:"1px solid var(--border-dim)", borderRadius:5,
    fontSize:12, width:70, textAlign:"center", background:"var(--surface)", color:"var(--text-1)" };

  return (
    <Overlay onClose={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(560px,96vw)", maxHeight:"90vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:16 }}>
            {ini ? "Modifica profilo SLA" : "Nuovo profilo SLA"}
          </div>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:4 }}>
            Definisci i tempi massimi per priorità. Potrai associare questo profilo a uno o più clienti.
          </div>
        </div>

        <div style={{ padding:"20px 24px", display:"grid", gap:14 }}>
          {/* Info profilo */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12 }}>
            <Field label="Nome profilo *">
              <input value={f.nome} onChange={e=>s("nome",e.target.value)}
                style={{width:"100%"}} placeholder="Es. Premium, Standard, Base..." />
            </Field>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-2)",
                textTransform:"uppercase", letterSpacing:".04em", marginBottom:6 }}>Colore</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {COLORI_PROFILO.map(c => (
                  <div key={c} onClick={() => s("colore",c)} style={{
                    width:22, height:22, borderRadius:"50%", background:c, cursor:"pointer",
                    border: f.colore===c ? "3px solid var(--text-1)" : "2px solid transparent",
                    transition:"border .15s",
                  }} />
                ))}
              </div>
            </div>
          </div>

          <Field label="Descrizione (opzionale)">
            <input value={f.descrizione||""} onChange={e=>s("descrizione",e.target.value)}
              style={{width:"100%"}} placeholder="Es. Per clienti enterprise con SLA contrattuale" />
          </Field>

          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
            <input type="checkbox" checked={f.is_default} onChange={e=>s("is_default",e.target.checked)} />
            <span>Profilo predefinito (usato per clienti senza profilo assegnato)</span>
          </label>

          {/* Configurazione ore per priorità */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)",
              textTransform:"uppercase", letterSpacing:".04em", marginBottom:10 }}>
              Tempi SLA per priorità
            </div>
            <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"130px 1fr 1fr" }}>
                {["Priorità","Risposta max","Risoluzione max"].map(h=>(
                  <div key={h} style={{ padding:"8px 14px", background:"var(--surface-2)",
                    fontSize:11, fontWeight:700, color:"var(--text-2)",
                    textTransform:"uppercase", borderBottom:"2px solid var(--border)" }}>{h}</div>
                ))}
                {PRIORITA.map(p => {
                  const c = cfg.find(x=>x.priorita===p);
                  return (
                    <React.Fragment key={p}>
                      <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)",
                        display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:10, height:10, borderRadius:"50%",
                          background:PRI_COL[p], display:"inline-block" }} />
                        <span style={{ fontSize:13, fontWeight:600, textTransform:"capitalize" }}>{p}</span>
                      </div>
                      <div style={{ padding:"8px 14px", borderBottom:"1px solid var(--border)",
                        display:"flex", alignItems:"center" }}>
                        <input type="number" min={1} value={c.ore_risposta}
                          onChange={e=>aggiorna(p,"ore_risposta",e.target.value)} style={inp} />
                        <span style={{ fontSize:11, color:"var(--text-3)", marginLeft:6 }}>ore</span>
                      </div>
                      <div style={{ padding:"8px 14px", borderBottom:"1px solid var(--border)",
                        display:"flex", alignItems:"center" }}>
                        <input type="number" min={1} value={c.ore_risoluzione}
                          onChange={e=>aggiorna(p,"ore_risoluzione",e.target.value)} style={inp} />
                        <span style={{ fontSize:11, color:"var(--text-3)", marginLeft:6 }}>ore</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"0 24px 20px", display:"flex", justifyContent:"space-between",
          borderTop:"1px solid var(--border)", paddingTop:16, gap:10 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={salva} disabled={saving||!f.nome.trim()} className="btn-primary">
            {saving ? "Salvataggio..." : ini ? "Aggiorna profilo" : "✅ Crea profilo"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Gestione Profili SLA (tab in Azienda) ─────────────────────────────────
export function GestioneSLAProfili({ tenantId, clienti=[] }) {
  const [profili, setProfili]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showM, setShowM]       = useState(false);
  const [inMod, setInMod]       = useState(null);

  useEffect(() => { if(tenantId) carica(); }, [tenantId]);

  const carica = async () => {
    setLoading(true);
    const { data } = await supabase.from("sla_profili")
      .select("*, sla_profilo_config(*)")
      .eq("tenant_id", tenantId)
      .order("is_default", { ascending:false })
      .order("nome");
    setProfili(data || []);
    setLoading(false);
  };

  const elimina = async (id) => {
    // Verifica che non sia usato da clienti
    const usato = clienti.filter(c => c.sla_profilo_id === id);
    if (usato.length > 0) {
      alert(`Impossibile eliminare: usato da ${usato.length} cliente/i.\nRiassegna prima un altro profilo.`);
      return;
    }
    await supabase.from("sla_profili").delete().eq("id", id);
    setProfili(p => p.filter(x => x.id !== id));
  };

  const onSalva = async () => { await carica(); setShowM(false); setInMod(null); };

  if (loading) return <div style={{ padding:20, color:"var(--text-3)", fontSize:13 }}>Caricamento...</div>;

  return (
    <div style={{ display:"grid", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>⏱ Profili SLA</div>
          <div style={{ fontSize:12, color:"var(--text-3)", lineHeight:1.5 }}>
            Crea profili con tempi SLA diversi e associali ai tuoi clienti.<br/>
            Il profilo <strong>predefinito</strong> si applica ai clienti senza profilo assegnato.
          </div>
        </div>
        <button onClick={()=>{setInMod(null);setShowM(true);}} className="btn-primary"
          style={{ whiteSpace:"nowrap" }}>+ Nuovo profilo</button>
      </div>

      {profili.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px 20px", color:"var(--text-3)" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>⏱</div>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>Nessun profilo SLA</div>
          <div style={{ fontSize:12, marginBottom:16 }}>Crea il primo profilo per iniziare.</div>
          <button onClick={()=>{setInMod(null);setShowM(true);}} className="btn-primary">+ Crea profilo</button>
        </div>
      )}

      <div style={{ display:"grid", gap:10 }}>
        {profili.map(p => {
          const clientiAssociati = clienti.filter(c => c.sla_profilo_id === p.id);
          const cfgMap = {};
          (p.sla_profilo_config||[]).forEach(c => cfgMap[c.priorita] = c);
          return (
            <div key={p.id} style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"var(--radius-xl)", padding:"16px 18px",
              borderLeft:`4px solid ${p.colore}`,
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>{p.nome}</div>
                    {p.is_default && (
                      <span style={{ fontSize:10, fontWeight:700, padding:"1px 7px",
                        borderRadius:99, background:"#FEF3C7", color:"#92400E" }}>
                        predefinito
                      </span>
                    )}
                    {clientiAssociati.length > 0 && (
                      <span style={{ fontSize:10, fontWeight:700, padding:"1px 7px",
                        borderRadius:99, background:"#EFF6FF", color:"#1E40AF" }}>
                        {clientiAssociati.length} client{clientiAssociati.length===1?"e":"i"}
                      </span>
                    )}
                  </div>
                  {p.descrizione && (
                    <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:10 }}>
                      {p.descrizione}
                    </div>
                  )}
                  {/* Tabella riassuntiva SLA */}
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    {PRIORITA.map(pr => {
                      const c = cfgMap[pr] || SLA_DEFAULT_ORE[pr];
                      return (
                        <div key={pr} style={{ fontSize:11 }}>
                          <span style={{ width:8, height:8, borderRadius:"50%",
                            background:PRI_COL[pr], display:"inline-block", marginRight:4 }} />
                          <span style={{ fontWeight:600, textTransform:"capitalize" }}>{pr}:</span>
                          <span style={{ color:"var(--text-3)", marginLeft:4 }}>
                            {c.ore_risposta}h risposta · {c.ore_risoluzione}h risoluzione
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button className="btn-sm btn-icon"
                    onClick={() => { setInMod({...p, config:p.sla_profilo_config}); setShowM(true); }}>✏</button>
                  <button className="btn-sm btn-icon btn-danger"
                    onClick={() => elimina(p.id)}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showM && (
        <ModalProfilo ini={inMod} tenantId={tenantId} onClose={()=>{setShowM(false);setInMod(null);}} onSalva={onSalva} />
      )}
    </div>
  );
}

// ── Selector profilo SLA (usato in ModalCliente) ──────────────────────────
export function SelectSLAProfilo({ tenantId, value, onChange }) {
  const [profili, setProfili] = useState([]);
  useEffect(() => {
    if (!tenantId) return;
    supabase.from("sla_profili").select("id,nome,colore,is_default")
      .eq("tenant_id", tenantId).order("is_default",{ascending:false}).order("nome")
      .then(({data}) => setProfili(data||[]));
  }, [tenantId]);

  return (
    <select value={value||""} onChange={e=>onChange(e.target.value||null)}
      style={{width:"100%"}}>
      <option value="">— Nessun profilo (usa predefinito) —</option>
      {profili.map(p => (
        <option key={p.id} value={p.id}>
          {p.is_default ? "⭐ " : ""}{p.nome}
        </option>
      ))}
    </select>
  );
}

// ── Risolve la config SLA per un'attività (profilo cliente > tenant default > hardcoded) ──
export const SLA_DEFAULT_GLOBALE = SLA_DEFAULT_ORE;
