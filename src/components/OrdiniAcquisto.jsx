import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const fmtEuro = v => v ? `€${Number(v).toFixed(2)}` : "—";

const STATO_STYLE = {
  bozza:      { bg:"var(--surface-2)", color:"var(--text-2)", label:"Bozza" },
  inviato:    { bg:"#EFF6FF",          color:"#1D4ED8",        label:"Inviato" },
  confermato: { bg:"#FFFBEB",          color:"#92400E",        label:"Confermato" },
  ricevuto:   { bg:"#ECFDF5",          color:"#065F46",        label:"Ricevuto ✓" },
  annullato:  { bg:"#FEF2F2",          color:"#DC2626",        label:"Annullato" },
};

// ── Form nuovo ordine ─────────────────────────────────────────────────────
function ModalOrdine({ ini, ricambi=[], tenantId, meOperatore, onClose, onSalva }) {
  const vuoto = { fornitore:"", note:"", data_ordine: new Date().toISOString().split("T")[0], data_attesa:"", righe:[] };
  const [f, sf] = useState(ini ? { ...ini, righe: ini.righe||[] } : vuoto);
  const [saving, setSaving] = useState(false);
  const [nuovaRiga, setNuovaRiga] = useState({ ricambio_id:"", nome_libero:"", quantita:1, prezzo_unitario:"", note:"" });

  const totale = f.righe.reduce((s,r) => s + (r.quantita||1)*(r.prezzo_unitario||0), 0);

  const aggiungiRiga = () => {
    const rc = ricambi.find(c => String(c.id) === nuovaRiga.ricambio_id);
    if (!nuovaRiga.ricambio_id && !nuovaRiga.nome_libero.trim()) return;
    sf(p => ({ ...p, righe: [...p.righe, {
      _tmp: Date.now(),
      ricambio_id:     rc ? rc.id : null,
      nome_libero:     rc ? null : nuovaRiga.nome_libero,
      nome_display:    rc ? rc.nome : nuovaRiga.nome_libero,
      quantita:        Number(nuovaRiga.quantita)||1,
      prezzo_unitario: nuovaRiga.prezzo_unitario ? Number(nuovaRiga.prezzo_unitario) : (rc?.prezzo||0),
      note:            nuovaRiga.note,
    }]}));
    setNuovaRiga({ ricambio_id:"", nome_libero:"", quantita:1, prezzo_unitario:"", note:"" });
  };

  const salva = async () => {
    if (!f.fornitore.trim() || !f.righe.length) return;
    setSaving(true);
    await onSalva({ ...f, totale });
    setSaving(false);
    onClose();
  };

  const st = {
    inp: { padding:"8px 10px", border:"1px solid var(--border-dim)", borderRadius:6, fontSize:13, width:"100%", background:"var(--surface)", color:"var(--text-1)", boxSizing:"border-box" },
    th: { fontSize:11, fontWeight:700, color:"var(--text-2)", textTransform:"uppercase", padding:"6px 10px", borderBottom:"2px solid var(--border)", textAlign:"left" },
    td: { fontSize:12, padding:"7px 10px", borderBottom:"1px solid var(--border)" },
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"var(--surface)",borderRadius:12,width:"min(700px,96vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:16}}>{ini ? "Modifica ordine" : "📦 Nuovo ordine di acquisto"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--text-3)"}}>✕</button>
        </div>

        <div style={{padding:"20px 24px",display:"grid",gap:16}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={{fontSize:11,fontWeight:700,color:"var(--text-2)",display:"block",marginBottom:4}}>Fornitore *</label>
              <input value={f.fornitore} onChange={e=>sf(p=>({...p,fornitore:e.target.value}))} style={st.inp} placeholder="Nome fornitore" /></div>
            <div><label style={{fontSize:11,fontWeight:700,color:"var(--text-2)",display:"block",marginBottom:4}}>Data attesa consegna</label>
              <input type="date" value={f.data_attesa} onChange={e=>sf(p=>({...p,data_attesa:e.target.value}))} style={st.inp} /></div>
          </div>
          <div><label style={{fontSize:11,fontWeight:700,color:"var(--text-2)",display:"block",marginBottom:4}}>Note</label>
            <textarea rows={2} value={f.note} onChange={e=>sf(p=>({...p,note:e.target.value}))} style={{...st.inp,resize:"vertical"}} placeholder="Note per il fornitore..." /></div>

          {/* Righe ordine */}
          <div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Articoli da ordinare</div>
            {f.righe.length > 0 && (
              <table style={{width:"100%",borderCollapse:"collapse",marginBottom:10}}>
                <thead><tr>
                  {["Articolo","Qtà","Prezzo","Totale",""].map(h=><th key={h} style={st.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {f.righe.map((r,i)=>(
                    <tr key={r._tmp||r.id||i}>
                      <td style={st.td}><div style={{fontWeight:600}}>{r.nome_display||r.nome_libero}</div></td>
                      <td style={st.td}>{r.quantita}</td>
                      <td style={st.td}>{fmtEuro(r.prezzo_unitario)}</td>
                      <td style={{...st.td,fontWeight:700,color:"var(--amber)"}}>{fmtEuro((r.quantita||1)*(r.prezzo_unitario||0))}</td>
                      <td style={st.td}>
                        <button onClick={()=>sf(p=>({...p,righe:p.righe.filter((_,j)=>j!==i)}))}
                          style={{background:"#FEF2F2",border:"1px solid #FECACA",color:"#DC2626",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontSize:11}}>✕</button>
                      </td>
                    </tr>
                  ))}
                  <tr><td colSpan={3} style={{...st.td,textAlign:"right",fontWeight:700}}>Totale</td>
                    <td style={{...st.td,fontWeight:700,fontSize:14,color:"var(--amber)"}}>{fmtEuro(totale)}</td>
                    <td style={st.td}></td></tr>
                </tbody>
              </table>
            )}

            {/* Aggiunta riga */}
            <div style={{background:"var(--surface-2)",border:"1px dashed var(--border-dim)",borderRadius:8,padding:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",marginBottom:8}}>+ Aggiungi articolo</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 100px 1fr auto",gap:8,alignItems:"end"}}>
                {ricambi.length > 0
                  ? <div>
                      <label style={{fontSize:10,color:"var(--text-3)",display:"block",marginBottom:2}}>Dal catalogo</label>
                      <select value={nuovaRiga.ricambio_id} onChange={e=>setNuovaRiga(p=>({...p,ricambio_id:e.target.value,nome_libero:""}))} style={{...st.inp,padding:"7px 8px"}}>
                        <option value="">— Seleziona —</option>
                        {ricambi.map(r=><option key={r.id} value={String(r.id)}>{r.nome}{r.codice?` [${r.codice}]`:""}</option>)}
                        <option value="__libero">+ Inserisci manualmente</option>
                      </select>
                    </div>
                  : <div><label style={{fontSize:10,color:"var(--text-3)",display:"block",marginBottom:2}}>Articolo</label>
                      <input value={nuovaRiga.nome_libero} onChange={e=>setNuovaRiga(p=>({...p,nome_libero:e.target.value}))} style={st.inp} placeholder="Nome articolo" /></div>
                }
                {(!nuovaRiga.ricambio_id || nuovaRiga.ricambio_id==="__libero") && ricambi.length > 0 &&
                  <div style={{gridColumn:"span 1"}}><label style={{fontSize:10,color:"var(--text-3)",display:"block",marginBottom:2}}>Nome</label>
                    <input value={nuovaRiga.nome_libero} onChange={e=>setNuovaRiga(p=>({...p,nome_libero:e.target.value}))} style={st.inp} placeholder="Nome" /></div>
                }
                <div><label style={{fontSize:10,color:"var(--text-3)",display:"block",marginBottom:2}}>Qtà</label>
                  <input type="number" min={1} value={nuovaRiga.quantita} onChange={e=>setNuovaRiga(p=>({...p,quantita:e.target.value}))} style={st.inp} /></div>
                <div><label style={{fontSize:10,color:"var(--text-3)",display:"block",marginBottom:2}}>€ unitario</label>
                  <input type="number" min={0} step="0.01" value={nuovaRiga.prezzo_unitario} onChange={e=>setNuovaRiga(p=>({...p,prezzo_unitario:e.target.value}))} style={st.inp} placeholder="0.00" /></div>
                <div><label style={{fontSize:10,color:"transparent",display:"block",marginBottom:2}}>.</label>
                  <button onClick={aggiungiRiga} disabled={!nuovaRiga.ricambio_id && !nuovaRiga.nome_libero.trim()}
                    style={{padding:"7px 14px",background:"var(--amber)",color:"#0D1B2A",border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Aggiungi</button></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:"14px 24px",borderTop:"1px solid var(--border)",display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 20px",border:"1px solid var(--border)",borderRadius:6,background:"var(--surface)",cursor:"pointer",fontSize:13}}>Annulla</button>
          <button onClick={salva} disabled={saving||!f.fornitore.trim()||!f.righe.length}
            style={{padding:"8px 24px",background:"#059669",color:"white",border:"none",borderRadius:6,fontWeight:700,fontSize:13,cursor:"pointer",opacity:(!f.fornitore.trim()||!f.righe.length)?.5:1}}>
            {saving?"Salvataggio...":"💾 Salva ordine"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lista ordini di acquisto ──────────────────────────────────────────────
export function OrdiniAcquisto({ tenantId, ricambi=[], meOperatore }) {
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOrdine, setEditOrdine] = useState(null);
  const [filtroStato, setFiltroStato] = useState("tutti");

  useEffect(() => { carica(); }, [tenantId]);

  const carica = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ordini_acquisto")
      .select("*, ordini_acquisto_righe(*)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setOrdini((data||[]).map(o => ({ ...o, righe: o.ordini_acquisto_righe||[] })));
    setLoading(false);
  };

  const salvaOrdine = async (f) => {
    const { righe, ...ordineData } = f;
    if (f.id) {
      // Update
      await supabase.from("ordini_acquisto").update({ ...ordineData, totale:f.totale, updated_at:new Date().toISOString() }).eq("id",f.id);
      await supabase.from("ordini_acquisto_righe").delete().eq("ordine_id",f.id);
    } else {
      const num = `OA-${new Date().getFullYear()}-${String(ordini.length+1).padStart(3,"0")}`;
      const { data } = await supabase.from("ordini_acquisto").insert({
        tenant_id: tenantId, fornitore: f.fornitore, stato:"bozza",
        note: f.note, data_ordine: f.data_ordine, data_attesa: f.data_attesa,
        totale: f.totale, numero: num, created_by: meOperatore?.id||null,
      }).select().single();
      f.id = data?.id;
    }
    if (f.id && righe.length) {
      await supabase.from("ordini_acquisto_righe").insert(righe.map(r => ({
        ordine_id: f.id, ricambio_id: r.ricambio_id||null,
        nome_libero: r.nome_libero||null, quantita: r.quantita,
        prezzo_unitario: r.prezzo_unitario||0, note: r.note||null,
      })));
    }
    carica();
  };

  const cambiaStato = async (id, stato) => {
    await supabase.from("ordini_acquisto").update({ stato, updated_at:new Date().toISOString() }).eq("id",id);
    setOrdini(p => p.map(o => o.id===id ? {...o,stato} : o));
    // Se ricevuto, aggiorna stock ricambi
    if (stato === "ricevuto") {
      const ordine = ordini.find(o=>o.id===id);
      if (ordine?.righe) {
        for (const r of ordine.righe) {
          if (r.ricambio_id) {
            await supabase.from("ricambi").rpc ? null : null;
            // Incrementa stock
            const { data: rc } = await supabase.from("ricambi").select("quantita_stock").eq("id",r.ricambio_id).single();
            if (rc) await supabase.from("ricambi").update({ quantita_stock: (rc.quantita_stock||0)+r.quantita }).eq("id",r.ricambio_id);
          }
        }
      }
    }
  };

  const filtrati = filtroStato==="tutti" ? ordini : ordini.filter(o=>o.stato===filtroStato);

  const st = {
    card: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"14px 16px", marginBottom:8 },
    badge: (s) => ({ ...STATO_STYLE[s], padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, border:"1px solid transparent" }),
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{fontWeight:700,fontSize:14}}>📦 Ordini di acquisto ({ordini.length})</div>
          <div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>Gestisci riordini ricambi e materiali</div>
        </div>
        <button onClick={()=>{setEditOrdine(null);setShowModal(true);}}
          style={{padding:"8px 16px",background:"var(--amber)",color:"#0D1B2A",border:"none",borderRadius:6,fontWeight:700,fontSize:13,cursor:"pointer"}}>
          + Nuovo ordine
        </button>
      </div>

      {/* Filtri stato */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["tutti",...Object.keys(STATO_STYLE)].map(s=>(
          <button key={s} onClick={()=>setFiltroStato(s)}
            style={{padding:"4px 12px",borderRadius:99,border:"1px solid",fontSize:12,cursor:"pointer",fontWeight:filtroStato===s?700:400,
              borderColor:filtroStato===s?"var(--amber)":"var(--border)",background:filtroStato===s?"var(--amber)22":"var(--surface)"}}>
            {s==="tutti"?"Tutti":STATO_STYLE[s].label}
          </button>
        ))}
      </div>

      {loading && <div style={{color:"var(--text-3)",fontSize:13}}>Caricamento...</div>}
      {!loading && filtrati.length===0 && (
        <div style={{textAlign:"center",padding:"32px 0",color:"var(--text-3)",fontSize:13}}>
          {filtroStato==="tutti"?"Nessun ordine ancora. Crea il primo!":"Nessun ordine con questo stato."}
        </div>
      )}

      {filtrati.map(o => {
        const ss = STATO_STYLE[o.stato]||STATO_STYLE.bozza;
        return (
          <div key={o.id} style={st.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                  <span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:13}}>{o.numero||"—"}</span>
                  <span style={{...ss,padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700}}>{ss.label}</span>
                  {o.data_attesa && new Date(o.data_attesa) < new Date() && o.stato!=="ricevuto" && (
                    <span style={{fontSize:10,color:"#DC2626",fontWeight:700}}>⚠ Consegna in ritardo</span>
                  )}
                </div>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>🏭 {o.fornitore}</div>
                <div style={{fontSize:12,color:"var(--text-3)"}}>
                  {o.righe.length} articoli · Totale: <strong style={{color:"var(--amber)"}}>{fmtEuro(o.totale)}</strong>
                  {o.data_ordine && ` · Ordinato il ${fmtData(o.data_ordine)}`}
                  {o.data_attesa && ` · Atteso il ${fmtData(o.data_attesa)}`}
                </div>
                {o.note && <div style={{fontSize:11,color:"var(--text-3)",marginTop:3,fontStyle:"italic"}}>{o.note}</div>}
              </div>

              <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
                {o.stato==="bozza" && <>
                  <button onClick={()=>{setEditOrdine({...o});setShowModal(true);}} style={{padding:"5px 10px",border:"1px solid var(--border)",borderRadius:5,fontSize:11,cursor:"pointer",background:"var(--surface)"}}>✏ Modifica</button>
                  <button onClick={()=>cambiaStato(o.id,"inviato")} style={{padding:"5px 10px",background:"#1D4ED8",color:"white",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>📤 Invia</button>
                </>}
                {o.stato==="inviato" && <button onClick={()=>cambiaStato(o.id,"confermato")} style={{padding:"5px 10px",background:"#D97706",color:"white",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>✓ Confermato</button>}
                {o.stato==="confermato" && <button onClick={()=>cambiaStato(o.id,"ricevuto")} style={{padding:"5px 10px",background:"#059669",color:"white",border:"none",borderRadius:5,fontSize:11,cursor:"pointer",fontWeight:600}}>📦 Ricevuto</button>}
                {(o.stato==="bozza"||o.stato==="inviato") && <button onClick={()=>cambiaStato(o.id,"annullato")} style={{padding:"5px 10px",background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA",borderRadius:5,fontSize:11,cursor:"pointer"}}>✕ Annulla</button>}
              </div>
            </div>
          </div>
        );
      })}

      {showModal && (
        <ModalOrdine ini={editOrdine} ricambi={ricambi} tenantId={tenantId} meOperatore={meOperatore}
          onClose={()=>{setShowModal(false);setEditOrdine(null);}} onSalva={salvaOrdine} />
      )}
    </div>
  );
}
