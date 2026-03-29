import React, { useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "../supabase";

// ─── helpers ──────────────────────────────────────────────────────────────
const isoDate  = d => d ? d.toISOString().split("T")[0] : "";
const fmtDate  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
const addDays  = (iso, n) => {
  const d = new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return isoDate(d);
};

const STATI = [
  { v:"bozza",      l:"Bozza",      bg:"#F9FAFB", col:"#374151" },
  { v:"confermato", l:"Confermato", bg:"#EFF6FF", col:"#1E40AF" },
  { v:"in_corso",   l:"In corso",   bg:"#FEF3C7", col:"#92400E" },
  { v:"completato", l:"Completato", bg:"#ECFDF5", col:"#065F46" },
];

// ─── Modale azione bulk ───────────────────────────────────────────────────
function ModalAzioneBulk({ odlSelezionati=[], operatori=[], onClose, onApplica }) {
  const [azione, setAzione] = useState("sposta_giorni");
  const [giorni, setGiorni] = useState(7);
  const [newData, setNewData] = useState("");
  const [newOp,   setNewOp]  = useState("");
  const [newStato,setNewStato]=useState("");
  const [loading, setLoading] = useState(false);

  const fornitori = operatori.filter(o => o.tipo === "fornitore");

  const esegui = async () => {
    setLoading(true);
    const ids = odlSelezionati.map(o => o.id);
    try {
      if (azione === "sposta_giorni") {
        for (const odl of odlSelezionati) {
          const nd = addDays(odl.data_inizio, Number(giorni));
          const nf = odl.data_fine ? addDays(odl.data_fine, Number(giorni)) : nd;
          await supabase.from("ordini_lavoro").update({ data_inizio:nd, data_fine:nf }).eq("tenant_id", tenantId).eq("id", odl.id);
        }
      } else if (azione === "imposta_data") {
        await supabase.from("ordini_lavoro").update({ data_inizio:newData, data_fine:newData }).in("id", ids);
      } else if (azione === "cambia_operatore") {
        await supabase.from("ordini_lavoro").update({ operatore_id: Number(newOp) }).in("id", ids);
      } else if (azione === "cambia_stato") {
        await supabase.from("ordini_lavoro").update({ stato: newStato }).in("id", ids);
      }
      onApplica();
    } catch(e) {
      console.warn("Errore: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const ok = azione==="sposta_giorni" ? giorni!==0
    : azione==="imposta_data" ? !!newData
    : azione==="cambia_operatore" ? !!newOp
    : azione==="cambia_stato" ? !!newStato : false;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(480px,96vw)", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>✏ Modifica bulk</div>
            <div style={{ fontSize:12, color:"var(--text-3)", marginTop:2 }}>
              {odlSelezionati.length} OdL selezionati
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:"var(--text-3)" }}>✕</button>
        </div>

        {/* Selezione azione */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
          {[
            { v:"sposta_giorni",    l:"📅 Sposta di N giorni",  sub:"Aggiusta tutte le date" },
            { v:"imposta_data",     l:"📌 Imposta data fissa",  sub:"Stessa data per tutti" },
            { v:"cambia_operatore", l:"👤 Cambia operatore",    sub:"Riassegna a qualcuno" },
            { v:"cambia_stato",     l:"🔄 Cambia stato",        sub:"Avanza/riporta indietro" },
          ].map(a => (
            <div key={a.v} onClick={()=>setAzione(a.v)} style={{
              padding:"10px 12px", borderRadius:8, cursor:"pointer",
              border:`2px solid ${azione===a.v?"#3B82F6":"var(--border)"}`,
              background: azione===a.v?"#EFF6FF":"var(--surface)",
            }}>
              <div style={{ fontSize:12, fontWeight:700,
                color:azione===a.v?"#1E40AF":"var(--text-1)" }}>{a.l}</div>
              <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>{a.sub}</div>
            </div>
          ))}
        </div>

        {/* Input per l'azione scelta */}
        <div style={{ marginBottom:20 }}>
          {azione === "sposta_giorni" && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
                Giorni da aggiungere (negativo = indietro)
              </label>
              <input type="number" value={giorni} onChange={e=>setGiorni(Number(e.target.value))}
                step={1} style={{ width:"100%" }} placeholder="es. 7 oppure -3" />
              <div style={{ fontSize:11, color:"var(--text-3)", marginTop:6 }}>
                Es. +7 = sposta tutto di una settimana avanti, -7 = indietro
              </div>
            </div>
          )}
          {azione === "imposta_data" && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
                Nuova data inizio per tutti
              </label>
              <input type="date" value={newData} onChange={e=>setNewData(e.target.value)}
                style={{ width:"100%" }} />
            </div>
          )}
          {azione === "cambia_operatore" && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
                Nuovo operatore / fornitore
              </label>
              <select value={newOp} onChange={e=>setNewOp(e.target.value)} style={{ width:"100%" }}>
                <option value="">— Seleziona —</option>
                {fornitori.map(o=>(
                  <option key={o.id} value={String(o.id)}>{o.nome}{o.spec?` · ${o.spec}`:""}</option>
                ))}
              </select>
            </div>
          )}
          {azione === "cambia_stato" && (
            <div>
              <label style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
                Nuovo stato
              </label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {STATI.map(s => (
                  <div key={s.v} onClick={()=>setNewStato(s.v)} style={{
                    padding:"8px 12px", borderRadius:7, cursor:"pointer",
                    background: newStato===s.v ? s.bg : "var(--surface-2)",
                    border:`2px solid ${newStato===s.v?"#3B82F6":"var(--border)"}`,
                    fontWeight: newStato===s.v?700:400, fontSize:13, color:s.col,
                  }}>{s.l}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Riepilogo OdL coinvolti */}
        <div style={{ background:"var(--surface-2)", borderRadius:8, padding:"10px 12px",
          maxHeight:120, overflowY:"auto", marginBottom:18, fontSize:11 }}>
          {odlSelezionati.slice(0,8).map(o=>(
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between",
              padding:"3px 0", borderBottom:"1px solid var(--border-dim)" }}>
              <span style={{ fontWeight:600 }}>{o.numero||`#${o.id}`}</span>
              <span style={{ color:"var(--text-3)" }}>{o.titolo?.slice(0,40)}</span>
              <span style={{ color:"var(--text-3)" }}>{fmtDate(o.data_inizio)}</span>
            </div>
          ))}
          {odlSelezionati.length > 8 && (
            <div style={{ textAlign:"center", color:"var(--text-3)", paddingTop:4 }}>
              +{odlSelezionati.length-8} altri OdL
            </div>
          )}
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={esegui} disabled={!ok||loading} className="btn-primary">
            {loading ? "⏳ Applicazione..." : `✅ Applica a ${odlSelezionati.length} OdL`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modale Filtro+Applica ────────────────────────────────────────────────
function ModalFiltraApplica({ odl=[], operatori=[], clienti=[], tenantId, onClose, onApplica }) {
  // Filtri
  const [fCliente, setFCl]   = useState("tutti");
  const [fOp,      setFOp]   = useState("tutti");
  const [fStato,   setFStato]= useState("tutti");
  const [fMeseDa,  setFMDa]  = useState("");
  const [fMeseA,   setFMA]   = useState("");
  // Azione
  const [azione,   setAzione]   = useState("sposta_giorni");
  const [giorni,   setGiorni]   = useState(7);
  const [newData,  setNewData]  = useState("");
  const [newOp,    setNewOp]    = useState("");
  const [newStato, setNewStato] = useState("");
  const [loading,  setLoading]  = useState(false);

  const fornitori = operatori.filter(o => o.tipo === "fornitore");

  const filtrati = useMemo(() => odl.filter(o => {
    if (fCliente !== "tutti" && String(o.cliente_id) !== fCliente) return false;
    if (fOp !== "tutti" && String(o.operatore_id) !== fOp) return false;
    if (fStato !== "tutti" && o.stato !== fStato) return false;
    if (fMeseDa && o.data_inizio < fMeseDa+"-01") return false;
    if (fMeseA) {
      const fineMese = new Date(fMeseA.slice(0,4), Number(fMeseA.slice(5,7)), 0);
      if (o.data_inizio > isoDate(fineMese)) return false;
    }
    return true;
  }), [odl, fCliente, fOp, fStato, fMeseDa, fMeseA]);

  const clientiUsati = useMemo(() => {
    const ids = [...new Set(odl.map(o=>o.cliente_id).filter(Boolean))];
    return ids.map(id=>clienti.find(c=>c.id===id)).filter(Boolean);
  }, [odl, clienti]);
  const opUsati = useMemo(() => {
    const ids = [...new Set(odl.map(o=>o.operatore_id).filter(Boolean))];
    return ids.map(id=>operatori.find(op=>op.id===id)).filter(Boolean);
  }, [odl, operatori]);

  const okAzione = azione==="sposta_giorni" ? giorni!==0
    : azione==="imposta_data" ? !!newData
    : azione==="cambia_operatore" ? !!newOp
    : azione==="cambia_stato" ? !!newStato : false;

  const esegui = async () => {
    if (!filtrati.length) return;
    setLoading(true);
    try {
      const ids = filtrati.map(o=>o.id);
      if (azione === "sposta_giorni") {
        for (const o of filtrati) {
          const nd = addDays(o.data_inizio, Number(giorni));
          const nf = o.data_fine ? addDays(o.data_fine, Number(giorni)) : nd;
          await supabase.from("ordini_lavoro").update({ data_inizio:nd, data_fine:nf }).eq("tenant_id", tenantId).eq("id", o.id);
        }
      } else if (azione === "imposta_data") {
        await supabase.from("ordini_lavoro").update({ data_inizio:newData, data_fine:newData }).in("id", ids);
      } else if (azione === "cambia_operatore") {
        await supabase.from("ordini_lavoro").update({ operatore_id:Number(newOp) }).in("id", ids);
      } else if (azione === "cambia_stato") {
        await supabase.from("ordini_lavoro").update({ stato:newStato }).in("id", ids);
      }
      onApplica();
    } catch(e) { console.warn("Errore: "+e.message); }
    finally    { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
      zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"24px 16px", overflowY:"auto" }}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(640px,96vw)", padding:"24px", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>🎯 Filtro + Applica</div>
            <div style={{ fontSize:12, color:"var(--text-3)", marginTop:2 }}>
              Filtra gli OdL e applica una modifica a tutti i risultati
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:"var(--text-3)" }}>✕</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
          {/* Colonna filtri */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)",
              textTransform:"uppercase", letterSpacing:".04em", marginBottom:10 }}>
              1. Filtra gli OdL
            </div>
            <div style={{ display:"grid", gap:10 }}>
              <select value={fStato} onChange={e=>setFStato(e.target.value)} style={{width:"100%"}}>
                <option value="tutti">Tutti gli stati</option>
                {STATI.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
              <select value={fCliente} onChange={e=>setFCl(e.target.value)} style={{width:"100%"}}>
                <option value="tutti">Tutti i clienti</option>
                {clientiUsati.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
              </select>
              <select value={fOp} onChange={e=>setFOp(e.target.value)} style={{width:"100%"}}>
                <option value="tutti">Tutti gli operatori</option>
                {opUsati.map(o=><option key={o.id} value={String(o.id)}>{o.nome}</option>)}
              </select>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>Da mese</div>
                  <input type="month" value={fMeseDa} onChange={e=>setFMDa(e.target.value)} style={{width:"100%"}} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>A mese</div>
                  <input type="month" value={fMeseA} onChange={e=>setFMA(e.target.value)} style={{width:"100%"}} />
                </div>
              </div>

              {/* Risultato filtri */}
              <div style={{
                padding:"10px 12px", borderRadius:8,
                background: filtrati.length > 0 ? "#ECFDF5" : "var(--surface-2)",
                border:`1px solid ${filtrati.length>0?"#A7F3D0":"var(--border)"}`,
                fontSize:13, fontWeight:700,
                color: filtrati.length > 0 ? "#065F46" : "var(--text-3)",
              }}>
                {filtrati.length === odl.length
                  ? `⚠ Tutti gli OdL (${filtrati.length})`
                  : filtrati.length > 0
                    ? `✓ ${filtrati.length} OdL corrispondono`
                    : "Nessun OdL corrisponde"}
              </div>
            </div>
          </div>

          {/* Colonna azione */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)",
              textTransform:"uppercase", letterSpacing:".04em", marginBottom:10 }}>
              2. Azione da applicare
            </div>
            <div style={{ display:"grid", gap:8 }}>
              {[
                { v:"sposta_giorni",    l:"📅 Sposta di N giorni" },
                { v:"imposta_data",     l:"📌 Imposta data fissa" },
                { v:"cambia_operatore", l:"👤 Cambia operatore" },
                { v:"cambia_stato",     l:"🔄 Cambia stato" },
              ].map(a=>(
                <div key={a.v} onClick={()=>setAzione(a.v)} style={{
                  padding:"8px 12px", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600,
                  border:`2px solid ${azione===a.v?"#3B82F6":"var(--border)"}`,
                  background:azione===a.v?"#EFF6FF":"var(--surface)",
                  color:azione===a.v?"#1E40AF":"var(--text-1)",
                }}>{a.l}</div>
              ))}

              {/* Input azione */}
              <div style={{ marginTop:4 }}>
                {azione==="sposta_giorni" && (
                  <input type="number" value={giorni} onChange={e=>setGiorni(Number(e.target.value))}
                    step={1} style={{width:"100%"}} placeholder="+7 avanti, -7 indietro" />
                )}
                {azione==="imposta_data" && (
                  <input type="date" value={newData} onChange={e=>setNewData(e.target.value)} style={{width:"100%"}} />
                )}
                {azione==="cambia_operatore" && (
                  <select value={newOp} onChange={e=>setNewOp(e.target.value)} style={{width:"100%"}}>
                    <option value="">— Seleziona —</option>
                    {fornitori.map(o=><option key={o.id} value={String(o.id)}>{o.nome}</option>)}
                  </select>
                )}
                {azione==="cambia_stato" && (
                  <div style={{ display:"grid", gap:5 }}>
                    {STATI.map(s=>(
                      <div key={s.v} onClick={()=>setNewStato(s.v)} style={{
                        padding:"6px 10px", borderRadius:6, cursor:"pointer", fontSize:12,
                        fontWeight:newStato===s.v?700:400, color:s.col, background:s.bg,
                        border:`2px solid ${newStato===s.v?"#3B82F6":"transparent"}`,
                      }}>{s.l}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button onClick={esegui}
            disabled={!filtrati.length||!okAzione||loading}
            className="btn-primary">
            {loading ? "⏳ Applicazione..." : `🎯 Applica a ${filtrati.length} OdL`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Export/Import CSV ────────────────────────────────────────────────────
function esportaOdlCSV(odl=[], operatori=[], clienti=[]) {
  if (!odl.length) { console.warn("Nessun OdL da esportare."); return; }
  const esc = v => {
    if (v==null||v==="") return "";
    const s=String(v);
    return s.includes(",")||s.includes('"')||s.includes("\n")?`"${s.replace(/"/g,'""')}"`:`${s}`;
  };
  const headers = ["ID_MANUМАН","Numero","Titolo","Data inizio","Data fine",
    "Operatore","Cliente","Stato","Durata stimata (min)","Note"];
  const righe = odl.map(o => {
    const op = operatori.find(x=>x.id===o.operatore_id);
    const cl = clienti.find(x=>x.id===o.cliente_id);
    return [
      o.id, o.numero||"", o.titolo||"",
      o.data_inizio||"", o.data_fine||"",
      op?.nome||"", cl?.rs||"",
      o.stato||"", o.durata_stimata||"", o.note||""
    ].map(esc).join(",");
  });
  const csv = ["\uFEFF"+headers.join(","), ...righe].join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`odl_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
}

function ImportaOdlCSV({ odl=[], operatori=[], clienti=[], tenantId, onClose, onApplica }) {
  const [rows,    setRows]    = useState([]);
  const [errors,  setErrors]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress,setProgress]= useState(0);
  const [done,    setDone]    = useState(false);
  const [fileName,setFileName]= useState("");
  const [dragOver,setDragOver]= useState(false);
  const fileRef = useRef();

  const fornitori = operatori.filter(o=>o.tipo==="fornitore");

  const parseCSV = useCallback(text => {
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    if (lines.length < 2) return { rows:[], errors:["File vuoto"] };
    const sep = lines[0].includes(";")?";":","
    const headers = lines[0].split(sep).map(h=>h.replace(/^["']|["']$/g,"").trim());

    const findCol = names => headers.findIndex(h => names.some(n => h.toLowerCase().replace(/[^a-z0-9]/g,"").includes(n.replace(/[^a-z0-9]/g,""))));
    const idxId    = findCol(["id_manuман","id"]);
    const idxDa    = findCol(["data inizio","datainizio","data_inizio","data"]);
    const idxA     = findCol(["data fine","datafine","data_fine"]);
    const idxOp    = findCol(["operatore"]);
    const idxStato = findCol(["stato"]);
    const idxNote  = findCol(["note"]);

    const parsed=[]; const errs=[];
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(sep).map(c=>c.replace(/^["']|["']$/g,"").trim());
      if(cols.every(c=>!c)) continue;
      const get=idx=>idx>=0?(cols[idx]??""): "";

      const id = parseInt(get(idxId),10)||null;
      if(!id){ errs.push(`Riga ${i+1}: ID_MANUМАН mancante o non valido — riga ignorata`); continue; }

      // Risolvi operatore per nome
      const opNome = get(idxOp);
      const opObj  = opNome ? fornitori.find(o=>o.nome.toLowerCase()===opNome.toLowerCase()) : null;

      // Normalizza stato
      const statoRaw = get(idxStato).toLowerCase();
      const stato = statoRaw.includes("corso")?"in_corso"
        :statoRaw.includes("conf")?"confermato"
        :statoRaw.includes("comp")?"completato"
        :statoRaw.includes("bozza")?"bozza":null;

      parsed.push({
        id,
        data_inizio: get(idxDa)||null,
        data_fine:   get(idxA)||null,
        operatore_id:opObj?.id||null,
        operatoreNome:opNome,
        stato,
        note: get(idxNote)||null,
      });
    }
    return { rows:parsed, errors:errs };
  },[fornitori]);

  const caricaFile = useCallback(file => {
    if(!file) return;
    setFileName(file.name);
    const reader=new FileReader();
    reader.onload=e=>{
      const {rows:r,errors:e2}=parseCSV(e.target.result);
      setRows(r); setErrors(e2);
    };
    reader.readAsText(file,"UTF-8");
  },[parseCSV]);

  const eseguiImport = async () => {
    setLoading(true);
    let ok=0;
    for(let i=0;i<rows.length;i++){
      const r=rows[i];
      const upd={};
      if(r.data_inizio) upd.data_inizio=r.data_inizio;
      if(r.data_fine)   upd.data_fine=r.data_fine;
      if(r.operatore_id) upd.operatore_id=r.operatore_id;
      if(r.stato)        upd.stato=r.stato;
      if(r.note!=null)   upd.note=r.note;
      if(!Object.keys(upd).length) continue;
      const {error}=await supabase.from("ordini_lavoro")
        .update(upd).eq("id",r.id).eq("tenant_id",tenantId);
      if(!error) ok++;
      setProgress(Math.round((i+1)/rows.length*100));
    }
    setLoading(false);
    setDone(true);
    setTimeout(()=>{onApplica(); onClose();},1200);
  };

  if(done) return (
    <div style={{textAlign:"center",padding:"30px 0"}}>
      <div style={{fontSize:40}}>✅</div>
      <div style={{fontWeight:700,fontSize:16,marginTop:12}}>
        {Math.round(progress===100?rows.length:progress)} OdL aggiornati
      </div>
    </div>
  );

  return (
    <div>
      {rows.length===0 ? (
        <div
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);caricaFile(e.dataTransfer.files[0]);}}
          onClick={()=>fileRef.current?.click()}
          style={{
            border:`2px dashed ${dragOver?"var(--amber)":"var(--border)"}`,
            borderRadius:10, padding:"28px 20px", textAlign:"center", cursor:"pointer",
            background:dragOver?"#FFFBEB":"var(--surface-2)",
          }}>
          <div style={{fontSize:30,marginBottom:8}}>📂</div>
          <div style={{fontWeight:700,fontSize:13}}>Trascina il CSV modificato qui</div>
          <div style={{fontSize:11,color:"var(--text-3)",marginTop:4}}>
            Il file deve avere la colonna ID_MANUМАН e le colonne da aggiornare
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}}
            onChange={e=>caricaFile(e.target.files[0])} />
        </div>
      ) : (
        <div>
          <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>
            📄 {fileName} — {rows.length} OdL da aggiornare
          </div>
          {errors.length>0 && (
            <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:7,
              padding:"8px 12px",marginBottom:10,fontSize:11,color:"#92400E"}}>
              {errors.slice(0,3).map((e,i)=><div key={i}>⚠ {e}</div>)}
              {errors.length>3&&<div>…e altri {errors.length-3}</div>}
            </div>
          )}
          {/* Preview */}
          <div style={{maxHeight:200,overflowY:"auto",border:"1px solid var(--border)",
            borderRadius:8,marginBottom:12}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"var(--navy)",color:"white"}}>
                  {["#OdL","Data inizio","Data fine","Operatore","Stato"].map(h=>(
                    <th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:700}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>{
                  const orig=odl.find(o=>o.id===r.id);
                  return (
                    <tr key={i} style={{borderBottom:"1px solid var(--border)",
                      background:i%2===0?"var(--surface)":"var(--surface-2)"}}>
                      <td style={{padding:"5px 8px",fontWeight:600}}>{orig?.numero||`#${r.id}`}</td>
                      <td style={{padding:"5px 8px"}}>
                        {r.data_inizio ? (
                          <span>
                            <span style={{textDecoration:"line-through",color:"var(--text-3)",marginRight:4}}>
                              {fmtDate(orig?.data_inizio)}
                            </span>
                            <span style={{color:"#059669",fontWeight:600}}>{fmtDate(r.data_inizio)}</span>
                          </span>
                        ) : <span style={{color:"var(--text-3)"}}>—</span>}
                      </td>
                      <td style={{padding:"5px 8px"}}>
                        {r.data_fine
                          ? <span style={{color:"#059669",fontWeight:600}}>{fmtDate(r.data_fine)}</span>
                          : <span style={{color:"var(--text-3)"}}>—</span>}
                      </td>
                      <td style={{padding:"5px 8px"}}>
                        {r.operatoreNome
                          ? r.operatore_id
                            ? <span style={{color:"#7F77DD",fontWeight:600}}>{r.operatoreNome}</span>
                            : <span style={{color:"#EF4444"}}>⚠ {r.operatoreNome}</span>
                          : <span style={{color:"var(--text-3)"}}>—</span>}
                      </td>
                      <td style={{padding:"5px 8px"}}>
                        {r.stato
                          ? <span style={{fontWeight:600,color:STATI.find(s=>s.v===r.stato)?.col||"inherit"}}>
                              {STATI.find(s=>s.v===r.stato)?.l||r.stato}
                            </span>
                          : <span style={{color:"var(--text-3)"}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading && (
            <div style={{height:5,background:"var(--border)",borderRadius:99,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:`${progress}%`,background:"#059669",transition:"width .3s"}}/>
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>{setRows([]);setErrors([]);setFileName("");}} className="btn-ghost">
              ← Cambia file
            </button>
            <button onClick={eseguiImport} disabled={loading||!rows.length} className="btn-primary">
              {loading?`⏳ ${progress}%…`:`✅ Aggiorna ${rows.length} OdL`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pannello principale ripianificazione ─────────────────────────────────
export function PannelloRipianifica({
  odl=[], odlFiltrati=[], operatori=[], clienti=[], tenantId,
  selezionati=[], onClose, onApplica,
}) {
  const [tab, setTab] = useState(
    selezionati.length > 0 ? "bulk" : "filtro"
  );
  const [showImportCSV, setShowImportCSV] = useState(false);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
      zIndex:900, display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"24px 16px", overflowY:"auto" }}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(700px,96vw)", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"20px 24px 0" }}>
          <div style={{ fontWeight:800, fontSize:17 }}>📅 Ripianificazione massiva OdL</div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",
            fontSize:20,color:"var(--text-3)" }}>✕</button>
        </div>

        {/* Tab selector */}
        <div style={{ display:"flex", borderBottom:"1px solid var(--border)", margin:"16px 24px 0", gap:0 }}>
          {[
            { id:"bulk",   l:`☑ Selezione (${selezionati.length})`, dis: selezionati.length===0 },
            { id:"filtro", l:"🎯 Filtro + Applica" },
            { id:"csv",    l:"📤 Export / Import CSV" },
          ].map(t=>(
            <button key={t.id} onClick={()=>!t.dis&&setTab(t.id)}
              disabled={t.dis}
              style={{
                padding:"9px 16px", border:"none", background:"none", cursor:t.dis?"not-allowed":"pointer",
                fontWeight:tab===t.id?700:400, fontSize:13,
                color:t.dis?"var(--text-3)":tab===t.id?"var(--navy)":"var(--text-3)",
                borderBottom:tab===t.id?"2px solid var(--amber)":"2px solid transparent",
                opacity:t.dis?.4:1,
              }}>{t.l}</button>
          ))}
        </div>

        <div style={{ padding:"20px 24px 24px" }}>
          {/* Tab A: Bulk su selezionati */}
          {tab === "bulk" && (
            <ModalAzioneBulk
              odlSelezionati={selezionati}
              operatori={operatori}
              onClose={onClose}
              onApplica={onApplica}
            />
          )}

          {/* Tab B: Filtro + Applica */}
          {tab === "filtro" && (
            <ModalFiltraApplica
              odl={odl}
              operatori={operatori}
              clienti={clienti}
              tenantId={tenantId}
              onClose={onClose}
              onApplica={onApplica}
            />
          )}

          {/* Tab C: Export / Import CSV */}
          {tab === "csv" && (
            <div style={{ display:"grid", gap:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ background:"var(--surface-2)", border:"1px solid var(--border)",
                  borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>📥 1. Esporta</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", lineHeight:1.6, marginBottom:12 }}>
                    Scarica il CSV degli OdL attuali (o solo quelli filtrati). Modificalo in Excel: cambia date, operatori, stati.
                  </div>
                  <div style={{ display:"grid", gap:6 }}>
                    <button onClick={()=>esportaOdlCSV(odl,operatori,clienti)}
                      style={{ padding:"8px 14px", borderRadius:7, fontWeight:700,
                        background:"var(--navy)", color:"white", border:"none",
                        cursor:"pointer", fontSize:12 }}>
                      📋 Esporta tutti ({odl.length})
                    </button>
                    {odlFiltrati.length!==odl.length && (
                      <button onClick={()=>esportaOdlCSV(odlFiltrati,operatori,clienti)}
                        style={{ padding:"8px 14px", borderRadius:7, fontWeight:700,
                          background:"var(--surface)", border:"1px solid var(--border)",
                          cursor:"pointer", fontSize:12 }}>
                        🔍 Esporta filtrati ({odlFiltrati.length})
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ background:"var(--surface-2)", border:"1px solid var(--border)",
                  borderRadius:10, padding:"14px 16px" }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>📤 2. Reimporta</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", lineHeight:1.6, marginBottom:12 }}>
                    Ricarica il CSV modificato. Solo le colonne cambiate vengono aggiornate. L'ID_MANUМАН è obbligatorio.
                  </div>
                  <button onClick={()=>setShowImportCSV(true)}
                    style={{ padding:"8px 14px", borderRadius:7, fontWeight:700,
                      background:"#059669", color:"white", border:"none",
                      cursor:"pointer", fontSize:12, width:"100%" }}>
                    📂 Carica CSV modificato
                  </button>
                </div>
              </div>

              {showImportCSV && (
                <div style={{ border:"1px solid var(--border)", borderRadius:10, padding:"16px" }}>
                  <ImportaOdlCSV
                    odl={odl} operatori={operatori} clienti={clienti} tenantId={tenantId}
                    onClose={()=>setShowImportCSV(false)}
                    onApplica={onApplica}
                  />
                </div>
              )}

              {/* Colonne modificabili */}
              <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE",
                borderRadius:8, padding:"12px 14px" }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#1E40AF", marginBottom:6 }}>
                  Colonne modificabili nel CSV
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {["Data inizio","Data fine","Operatore","Stato","Note"].map(c=>(
                    <span key={c} style={{ fontSize:11, background:"#DBEAFE",
                      color:"#1E40AF", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>
                      {c}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize:11, color:"#3B82F6", marginTop:6 }}>
                  La colonna <strong>ID_MANUМАН</strong> è obbligatoria e non va modificata.
                  Numero e Titolo sono in sola lettura.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
