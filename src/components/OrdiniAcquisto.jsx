import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabase";

const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const fmtEuro = v => v != null && v !== "" ? `€${Number(v).toFixed(2)}` : "—";

const STATI = {
  bozza:      { col:"#5A7090", bg:"rgba(90,112,144,.12)",  bd:"rgba(90,112,144,.3)",  l:"Bozza" },
  inviato:    { col:"#4488FF", bg:"rgba(68,136,255,.1)",   bd:"rgba(68,136,255,.3)",  l:"Inviato" },
  confermato: { col:"#FFAB00", bg:"rgba(255,171,0,.1)",    bd:"rgba(255,171,0,.3)",   l:"Confermato" },
  ricevuto:   { col:"#00E5A0", bg:"rgba(0,229,160,.1)",    bd:"rgba(0,229,160,.3)",   l:"Ricevuto ✓" },
  annullato:  { col:"#FF4060", bg:"rgba(255,64,96,.1)",    bd:"rgba(255,64,96,.3)",   l:"Annullato" },
};

// ─── Utility styles ────────────────────────────────────────────────────────
const inp = {
  padding:"8px 11px", border:"1px solid var(--border)",
  borderRadius:"var(--radius-sm)", fontSize:13, width:"100%",
  background:"rgba(4,9,18,.8)", color:"var(--text-1)", boxSizing:"border-box",
};
const lbl = { fontSize:10, fontWeight:700, color:"var(--text-3)", display:"block", marginBottom:5, letterSpacing:".06em", textTransform:"uppercase" };

