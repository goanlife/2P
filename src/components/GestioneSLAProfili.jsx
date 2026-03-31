import React, { useState, useEffect } from "react";
import { PRI_COL } from '../constants';
import { supabase } from "../supabase";
import { Field, Overlay } from "./ui/Atoms";

// ─────────────────────────────────────────────────────────────────────────────
// SLA — Contenitori con N voci custom, associabili ai clienti
// Modello: contenitore "Contratto Premium" → N voci SLA (risposta, risoluzione)
// ─────────────────────────────────────────────────────────────────────────────

const SLA_HARDCODED = {
  urgente: { ore_risposta:2,  ore_risoluzione:8   },
  alta:    { ore_risposta:8,  ore_risoluzione:24  },
  media:   { ore_risposta:24, ore_risoluzione:72  },
  bassa:   { ore_risposta:72, ore_risoluzione:168 },
};
const PRIORITA_OPT = [
  { v:"",        l:"— Nessuna (SLA custom) —" },
  { v:"urgente", l:"⚡ Urgente" },
  { v:"alta",    l:"🔵 Alta" },
  { v:"media",   l:"🟡 Media" },
  { v:"bassa",   l:"⚪ Bassa" },
];
const COLORI = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316"];

const fmtOre = ore => ore >= 24 ? `${Math.round(ore/24)}gg` : `${ore}h`;

// ── Riga voce SLA editabile ───────────────────────────────────────────────
function RigaVoce({ voce, onUpd, onDel }) {
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"1fr 120px 80px 80px auto",
      gap:8, alignItems:"center", padding:"10px 12px",
      background:"var(--surface-2)", borderRadius:7, marginBottom:6,
    }}>
      <input value={voce.nome||""}
        onChange={e=>onUpd({...voce,nome:e.target.value})}
        placeholder="Es. Guasto critico, Manutenzione programmata..."
        style={{fontSize:13}} />
      <select value={voce.priorita||""}
        onChange={e=>onUpd({...voce,priorita:e.target.value||null})}
        style={{fontSize:12}}>
        {PRIORITA_OPT.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <input type="number" min={1} value={voce.ore_risposta||""}
          onChange={e=>onUpd({...voce,ore_risposta:Number(e.target.value)||null})}
          style={{width:"100%",fontSize:12,textAlign:"center"}} placeholder="h" />
      </div>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <input type="number" min={1} value={voce.ore_risoluzione||""}
          onChange={e=>onUpd({...voce,ore_risoluzione:Number(e.target.value)||null})}
          style={{width:"100%",fontSize:12,textAlign:"center"}} placeholder="h" />
      </div>
      <button onClick={onDel}
        style={{background:"none",border:"none",color:"var(--text-3)",cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>
    </div>
  );
}

// ── Modal contenitore SLA ─────────────────────────────────────────────────
function ModalContenitore({ ini, tenantId, onClose, onSalva }) {
  const vuoto = { nome:"", descrizione:"", colore:"#3B82F6", is_default:false };
  const [f, sf]    = useState(ini || vuoto);
  const [voci, sv] = useState(ini?.voci || []);
  const [saving, setSaving] = useState(false);
  const s = (k,v) => sf(p=>({...p,[k]:v}));

  const addVoce = () => sv(p=>[...p, {
    _new:true, id:Date.now(),
    nome:"", priorita:null,
    ore_risposta:24, ore_risoluzione:72, note:"", ordine:p.length
  }]);

  const updVoce = (id, voce) => sv(p=>p.map(v=>v.id===id?voce:v));
  const delVoce = (id) => sv(p=>p.filter(v=>v.id!==id));

  const salva = async () => {
    if (!f.nome.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nome:f.nome.trim(), descrizione:f.descrizione||null,
        colore:f.colore, is_default:!!f.is_default, tenant_id:tenantId,
      };

      let cId = ini?.id;
      if (cId) {
        await supabase.from("sla_profili").update(payload).eq("id", cId);
        // Elimina voci rimosse (quelle che non sono _new e non sono più in lista)
        const idsDaMantenere = voci.filter(v=>!v._new).map(v=>v.id);
        if (ini?.voci?.length) {
          const daEliminare = ini.voci.filter(v=>!idsDaMantenere.includes(v.id)).map(v=>v.id);
          if (daEliminare.length) {
            await supabase.from("sla_profilo_config").delete().in("id", daEliminare);
          }
        }
      } else {
        const {data} = await supabase.from("sla_profili").insert(payload).select().single();
        cId = data.id;
      }

      // Salva/aggiorna voci
      for (let i=0; i<voci.length; i++) {
        const v = voci[i];
        const row = {
          profilo_id:      cId,
          nome:            v.nome || "Senza nome",
          priorita:        v.priorita || null,
          ore_risposta:    Number(v.ore_risposta)||24,
          ore_risoluzione: Number(v.ore_risoluzione)||72,
          note:            v.note||null,
          ordine:          i,
        };
        if (v._new) {
          await supabase.from("sla_profilo_config").insert(row);
        } else {
          await supabase.from("sla_profilo_config").update(row).eq("id", v.id);
        }
      }
      onSalva();
    } finally { setSaving(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(700px,97vw)", maxHeight:"92vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.3)",
      }}>
        {/* Header */}
        <div style={{padding:"20px 24px 16px", borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:17}}>
            {ini ? "Modifica contenitore SLA" : "Nuovo contenitore SLA"}
          </div>
          <div style={{fontSize:12, color:"var(--text-3)", marginTop:4}}>
            Definisci liberamente le voci SLA del contratto. Ogni voce può avere un nome custom e
            opzionalmente legarsi a una priorità per il matching automatico nel badge.
          </div>
        </div>

        <div style={{padding:"20px 24px", display:"grid", gap:14}}>
          {/* Info contenitore */}
          <div style={{display:"grid", gridTemplateColumns:"1fr auto", gap:12, alignItems:"flex-start"}}>
            <Field label="Nome contenitore *">
              <input value={f.nome} onChange={e=>s("nome",e.target.value)}
                style={{width:"100%"}} placeholder="Es. Contratto Premium, SLA Enterprise, Accordo Base..." />
            </Field>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text-2)",textTransform:"uppercase",
                letterSpacing:".04em",marginBottom:6}}>Colore</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",maxWidth:120}}>
                {COLORI.map(c=>(
                  <div key={c} onClick={()=>s("colore",c)} style={{
                    width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",
                    border:f.colore===c?"3px solid var(--text-1)":"2px solid transparent",
                    transition:"border .15s",
                  }}/>
                ))}
              </div>
            </div>
          </div>

          <Field label="Descrizione">
            <input value={f.descrizione||""} onChange={e=>s("descrizione",e.target.value)}
              style={{width:"100%"}} placeholder="Es. Applicabile a clienti enterprise con uptime garantito al 99%" />
          </Field>

          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={!!f.is_default} onChange={e=>s("is_default",e.target.checked)}/>
            <span>Contenitore <strong>predefinito</strong> — usato per clienti senza contenitore assegnato</span>
          </label>

          {/* Intestazione voci */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--text-1)"}}>
                📋 Voci SLA ({voci.length})
              </div>
              <button onClick={addVoce} className="btn-primary" style={{fontSize:12,padding:"6px 14px"}}>
                + Aggiungi voce
              </button>
            </div>

            {/* Intestazioni colonne */}
            {voci.length > 0 && (
              <div style={{
                display:"grid",gridTemplateColumns:"1fr 120px 80px 80px 24px",
                gap:8,padding:"0 12px",marginBottom:4,
              }}>
                {["Nome voce SLA","Priorità (opt.)","Risposta","Risoluzione",""].map((h)=>(
                  <div key={h} style={{fontSize:10,fontWeight:700,color:"var(--text-3)",
                    textTransform:"uppercase",letterSpacing:".04em"}}>{h}</div>
                ))}
              </div>
            )}

            {voci.map(v=>(
              <RigaVoce key={v.id} voce={v}
                onUpd={nv=>updVoce(v.id,nv)}
                onDel={()=>delVoce(v.id)} />
            ))}

            {voci.length === 0 && (
              <div style={{
                border:"2px dashed var(--border)", borderRadius:8, padding:"28px",
                textAlign:"center", color:"var(--text-3)", fontSize:13,
              }}>
                Nessuna voce SLA. Clicca <strong>"+ Aggiungi voce"</strong> per iniziare.
                <div style={{fontSize:11,marginTop:8,lineHeight:1.6}}>
                  Esempio: "Guasto critico" → 1h risposta · 4h risoluzione · priorità Urgente<br/>
                  "Manutenzione pianificata" → 48h risposta · 5gg risoluzione · nessuna priorità
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"0 24px 20px",display:"flex",justifyContent:"space-between",
          borderTop:"1px solid var(--border)",paddingTop:16,gap:10}}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={salva} disabled={saving||!f.nome.trim()} className="btn-primary">
            {saving ? "Salvataggio..." : ini ? "Aggiorna" : "✅ Crea contenitore"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Gestione contenitori SLA ──────────────────────────────────────────────
export function GestioneSLAProfili({ tenantId, clienti=[] }) {
  const [profili, setProfili] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showM, setShowM]     = useState(false);
  const [inMod, setInMod]     = useState(null);

  useEffect(()=>{ if(tenantId) carica(); },[tenantId]);

  const carica = async () => {
    try {
    setLoading(true);
    const {data} = await supabase.from("sla_profili")
      .select("*, sla_profilo_config(*)")
      .eq("tenant_id", tenantId)
      .order("is_default",{ascending:false})
      .order("nome");
    // Normalizza: ordina le voci per ordine
    const norm = (data||[]).map(p=>({
      ...p,
      voci: (p.sla_profilo_config||[]).sort((a,b)=>a.ordine-b.ordine),
    }));
    setProfili(norm);
    setLoading(false);
      } catch(e) { console.error("DB error:", e.message); }
  };

  const elimina = async (id) => {
    try {
    const usato = clienti.filter(c=>c.slaProfilo_id===id);
    if (usato.length > 0) {
      console.warn(`Impossibile eliminare: associato a ${usato.length} cliente/i.\nRiassegna prima un altro contenitore.`);
      return;
    }
    await supabase.from("sla_profili").delete().eq("id",id);
    setProfili(p=>p.filter(x=>x.id!==id));
      } catch(e) { console.error("DB error:", e.message); }
  };

  const onSalva = async ()=>{
    try { await carica(); setShowM(false); setInMod(null);     } catch(e) { console.error("onSalva:", e.message); }
  };

  if (loading) return <div style={{padding:20,color:"var(--text-3)",fontSize:13}}>Caricamento...</div>;

  return (
    <div style={{display:"grid",gap:16}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>⏱ Contenitori SLA</div>
          <div style={{fontSize:12,color:"var(--text-3)",lineHeight:1.6}}>
            Ogni contenitore raccoglie N voci SLA (es. "Guasto critico", "Manutenzione standard").
            Associa un contenitore al cliente dalla sua scheda — avrà così il suo contratto SLA specifico.
          </div>
        </div>
        <button onClick={()=>{setInMod(null);setShowM(true);}} className="btn-primary"
          style={{whiteSpace:"nowrap",flexShrink:0}}>+ Nuovo contenitore</button>
      </div>

      {profili.length===0 && (
        <div style={{textAlign:"center",padding:"40px 20px",color:"var(--text-3)",
          border:"2px dashed var(--border)",borderRadius:12}}>
          <div style={{fontSize:40,marginBottom:12}}>⏱</div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Nessun contenitore SLA</div>
          <div style={{fontSize:12,marginBottom:16,lineHeight:1.6}}>
            Crea un contenitore (es. "Contratto Premium") e aggiungi le voci SLA.<br/>
            Poi associalo ai clienti dalla loro scheda.
          </div>
          <button onClick={()=>{setInMod(null);setShowM(true);}} className="btn-primary">
            + Crea primo contenitore
          </button>
        </div>
      )}

      <div style={{display:"grid",gap:12}}>
        {profili.map(p=>{
          const clientiAssociati = clienti.filter(c=>c.slaProfilo_id===p.id);
          return (
            <div key={p.id} style={{
              background:"var(--surface)",border:"1px solid var(--border)",
              borderRadius:"var(--radius-xl)",padding:"18px 20px",
              borderLeft:`5px solid ${p.colore}`,
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  {/* Nome + badge */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:15}}>{p.nome}</span>
                    {p.is_default&&(
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,
                        background:"#FEF3C7",color:"#92400E"}}>⭐ predefinito</span>
                    )}
                    {clientiAssociati.length>0&&(
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,
                        background:"#EFF6FF",color:"#1E40AF"}}>
                        {clientiAssociati.length} client{clientiAssociati.length===1?"e":"i"}
                      </span>
                    )}
                  </div>
                  {p.descrizione&&(
                    <div style={{fontSize:12,color:"var(--text-3)",marginBottom:10}}>{p.descrizione}</div>
                  )}

                  {/* Voci SLA */}
                  {p.voci.length===0?(
                    <div style={{fontSize:12,color:"var(--text-3)",fontStyle:"italic"}}>
                      Nessuna voce SLA — modifica per aggiungere
                    </div>
                  ):(
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {p.voci.map(v=>(
                        <div key={v.id} style={{
                          fontSize:11,background:"var(--surface-2)",
                          border:`1px solid ${PRI_COL[v.priorita]||"var(--border)"}`,
                          borderRadius:6,padding:"4px 10px",
                          display:"flex",alignItems:"center",gap:6,
                        }}>
                          {v.priorita&&(
                            <span style={{width:7,height:7,borderRadius:"50%",
                              background:PRI_COL[v.priorita],display:"inline-block"}}/>
                          )}
                          <span style={{fontWeight:600}}>{v.nome}</span>
                          <span style={{color:"var(--text-3)"}}>
                            {fmtOre(v.ore_risposta)} · {fmtOre(v.ore_risoluzione)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button className="btn-sm btn-icon"
                    onClick={()=>{setInMod({...p});setShowM(true);}}>✏</button>
                  <button className="btn-sm btn-icon btn-danger"
                    onClick={()=>elimina(p.id)}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showM&&(
        <ModalContenitore ini={inMod} tenantId={tenantId}
          onClose={()=>{setShowM(false);setInMod(null);}}
          onSalva={onSalva} />
      )}
    </div>
  );
}

// ── Selector contenitore (in ModalCliente) ───────────────────────────────
export function SelectSLAProfilo({ tenantId, value, onChange }) {
  const [profili, setProfili] = useState([]);
  useEffect(()=>{
    if (!tenantId) return;
    supabase.from("sla_profili").select("id,nome,colore,is_default,sla_profilo_config(id)")
      .eq("tenant_id",tenantId).order("is_default",{ascending:false}).order("nome")
      .then(({data})=>setProfili(data||[])).catch(e => console.warn("DB:", e.message));
  },[tenantId]);

  return (
    <select value={value||""} onChange={e=>onChange(e.target.value||null)} style={{width:"100%"}}>
      <option value="">— Nessun contenitore (usa predefinito) —</option>
      {profili.map(p=>(
        <option key={p.id} value={p.id}>
          {p.is_default?"⭐ ":""}{p.nome}
          {p.sla_profilo_config?.length ? ` (${p.sla_profilo_config.length} voci)` : ""}
        </option>
      ))}
    </select>
  );
}

// ── Risolve la voce SLA applicabile a un'attività ────────────────────────
// Gerarchia: contenitore cliente (per priorità) > tenant default > hardcoded
export const SLA_DEFAULT_GLOBALE = {
  urgente: { ore_risposta:2,  ore_risoluzione:8   },
  alta:    { ore_risposta:8,  ore_risoluzione:24  },
  media:   { ore_risposta:24, ore_risoluzione:72  },
  bassa:   { ore_risposta:72, ore_risoluzione:168 },
};