// ─── Anagrafica Fornitori ──────────────────────────────────────────────────
function GestioneFornitori({ tenantId, onBack }) {
  const [fornitori, setFornitori] = useState([]);
  const [form, setForm]           = useState(null); // null | {} | {id,...}
  const [saving, setSaving]       = useState(false);

  const carica = useCallback(async () => {
    const { data } = await supabase.from("fornitori_acquisto")
      .select("*").eq("tenant_id", tenantId).order("nome");
    setFornitori(data || []);
  }, [tenantId]);

  useEffect(() => { if (tenantId) carica(); }, [carica]);

  const vuoto = { nome:"", codice:"", piva:"", email:"", tel:"", indirizzo:"", note:"" };

  const salva = async () => {
    if (!form?.nome?.trim()) return;
    setSaving(true);
    try {
      if (form.id) {
        await supabase.from("fornitori_acquisto").update({
          nome:form.nome, codice:form.codice||null, piva:form.piva||null,
          email:form.email||null, tel:form.tel||null, indirizzo:form.indirizzo||null, note:form.note||null,
        }).eq("id", form.id).eq("tenant_id", tenantId);
      } else {
        await supabase.from("fornitori_acquisto").insert({
          ...vuoto, ...form, tenant_id: tenantId,
        });
      }
      setForm(null);
      carica();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const elimina = async (id) => {
    await supabase.from("fornitori_acquisto").delete().eq("id",id).eq("tenant_id",tenantId);
    setFornitori(p=>p.filter(f=>f.id!==id));
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onBack} className="btn-ghost" style={{padding:"6px 12px",fontSize:12}}>← Ordini</button>
        <div>
          <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16,color:"var(--white)",letterSpacing:".06em",textTransform:"uppercase"}}>
            🏭 Anagrafica Fornitori
          </div>
          <div style={{fontSize:11,color:"var(--text-3)",marginTop:2,fontFamily:"var(--font-mono)"}}>
            {fornitori.length} fornitori registrati
          </div>
        </div>
        <div style={{marginLeft:"auto"}}>
          <button onClick={()=>setForm(vuoto)} className="btn-primary">+ Nuovo fornitore</button>
        </div>
      </div>

      {/* Lista */}
      <div style={{display:"grid",gap:8}}>
        {fornitori.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🏭</div>
            <div className="empty-text">Nessun fornitore. Aggiungine uno per usarlo negli ordini.</div>
          </div>
        )}
        {fornitori.map(f => (
          <div key={f.id} style={{
            background:"rgba(7,12,24,.8)", border:"1px solid var(--border)",
            borderRadius:"var(--radius)", padding:"14px 16px",
            display:"flex", alignItems:"flex-start", gap:12,
            backdropFilter:"blur(8px)",
          }}>
            <div style={{
              width:38, height:38, borderRadius:"var(--radius-sm)",
              background:"rgba(255,171,0,.08)", border:"1px solid var(--border)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0,
            }}>🏭</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,color:"var(--white)",marginBottom:3}}>
                {f.nome}
                {f.codice && <span style={{fontSize:10,color:"var(--text-3)",marginLeft:8,fontFamily:"var(--font-mono)"}}>{f.codice}</span>}
              </div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:12,color:"var(--text-3)"}}>
                {f.piva     && <span>P.IVA: {f.piva}</span>}
                {f.email    && <span>✉ {f.email}</span>}
                {f.tel      && <span>📞 {f.tel}</span>}
                {f.indirizzo&& <span>📍 {f.indirizzo}</span>}
              </div>
              {f.note && <div style={{fontSize:11,color:"var(--text-3)",marginTop:4,fontStyle:"italic"}}>{f.note}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>setForm({...f})} className="btn-sm btn-icon">✏</button>
              <button onClick={()=>elimina(f.id)} className="btn-sm btn-icon btn-danger">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal form fornitore */}
      {form && (
        <div style={{position:"fixed",inset:0,background:"rgba(4,9,18,.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>
          <div style={{background:"rgba(8,15,30,.97)",border:"1px solid var(--border)",borderRadius:"var(--radius-xl)",width:"min(500px,96vw)",boxShadow:"0 24px 80px rgba(0,0,0,.8)"}}>
            <div style={{padding:"18px 24px 14px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:14,color:"var(--white)",letterSpacing:".06em",textTransform:"uppercase"}}>
                {form.id ? "Modifica Fornitore" : "Nuovo Fornitore"}
              </span>
              <button onClick={()=>setForm(null)} className="modal-close">✕</button>
            </div>
            <div style={{padding:"20px 24px",display:"grid",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
                <div><label style={lbl}>Nome *</label>
                  <input style={inp} value={form.nome||""} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Ragione sociale" /></div>
                <div><label style={lbl}>Codice</label>
                  <input style={inp} value={form.codice||""} onChange={e=>setForm(p=>({...p,codice:e.target.value}))} placeholder="Codice interno" /></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
                <div><label style={lbl}>P.IVA</label>
                  <input style={inp} value={form.piva||""} onChange={e=>setForm(p=>({...p,piva:e.target.value}))} placeholder="IT12345678901" /></div>
                <div><label style={lbl}>Telefono</label>
                  <input style={inp} value={form.tel||""} onChange={e=>setForm(p=>({...p,tel:e.target.value}))} placeholder="+39..." /></div>
              </div>
              <div><label style={lbl}>Email</label>
                <input style={inp} type="email" value={form.email||""} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="ordini@fornitore.it" /></div>
              <div><label style={lbl}>Indirizzo</label>
                <input style={inp} value={form.indirizzo||""} onChange={e=>setForm(p=>({...p,indirizzo:e.target.value}))} placeholder="Via, Città" /></div>
              <div><label style={lbl}>Note</label>
                <textarea style={{...inp,resize:"vertical"}} rows={2} value={form.note||""} onChange={e=>setForm(p=>({...p,note:e.target.value}))} /></div>
            </div>
            <div style={{padding:"0 24px 20px",borderTop:"1px solid var(--border)",paddingTop:14,display:"flex",justifyContent:"space-between",gap:10}}>
              <button onClick={()=>setForm(null)} className="btn-ghost">Annulla</button>
              <button onClick={salva} disabled={!form?.nome?.trim()||saving} className="btn-primary">
                {saving ? "Salvataggio..." : form.id ? "Salva modifiche" : "Aggiungi fornitore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal nuovo/modifica ordine ───────────────────────────────────────────
function ModalOrdine({ ini, ricambi=[], fornitori=[], tenantId, meOperatore, onClose, onSalva }) {
  const vuoto = {
    fornitore_id: "", fornitore_libero: "",
    note: "", data_ordine: new Date().toISOString().split("T")[0],
    data_attesa: "", righe: [],
  };
  const [f, sf]         = useState(ini ? {...ini, righe: ini.righe||[]} : vuoto);
  const [saving, setSaving] = useState(false);
  const [cerca, setCerca]   = useState("");
  const [tab, setTab]       = useState("catalogo"); // catalogo | libero

  // Articoli filtrati dal catalogo
  const ricambiFiltrati = useMemo(() => {
    if (!cerca.trim()) return ricambi.slice(0, 50);
    const q = cerca.toLowerCase();
    return ricambi.filter(r =>
      r.nome?.toLowerCase().includes(q) ||
      r.codice?.toLowerCase().includes(q) ||
      r.categoria?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [ricambi, cerca]);

  // Stato riga libera
  const [rigaLibera, setRigaLibera] = useState({ nome:"", codice:"", quantita:1, prezzo_unitario:"", note:"" });

  const totale = f.righe.reduce((s,r) => s + (r.quantita||1)*(r.prezzo_unitario||0), 0);

  // Aggiungi dal catalogo
  const aggiungiDaCatalogo = (rc) => {
    // Se già presente, incrementa quantità
    const idx = f.righe.findIndex(r => r.ricambio_id === rc.id);
    if (idx >= 0) {
      sf(p => ({ ...p, righe: p.righe.map((r,i) => i===idx ? {...r, quantita: r.quantita+1} : r) }));
    } else {
      sf(p => ({ ...p, righe: [...p.righe, {
        _tmp: Date.now(), ricambio_id: rc.id,
        nome_display: rc.nome, codice: rc.codice||"",
        quantita: 1, prezzo_unitario: rc.prezzo||0, note:"",
      }]}));
    }
  };

  // Aggiungi riga libera
  const aggiungiLibera = () => {
    if (!rigaLibera.nome.trim()) return;
    sf(p => ({ ...p, righe: [...p.righe, {
      _tmp: Date.now(), ricambio_id: null,
      nome_display: rigaLibera.nome, codice: rigaLibera.codice||"",
      quantita: Number(rigaLibera.quantita)||1,
      prezzo_unitario: rigaLibera.prezzo_unitario ? Number(rigaLibera.prezzo_unitario) : 0,
      note: rigaLibera.note,
    }]}));
    setRigaLibera({ nome:"", codice:"", quantita:1, prezzo_unitario:"", note:"" });
  };

  const nomeFornit = (() => {
    if (f.fornitore_id) return fornitori.find(x=>String(x.id)===String(f.fornitore_id))?.nome || "";
    return f.fornitore_libero || "";
  })();

  const salva = async () => {
    if ((!f.fornitore_id && !f.fornitore_libero?.trim()) || !f.righe.length) return;
    setSaving(true);
    try {
      await onSalva({ ...f, totale, fornitore: nomeFornit });
      onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(4,9,18,.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)",padding:"20px"}}>
      <div style={{
        background:"rgba(8,15,30,.97)",border:"1px solid var(--border)",
        borderRadius:"var(--radius-xl)",width:"min(860px,98vw)",maxHeight:"92vh", maxWidth:"min(860px, 100vw)",
        overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.9)",
        display:"flex",flexDirection:"column",
      }}>
        {/* Header */}
        <div style={{padding:"18px 24px 14px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:15,color:"var(--white)",letterSpacing:".06em",textTransform:"uppercase"}}>
            {ini ? "Modifica Ordine" : "📦 Nuovo Ordine di Acquisto"}
          </span>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(300px, 100%), 1fr))",flex:1,overflow:"hidden",minHeight:0,maxHeight:"calc(90vh - 120px)"}}>
          {/* Colonna sinistra: form + lista righe */}
          <div style={{padding:"20px 20px 0",display:"flex",flexDirection:"column",gap:14,overflow:"auto",borderRight:"1px solid var(--border)"}}>
            {/* Fornitore */}
            <div>
              <label style={lbl}>Fornitore *</label>
              {fornitori.length > 0 ? (
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,alignItems:"end"}}>
                  <select style={inp} value={f.fornitore_id||""} onChange={e=>sf(p=>({...p,fornitore_id:e.target.value,fornitore_libero:""}))}>
                    <option value="">— Seleziona dal registro —</option>
                    {fornitori.map(fo=><option key={fo.id} value={String(fo.id)}>{fo.nome}{fo.codice?` [${fo.codice}]`:""}</option>)}
                    <option value="__libero">+ Inserisci manualmente</option>
                  </select>
                  {(f.fornitore_id===("__libero")||!f.fornitore_id) && (
                    <input style={{...inp,minWidth:160}} value={f.fornitore_libero||""} onChange={e=>sf(p=>({...p,fornitore_libero:e.target.value}))} placeholder="Nome fornitore" />
                  )}
                </div>
              ) : (
                <input style={inp} value={f.fornitore_libero||f.fornitore||""} onChange={e=>sf(p=>({...p,fornitore_libero:e.target.value}))} placeholder="Nome fornitore" />
              )}
              {f.fornitore_id && f.fornitore_id!=="__libero" && (() => {
                const fo = fornitori.find(x=>String(x.id)===String(f.fornitore_id));
                return fo ? (
                  <div style={{marginTop:6,padding:"8px 10px",background:"rgba(255,171,0,.04)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:12,color:"var(--text-3)",display:"flex",gap:12}}>
                    {fo.email && <span>✉ {fo.email}</span>}
                    {fo.tel   && <span>📞 {fo.tel}</span>}
                    {fo.piva  && <span>P.IVA: {fo.piva}</span>}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Date */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12}}>
              <div><label style={lbl}>Data ordine</label>
                <input type="date" style={inp} value={f.data_ordine||""} onChange={e=>sf(p=>({...p,data_ordine:e.target.value}))} /></div>
              <div><label style={lbl}>Data attesa consegna</label>
                <input type="date" style={inp} value={f.data_attesa||""} onChange={e=>sf(p=>({...p,data_attesa:e.target.value}))} /></div>
            </div>

            <div><label style={lbl}>Note ordine</label>
              <textarea style={{...inp,resize:"vertical"}} rows={2} value={f.note||""} onChange={e=>sf(p=>({...p,note:e.target.value}))} placeholder="Istruzioni di consegna, riferimenti..." /></div>

            {/* Righe ordine */}
            <div>
              <div style={{fontFamily:"var(--font-head)",fontSize:11,fontWeight:700,color:"var(--text-3)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>
                Articoli ({f.righe.length})
              </div>
              {f.righe.length === 0 && (
                <div style={{padding:"16px",textAlign:"center",border:"1px dashed var(--border)",borderRadius:"var(--radius-sm)",color:"var(--text-3)",fontSize:12}}>
                  Aggiungi articoli dal catalogo o manualmente →
                </div>
              )}
              {f.righe.length > 0 && (
                <div style={{border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"rgba(255,171,0,.05)"}}>
                        {["Articolo","Cod.","Qtà","€ unit","Totale",""].map(h=>(
                          <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text-3)",letterSpacing:".06em",textTransform:"uppercase",borderBottom:"1px solid var(--border)"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {f.righe.map((r,i) => (
                        <tr key={r._tmp||r.id||i} style={{borderBottom:"1px solid var(--border-dim)"}}>
                          <td style={{padding:"8px 10px"}}>
                            <div style={{fontWeight:600,color:"var(--text-1)"}}>{r.nome_display||r.nome_libero||r.descrizione}</div>
                            {r.ricambio_id && <div style={{fontSize:9,color:"var(--text-3)",fontFamily:"var(--font-mono)"}}>catalogo</div>}
                          </td>
                          <td style={{padding:"8px 10px",color:"var(--text-3)",fontFamily:"var(--font-mono)",fontSize:11}}>{r.codice||"—"}</td>
                          <td style={{padding:"8px 10px"}}>
                            <input type="number" min={1} value={r.quantita}
                              onChange={e=>sf(p=>({...p,righe:p.righe.map((x,j)=>j===i?{...x,quantita:Number(e.target.value)||1}:x)}))}
                              style={{...inp,width:56,padding:"4px 6px",textAlign:"center"}} />
                          </td>
                          <td style={{padding:"8px 10px"}}>
                            <input type="number" min={0} step="0.01" value={r.prezzo_unitario}
                              onChange={e=>sf(p=>({...p,righe:p.righe.map((x,j)=>j===i?{...x,prezzo_unitario:Number(e.target.value)||0}:x)}))}
                              style={{...inp,width:80,padding:"4px 6px",textAlign:"right"}} />
                          </td>
                          <td style={{padding:"8px 10px",fontFamily:"var(--font-mono)",fontWeight:700,color:"var(--amber)",fontSize:13}}>
                            {fmtEuro((r.quantita||1)*(r.prezzo_unitario||0))}
                          </td>
                          <td style={{padding:"8px 10px",textAlign:"center"}}>
                            <button onClick={()=>sf(p=>({...p,righe:p.righe.filter((_,j)=>j!==i)}))}
                              style={{background:"var(--red-bg)",border:"1px solid var(--red-bd)",color:"var(--red)",borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11}}>✕</button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={4} style={{padding:"10px",textAlign:"right",fontFamily:"var(--font-head)",fontWeight:700,color:"var(--text-2)",fontSize:11,letterSpacing:".06em",textTransform:"uppercase"}}>TOTALE ORDINE</td>
                        <td style={{padding:"10px",fontFamily:"var(--font-mono)",fontWeight:700,fontSize:16,color:"var(--amber)",textShadow:"0 0 16px rgba(255,171,0,.5)"}}>
                          {fmtEuro(totale)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Colonna destra: aggiungi articoli */}
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Tab catalogo / libero */}
            <div style={{display:"flex",borderBottom:"1px solid var(--border)",flexShrink:0}}>
              {["catalogo","libero"].map(t => (
                <button key={t} onClick={()=>setTab(t)}
                  style={{flex:1,padding:"12px",border:"none",borderBottom:`2px solid ${tab===t?"var(--amber)":"transparent"}`,
                    background:"transparent",color:tab===t?"var(--amber)":"var(--text-3)",
                    fontFamily:"var(--font-head)",fontWeight:700,fontSize:11,letterSpacing:".06em",
                    textTransform:"uppercase",cursor:"pointer",transition:"all .15s"}}>
                  {t === "catalogo" ? "📋 Catalogo" : "✏ Inserimento libero"}
                </button>
              ))}
            </div>

            {/* Tab: Catalogo articoli */}
            {tab === "catalogo" && (
              <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
                  <input style={{...inp,fontSize:12}} value={cerca} onChange={e=>setCerca(e.target.value)}
                    placeholder="🔍 Cerca articolo per nome o codice..." />
                </div>
                {ricambi.length === 0 ? (
                  <div style={{padding:"24px",textAlign:"center",color:"var(--text-3)",fontSize:12}}>
                    Nessun articolo nel catalogo.<br/>
                    <span style={{fontSize:11}}>Aggiungi ricambi nella sezione "Ricambi"</span>
                  </div>
                ) : (
                  <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
                    {ricambiFiltrati.map(rc => {
                      const inOrdine = f.righe.find(r=>r.ricambio_id===rc.id);
                      return (
                        <div key={rc.id}
                          onClick={()=>aggiungiDaCatalogo(rc)}
                          style={{
                            display:"flex",alignItems:"center",gap:10,padding:"9px 10px",
                            borderRadius:"var(--radius-sm)",cursor:"pointer",marginBottom:2,
                            background: inOrdine ? "rgba(255,171,0,.08)" : "transparent",
                            border: inOrdine ? "1px solid rgba(255,171,0,.2)" : "1px solid transparent",
                            transition:"all .12s",
                          }}
                          onMouseEnter={e=>{ if(!inOrdine) e.currentTarget.style.background="rgba(255,255,255,.04)"; }}
                          onMouseLeave={e=>{ if(!inOrdine) e.currentTarget.style.background="transparent"; }}
                        >
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:"var(--text-1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {rc.nome}
                            </div>
                            <div style={{fontSize:10,color:"var(--text-3)",display:"flex",gap:8,marginTop:1}}>
                              {rc.codice && <span style={{fontFamily:"var(--font-mono)"}}>{rc.codice}</span>}
                              {rc.categoria && <span>{rc.categoria}</span>}
                              {rc.unita && <span>{rc.unita}</span>}
                            </div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--amber)",fontWeight:700}}>
                              {rc.prezzo ? fmtEuro(rc.prezzo) : "—"}
                            </div>
                            {inOrdine && (
                              <div style={{fontSize:10,color:"var(--amber)",fontWeight:700}}>×{inOrdine.quantita}</div>
                            )}
                          </div>
                          <div style={{
                            width:22,height:22,borderRadius:"50%",flexShrink:0,
                            background: inOrdine ? "var(--amber)" : "rgba(255,171,0,.1)",
                            border: "1px solid rgba(255,171,0,.3)",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:12,fontWeight:700,color: inOrdine ? "#040912" : "var(--amber)",
                          }}>
                            {inOrdine ? "✓" : "+"}
                          </div>
                        </div>
                      );
                    })}
                    {ricambi.length > 50 && !cerca && (
                      <div style={{padding:"8px",textAlign:"center",fontSize:11,color:"var(--text-3)"}}>
                        Cerca per filtrare i {ricambi.length} articoli
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Inserimento libero */}
            {tab === "libero" && (
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:11,color:"var(--text-3)",fontFamily:"var(--font-mono)"}}>
                  Aggiungi un articolo non presente nel catalogo
                </div>
                <div><label style={lbl}>Nome articolo *</label>
                  <input style={inp} value={rigaLibera.nome} onChange={e=>setRigaLibera(p=>({...p,nome:e.target.value}))} placeholder="Descrizione articolo" /></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:8}}>
                  <div><label style={lbl}>Codice / Riferimento</label>
                    <input style={inp} value={rigaLibera.codice} onChange={e=>setRigaLibera(p=>({...p,codice:e.target.value}))} placeholder="ART-001" /></div>
                  <div><label style={lbl}>Quantità</label>
                    <input type="number" min={1} style={inp} value={rigaLibera.quantita} onChange={e=>setRigaLibera(p=>({...p,quantita:e.target.value}))} /></div>
                </div>
                <div><label style={lbl}>Prezzo unitario (€)</label>
                  <input type="number" min={0} step="0.01" style={inp} value={rigaLibera.prezzo_unitario} onChange={e=>setRigaLibera(p=>({...p,prezzo_unitario:e.target.value}))} placeholder="0.00" /></div>
                <div><label style={lbl}>Note</label>
                  <input style={inp} value={rigaLibera.note} onChange={e=>setRigaLibera(p=>({...p,note:e.target.value}))} placeholder="Specifiche, variante..." /></div>
                <button onClick={aggiungiLibera} disabled={!rigaLibera.nome.trim()} className="btn-primary"
                  style={{marginTop:4}}>
                  + Aggiungi alla lista
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",gap:10,flexShrink:0}}>
          <div style={{fontSize:12,color:"var(--text-3)"}}>
            {f.righe.length} articoli · <span style={{color:"var(--amber)",fontFamily:"var(--font-mono)",fontWeight:700}}>{fmtEuro(totale)}</span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} className="btn-ghost">Annulla</button>
            <button onClick={salva}
              disabled={saving || (!f.fornitore_id && !f.fornitore_libero?.trim() && !f.fornitore?.trim()) || !f.righe.length}
              className="btn-primary">
              {saving ? "Salvataggio..." : ini ? "💾 Salva modifiche" : "💾 Crea ordine"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vista principale Ordini di Acquisto ───────────────────────────────────
export function OrdiniAcquisto({ tenantId, ricambi: ricambiProp=[], meOperatore }) {
  const [ordini,    setOrdini]    = useState([]);
  const [ricambi,   setRicambi]   = useState([]);
  const [fornitori, setFornitori] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | {} | ordine
  const [vista,     setVista]     = useState("ordini"); // ordini | fornitori
  const [fStato,    setFStato]    = useState("tutti");

  const carica = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [{ data: ordiniData }, { data: ricambiData }, { data: fornitoriData }] = await Promise.all([
        supabase.from("ordini_acquisto")
          .select("*, ordini_acquisto_righe(*)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase.from("ricambi")
          .select("id,nome,codice,categoria,prezzo,unita,quantita_stock")
          .eq("tenant_id", tenantId)
          .order("nome"),
        supabase.from("fornitori_acquisto")
          .select("*").eq("tenant_id", tenantId).order("nome"),
      ]);
      setOrdini((ordiniData||[]).map(o=>({...o,righe:o.ordini_acquisto_righe||[]})));
      setRicambi(ricambiData||[]);
      setFornitori(fornitoriData||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { carica(); }, [carica]);

  const salvaOrdine = async (f) => {
    const { righe, ...body } = f;
    try {
      let ordineId = f.id;
      if (f.id) {
        await supabase.from("ordini_acquisto")
          .update({ fornitore:f.fornitore, note:f.note, data_ordine:f.data_ordine, data_attesa:f.data_attesa, totale:f.totale, updated_at:new Date().toISOString() })
          .eq("id", f.id).eq("tenant_id", tenantId);
        await supabase.from("ordini_acquisto_righe").delete().eq("ordine_id", f.id);
      } else {
        const yr = new Date().getFullYear();
        const ts = Date.now().toString(36).toUpperCase().slice(-5);
        const numero = `OA-${yr}-${ts}`;
        const { data } = await supabase.from("ordini_acquisto").insert({
          tenant_id: tenantId, fornitore: f.fornitore, stato: "bozza",
          note: f.note||null, data_ordine: f.data_ordine, data_attesa: f.data_attesa||null,
          totale: f.totale, numero, created_by: meOperatore?.id||null,
        }).select().single();
        ordineId = data?.id;
      }
      if (ordineId && righe.length) {
        await supabase.from("ordini_acquisto_righe").insert(righe.map(r => ({
          ordine_id: ordineId,
          ricambio_id: r.ricambio_id||null,
          nome_libero: r.nome_display||r.nome_libero||null,
          codice: r.codice||null,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario||0,
          note: r.note||null,
          tenant_id: tenantId,
        })));
      }
      carica();
    } catch(e) { console.error(e); throw e; }
  };

  const cambiaStato = async (id, stato) => {
    try {
      await supabase.from("ordini_acquisto")
        .update({ stato, updated_at: new Date().toISOString() })
        .eq("id", id).eq("tenant_id", tenantId);
      setOrdini(p=>p.map(o=>o.id===id?{...o,stato}:o));
      // Se ricevuto → aggiorna stock ricambi
      if (stato === "ricevuto") {
        const ordine = ordini.find(o=>o.id===id);
        for (const r of ordine?.righe||[]) {
          if (r.ricambio_id) {
            const { data: rc } = await supabase.from("ricambi")
              .select("quantita_stock").eq("id",r.ricambio_id).single();
            if (rc) await supabase.from("ricambi")
              .update({ quantita_stock: (rc.quantita_stock||0)+r.quantita })
              .eq("id",r.ricambio_id);
          }
        }
      }
    } catch(e) { console.error(e); }
  };

  const filtrati = fStato==="tutti" ? ordini : ordini.filter(o=>o.stato===fStato);

  // KPI
  const kpi = useMemo(()=>({
    totali:    ordini.length,
    inCorso:   ordini.filter(o=>["inviato","confermato"].includes(o.stato)).length,
    attesi:    ordini.filter(o=>o.stato==="confermato"&&o.data_attesa&&new Date(o.data_attesa)<new Date()).length,
    spesa:     ordini.filter(o=>o.stato!=="annullato").reduce((s,o)=>s+(o.totale||0),0),
  }),[ordini]);

  if (vista === "fornitori") {
    return <GestioneFornitori tenantId={tenantId} onBack={()=>setVista("ordini")} />;
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* KPI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
        {[
          {l:"Ordini totali", v:kpi.totali,  col:"var(--text-2)", icon:"📦"},
          {l:"In corso",      v:kpi.inCorso,  col:"var(--amber)",  icon:"🔄"},
          {l:"In ritardo",    v:kpi.attesi,   col:kpi.attesi>0?"var(--red)":"var(--green)", icon:"⚠"},
          {l:"Spesa totale",  v:fmtEuro(kpi.spesa), col:"var(--amber)", icon:"💶", mono:true},
        ].map(k=>(
          <div key={k.l} className="kpi-card" style={{"--c":k.col}}>
            <div style={{fontSize:16,marginBottom:6}}>{k.icon}</div>
            <div className="kpi-value" style={k.mono?{fontSize:18}:{}}>{k.v}</div>
            <div className="kpi-label">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Filtri + azioni */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {["tutti",...Object.keys(STATI)].map(s=>(
            <button key={s} onClick={()=>setFStato(s)}
              style={{padding:"5px 12px",borderRadius:99,fontSize:11,fontWeight:700,cursor:"pointer",
                fontFamily:"var(--font-head)",letterSpacing:".04em",textTransform:"uppercase",
                border:`1px solid ${fStato===s?"var(--amber)":"var(--border)"}`,
                background:fStato===s?"rgba(255,171,0,.12)":"transparent",
                color:fStato===s?"var(--amber)":"var(--text-3)",transition:"all .15s"}}>
              {s==="tutti"?"Tutti":STATI[s].l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={()=>setVista("fornitori")}
            style={{padding:"7px 14px",background:"rgba(255,255,255,.05)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",color:"var(--text-2)",cursor:"pointer",fontSize:12,fontFamily:"var(--font-head)",letterSpacing:".04em",textTransform:"uppercase"}}>
            🏭 Fornitori ({fornitori.length})
          </button>
          <button onClick={()=>setModal({})} className="btn-primary">+ Nuovo ordine</button>
        </div>
      </div>

      {/* Lista ordini */}
      {loading ? (
        <div style={{padding:40,textAlign:"center",color:"var(--text-3)",fontFamily:"var(--font-mono)"}}>Caricamento...</div>
      ) : filtrati.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <div className="empty-text">{ordini.length===0?"Nessun ordine. Crea il primo!":"Nessun ordine con questo stato."}</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtrati.map(o => {
            const ss = STATI[o.stato]||STATI.bozza;
            const ritardo = o.data_attesa && new Date(o.data_attesa)<new Date() && o.stato!=="ricevuto";
            const fo = fornitori.find(x=>x.nome===o.fornitore);
            return (
              <div key={o.id} style={{
                background:"rgba(7,12,24,.8)",border:`1px solid ${ritardo?"var(--red-bd)":"var(--border)"}`,
                borderLeft:`3px solid ${ss.col}`,borderRadius:"var(--radius)",
                padding:"14px 16px",backdropFilter:"blur(8px)",transition:"all .15s",
              }}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:11,fontWeight:700,color:"var(--text-3)"}}>{o.numero||"—"}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                        background:ss.bg,color:ss.col,border:`1px solid ${ss.bd}`,
                        fontFamily:"var(--font-head)",letterSpacing:".04em",textTransform:"uppercase"}}>
                        {ss.l}
                      </span>
                      {ritardo && <span style={{fontSize:10,color:"var(--red)",fontWeight:700,fontFamily:"var(--font-head)"}}>⚠ IN RITARDO</span>}
                    </div>
                    <div style={{fontWeight:700,fontSize:14,color:"var(--white)",marginBottom:3}}>
                      {o.fornitore||"—"}
                      {fo?.email && <span style={{fontSize:11,color:"var(--text-3)",marginLeft:8,fontWeight:400}}>✉ {fo.email}</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--text-3)",display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span>{o.righe.length} articoli</span>
                      <span>Totale: <strong style={{color:"var(--amber)",fontFamily:"var(--font-mono)"}}>{fmtEuro(o.totale)}</strong></span>
                      {o.data_ordine && <span>Ordinato: {fmtData(o.data_ordine)}</span>}
                      {o.data_attesa && <span style={{color:ritardo?"var(--red)":"inherit"}}>Atteso: {fmtData(o.data_attesa)}</span>}
                    </div>
                    {o.note && <div style={{fontSize:11,color:"var(--text-3)",marginTop:3,fontStyle:"italic"}}>{o.note}</div>}
                    {/* Preview righe */}
                    {o.righe.length > 0 && (
                      <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {o.righe.slice(0,4).map((r,i)=>(
                          <span key={i} style={{fontSize:10,padding:"2px 7px",borderRadius:3,background:"rgba(255,171,0,.06)",border:"1px solid var(--border)",color:"var(--text-3)"}}>
                            {r.nome_libero||r.descrizione||r.nome_display} ×{r.quantita}
                          </span>
                        ))}
                        {o.righe.length > 4 && <span style={{fontSize:10,color:"var(--text-3)"}}>+{o.righe.length-4} altri</span>}
                      </div>
                    )}
                  </div>

                  {/* Azioni */}
                  <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
                    {o.stato==="bozza" && <>
                      <button onClick={()=>setModal({...o})} className="btn-sm btn-icon">✏</button>
                      <button onClick={()=>cambiaStato(o.id,"inviato")}
                        style={{padding:"5px 10px",background:"var(--blue-bg)",color:"var(--blue)",border:"1px solid var(--blue-bd)",borderRadius:"var(--radius-sm)",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"var(--font-head)",letterSpacing:".04em",textTransform:"uppercase"}}>
                        📤 Invia
                      </button>
                    </>}
                    {o.stato==="inviato" && (
                      <button onClick={()=>cambiaStato(o.id,"confermato")}
                        style={{padding:"5px 10px",background:"var(--orange-bg)",color:"var(--orange)",border:"1px solid var(--orange-bd)",borderRadius:"var(--radius-sm)",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"var(--font-head)",letterSpacing:".04em",textTransform:"uppercase"}}>
                        ✓ Confermato
                      </button>
                    )}
                    {o.stato==="confermato" && (
                      <button onClick={()=>cambiaStato(o.id,"ricevuto")}
                        style={{padding:"5px 10px",background:"var(--green-bg)",color:"var(--green)",border:"1px solid var(--green-bd)",borderRadius:"var(--radius-sm)",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"var(--font-head)",letterSpacing:".04em",textTransform:"uppercase"}}>
                        📦 Ricevuto
                      </button>
                    )}
                    {["bozza","inviato"].includes(o.stato) && (
                      <button onClick={()=>cambiaStato(o.id,"annullato")} className="btn-sm btn-danger">✕</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ordine */}
      {modal !== null && (
        <ModalOrdine
          ini={modal?.id ? modal : null}
          ricambi={ricambi}
          fornitori={fornitori}
          tenantId={tenantId}
          meOperatore={meOperatore}
          onClose={()=>setModal(null)}
          onSalva={salvaOrdine}
        />
      )}
    </div>
  );
}
