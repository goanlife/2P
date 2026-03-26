import React, { useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";

// ─── Mappatura colonne CSV/Excel → campi DB ───────────────────────────────
const COL_MAP = {
  id:            ["id_manuман","id","id_manuман","manuман_id","asset_id","id_asset"],
  nome:          ["nome","name","asset","denominazione","descrizione","impianto","attrezzatura","apparecchiatura","equipment"],
  tipo:          ["tipo","type","categoria","category","tipologia","classe"],
  cliente:       ["cliente","client","azienda","company","sito","site","rs","ragionesociale","intestatario"],
  ubicazione:    ["ubicazione","location","posizione","sede","reparto","zona","piano","stanza","area","luogo"],
  matricola:     ["matricola","serial","serialnumber","sn","seriale","codicematricola","codice","id","numero","n°"],
  marca:         ["marca","brand","produttore","manufacturer","fabbricante"],
  modello:       ["modello","model","versione","version","codicemodello"],
  data_inst:     ["data installazione","datainstallazione","installazione","installation","data acquisto","acquisto","anno","data"],
  stato:         ["stato","status","condizione","state"],
  note:          ["note","notes","obs","commenti","info","descrizione","annotazioni"],
  ore_utilizzo:  ["ore utilizzo","oreutilizzo","ore","hours","ore lavoro","orefunzionamento"],
  costo_acquisto:["costo","costo acquisto","costoinstallazione","price","prezzo","valore","importo"],
  garanzia_al:   ["garanzia","warranty","scadenzagaranzia","data garanzia","fine garanzia"],
  vita_utile:    ["vita utile","vitautile","durataattesa","life","anni","anni vita"],
};

const STATI_VALIDI = ["attivo","manutenzione","inattivo"];

function mapHeader(h) {
  const norm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  for (const [field, variants] of Object.entries(COL_MAP)) {
    if (variants.some(v => {
      const vn = v.replace(/[^a-z0-9]/g, "");
      return norm === vn || norm.startsWith(vn) || vn.startsWith(norm);
    })) return field;
  }
  return null;
}

function parseRow(row, colMap, clienti=[]) {
  const get = f => {
    const col = Object.entries(colMap).find(([,field]) => field === f)?.[0];
    return col !== undefined ? (row[col] ?? "").toString().trim() : "";
  };

  // Risolvi cliente: cerca per nome o codice
  const clienteRaw = get("cliente");
  let clienteId = null;
  if (clienteRaw) {
    const match = clienti.find(c =>
      c.rs?.toLowerCase() === clienteRaw.toLowerCase() ||
      c.codice?.toLowerCase() === clienteRaw.toLowerCase()
    );
    clienteId = match?.id || null;
  }

  // Normalizza stato
  const statoRaw = get("stato").toLowerCase();
  const stato = STATI_VALIDI.includes(statoRaw) ? statoRaw
    : statoRaw.includes("man") ? "manutenzione"
    : statoRaw.includes("inatt") || statoRaw.includes("off") ? "inattivo"
    : "attivo";

  // Normalizza data
  const parseData = s => {
    if (!s) return null;
    // Gestisci formati: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY
    if (/^\d{4}$/.test(s)) return `${s}-01-01`;
    const d1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (d1) {
      const y = d1[3].length === 2 ? "20"+d1[3] : d1[3];
      return `${y}-${d1[2].padStart(2,"0")}-${d1[1].padStart(2,"0")}`;
    }
    const d2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (d2) return `${d2[1]}-${d2[2].padStart(2,"0")}-${d2[3].padStart(2,"0")}`;
    return null;
  };

  return {
    id:            get("id") ? parseInt(get("id"), 10) || null : null,
    nome:          get("nome"),
    tipo:          get("tipo"),
    clienteId,
    clienteNome:   clienteRaw,        // per preview
    ubicazione:    get("ubicazione"),
    matricola:     get("matricola"),
    marca:         get("marca"),
    modello:       get("modello"),
    dataInst:      parseData(get("data_inst")),
    stato,
    note:          get("note"),
    ore_utilizzo:  parseFloat(get("ore_utilizzo")) || 0,
    costo_acquisto:parseFloat(get("costo_acquisto").replace(/[^\d.]/g,"")) || null,
    garanzia_al:   parseData(get("garanzia_al")),
    vita_utile_anni: parseInt(get("vita_utile"), 10) || null,
  };
}

function valida(r, i) {
  const errs = [];
  if (!r.nome.trim()) errs.push(`Riga ${i+2}: nome asset obbligatorio`);
  if (r.nome.length > 200) errs.push(`Riga ${i+2}: nome troppo lungo`);
  if (r.clienteNome && !r.clienteId) errs.push(`Riga ${i+2}: cliente "${r.clienteNome}" non trovato in anagrafica`);
  return errs;
}

// ─── Componente principale ────────────────────────────────────────────────
export function ImportaAsset({ tenantId, userId, clienti=[], onDone }) {
  const [step,        setStep]       = useState("upload");  // upload|preview|done
  const [rows,        setRows]       = useState([]);
  const [errors,      setErrors]     = useState([]);
  const [warnings,    setWarnings]   = useState([]);
  const [importing,   setImporting]  = useState(false);
  const [progress,    setProgress]   = useState(0);
  const [fileName,    setFileName]   = useState("");
  const [dragOver,    setDragOver]   = useState(false);
  const [imported,    setImported]   = useState(0);
  const [modoUpdate,   setModoUpdate] = useState(false);
  const fileRef = useRef();

  // ── Parse CSV ──────────────────────────────────────────────────────────
  const parseCSV = useCallback((text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { rows:[], errors:["File vuoto o intestazione mancante"], warnings:[] };

    // Detecta separatore: ; o ,
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.replace(/^["']|["']$/g,"").trim());

    // Mappa intestazioni
    const colMap = {};
    const unmapped = [];
    headers.forEach((h, i) => {
      const field = mapHeader(h);
      if (field) colMap[i] = field;
      else if (h) unmapped.push(h);
    });

    const warns = unmapped.length
      ? [`Colonne non riconosciute (ignorate): ${unmapped.join(", ")}`]
      : [];

    const parsedRows = [];
    const errs = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.replace(/^["']|["']$/g,"").trim());
      if (cols.every(c => !c)) continue; // riga vuota
      const row = {};
      headers.forEach((_, idx) => { row[idx] = cols[idx] ?? ""; });
      const parsed = parseRow(row, colMap, clienti);
      const rowErrs = valida(parsed, i-1);
      if (rowErrs.length) errs.push(...rowErrs);
      else parsedRows.push(parsed);
    }

    return { rows: parsedRows, errors: errs, warnings: warns };
  }, [clienti]);

  // ── Carica file ────────────────────────────────────────────────────────
  const caricaFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);

    // Xlsx
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(e.target.result, { type:"array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(ws, { FS:",", RS:"\n" });
          const result = parseCSV(csv);
          setRows(result.rows); setErrors(result.errors); setWarnings(result.warnings);
          setStep("preview");
        } catch(err) {
          setErrors([`Errore lettura Excel: ${err.message}`]);
          setStep("preview");
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // CSV / TXT
    const reader = new FileReader();
    reader.onload = e => {
      const result = parseCSV(e.target.result);
      setRows(result.rows); setErrors(result.errors); setWarnings(result.warnings);
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  }, [parseCSV]);

  // ── Import DB ──────────────────────────────────────────────────────────
  const eseguiImport = async () => {
    if (!rows.length) return;
    setImporting(true); setProgress(0);
    let ok = 0;
    const BATCH = 25;

    // Separa righe con id (UPDATE) da quelle senza (INSERT)
    const conId    = rows.filter(r => r.id);
    const senzaId  = rows.filter(r => !r.id);

    const toRecord = r => ({
      nome:            r.nome,
      tipo:            r.tipo || "",
      cliente_id:      r.clienteId || null,
      ubicazione:      r.ubicazione || "",
      matricola:       r.matricola || "",
      marca:           r.marca || "",
      modello:         r.modello || "",
      data_inst:       r.dataInst || null,
      stato:           r.stato || "attivo",
      note:            r.note || "",
      ore_utilizzo:    r.ore_utilizzo || 0,
      costo_acquisto:  r.costo_acquisto || null,
      garanzia_al:     r.garanzia_al || null,
      vita_utile_anni: r.vita_utile_anni || null,
      user_id:         userId,
      tenant_id:       tenantId,
    });

    // INSERT nuovi
    for (let i = 0; i < senzaId.length; i += BATCH) {
      const batch = senzaId.slice(i, i+BATCH).map(toRecord);
      const { error } = await supabase.from("assets").insert(batch);
      if (!error) ok += batch.length;
      setProgress(Math.round(((i+BATCH)/(rows.length))*50));
    }

    // UPDATE esistenti (uno alla volta per sicurezza)
    for (let i = 0; i < conId.length; i++) {
      const r = conId[i];
      const { error } = await supabase
        .from("assets")
        .update(toRecord(r))
        .eq("id", r.id)
        .eq("tenant_id", tenantId);
      if (!error) ok++;
      setProgress(50 + Math.round(((i+1)/conId.length)*50));
    }

    setImported(ok);
    setModoUpdate(conId.length > 0);
    setImporting(false);
    setStep("done");
    onDone?.();
  };

  // ── Scarica template CSV ───────────────────────────────────────────────
  const scaricaTemplate = () => {
    const header = "Nome,Tipo,Cliente,Ubicazione,Matricola,Marca,Modello,Data installazione,Stato,Note,Ore utilizzo,Costo acquisto,Fine garanzia,Anni vita utile";
    const esempi = [
      "Caldaia centrale,Impianto termico,Rossi Srl,Piano interrato - Locale tecnico,CAL-001,Vaillant,ecoTEC plus,15/03/2019,attivo,Revisione annuale,1250,4500,31/12/2026,20",
      "Quadro elettrico principale,Impianto elettrico,Rossi Srl,Piano terra - Ingresso,QE-001,Schneider,Pragma,10/06/2018,attivo,,0,,",
      "Compressore aria,Meccanico,Bianchi SpA,Officina - Zona A,COMP-007,Atlas Copco,GA15,22/01/2021,attivo,Cambio filtri trimestrale,3400,7800,22/01/2025,15",
    ];
    const csv = [header, ...esempi].join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template_import_asset.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  const s = {
    card:  { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", padding:"20px 24px" },
    title: { fontWeight:700, fontSize:15, marginBottom:4 },
    sub:   { fontSize:12, color:"var(--text-3)", marginBottom:16 },
  };

  // Step: upload
  if (step === "upload") return (
    <div style={{ display:"grid", gap:16, maxWidth:620 }}>
      {/* Drop zone */}
      <div
        onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{ e.preventDefault(); setDragOver(false); caricaFile(e.dataTransfer.files[0]); }}
        onClick={()=>fileRef.current.click()}
        style={{
          border:`2px dashed ${dragOver?"var(--amber)":"var(--border)"}`,
          borderRadius:12, padding:"36px 24px", textAlign:"center", cursor:"pointer",
          background: dragOver?"#FFFBEB":"var(--surface)", transition:"all .2s",
        }}>
        <div style={{ fontSize:36, marginBottom:10 }}>📥</div>
        <div style={{ fontWeight:700, fontSize:14 }}>
          {dragOver ? "Rilascia qui il file" : "Trascina il file qui o clicca per selezionarlo"}
        </div>
        <div style={{ fontSize:12, color:"var(--text-3)", marginTop:6 }}>
          Supporta CSV (separatore ; o ,) e Excel (.xlsx)<br/>
          <span style={{color:"var(--amber)",fontWeight:600}}>
            💡 Per aggiornamenti massivi: esporta prima con il bottone 📤, modifica il CSV, poi reimportalo.
               Le righe con ID_MANUМАН vengono aggiornate, quelle senza ID vengono create.
          </span>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt"
          style={{ display:"none" }}
          onChange={e=>caricaFile(e.target.files[0])} />
      </div>

      {/* Template + colonne riconosciute */}
      <div style={s.card}>
        <div style={s.title}>📋 Come preparare il file</div>
        <div style={s.sub}>
          Usa un file CSV o Excel con queste colonne (l'ordine non importa, i nomi sono flessibili):
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14 }}>
          {[
            ["Nome *", "obbligatorio"],
            ["Tipo", "es. Impianto elettrico"],
            ["Cliente", "nome o codice cliente"],
            ["Ubicazione", "reparto, piano, zona..."],
            ["Matricola", "codice seriale"],
            ["Marca / Modello", "produttore + modello"],
            ["Data installazione", "GG/MM/AAAA"],
            ["Stato", "attivo / manutenzione / inattivo"],
            ["Ore utilizzo", "ore di funzionamento"],
            ["Costo acquisto", "valore in €"],
            ["Fine garanzia", "GG/MM/AAAA"],
            ["Anni vita utile", "numero intero"],
          ].map(([k,v]) => (
            <div key={k} style={{ fontSize:12, display:"flex", gap:6 }}>
              <code style={{ background:"var(--surface-2)", padding:"1px 6px",
                borderRadius:4, fontWeight:600, flexShrink:0 }}>{k}</code>
              <span style={{ color:"var(--text-3)" }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={scaricaTemplate}
          style={{ fontSize:12, padding:"7px 14px", borderRadius:7,
            background:"var(--surface-2)", border:"1px solid var(--border)",
            cursor:"pointer", fontWeight:600 }}>
          ⬇ Scarica template CSV di esempio
        </button>
      </div>

      {/* Clienti disponibili */}
      {clienti.length > 0 && (
        <div style={{ ...s.card, padding:"12px 16px" }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:6 }}>
            🏢 Clienti disponibili ({clienti.length}) — usa questi nomi nella colonna Cliente:
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {clienti.slice(0,20).map(c => (
              <span key={c.id} style={{ fontSize:11, background:"var(--surface-2)",
                border:"1px solid var(--border)", borderRadius:99,
                padding:"2px 8px", color:"var(--text-2)" }}>
                {c.rs}{c.codice ? ` (${c.codice})` : ""}
              </span>
            ))}
            {clienti.length > 20 && (
              <span style={{ fontSize:11, color:"var(--text-3)" }}>+{clienti.length-20} altri</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Step: preview
  if (step === "preview") return (
    <div style={{ display:"grid", gap:12 }}>
      {/* Intestazione */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>📄 {fileName}</div>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:2 }}>
            {rows.length} asset da importare
            {errors.length > 0 && ` · ${errors.length} righe con errori escluse`}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setStep("upload")}
            style={{ fontSize:13, padding:"8px 16px", borderRadius:7,
              background:"var(--surface)", border:"1px solid var(--border)", cursor:"pointer" }}>
            ← Cambia file
          </button>
          <button onClick={eseguiImport}
            disabled={importing || !rows.length}
            style={{ fontSize:13, padding:"8px 20px", borderRadius:7, fontWeight:700,
              background: rows.length ? "#059669" : "var(--surface-3)",
              color: rows.length ? "white" : "var(--text-3)",
              border:"none", cursor: rows.length && !importing ? "pointer" : "default" }}>
            {importing
            ? `⏳ ${progress}%…`
            : rows.some(r=>r.id) && rows.some(r=>!r.id)
              ? `✅ ${rows.filter(r=>!r.id).length} nuovi + ✏ ${rows.filter(r=>r.id).length} aggiornamenti`
              : rows.every(r=>r.id)
                ? `✏ Aggiorna ${rows.length} asset`
                : `✅ Importa ${rows.length} asset`
          }
          </button>
        </div>
      </div>

      {/* Warning colonne non mappate */}
      {warnings.map((w,i) => (
        <div key={i} style={{ fontSize:12, padding:"8px 12px", borderRadius:7,
          background:"#FEF3C7", border:"1px solid #FDE68A", color:"#92400E" }}>
          ⚠ {w}
        </div>
      ))}

      {/* Errori */}
      {errors.length > 0 && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA",
          borderRadius:8, padding:"10px 14px" }}>
          <div style={{ fontWeight:700, fontSize:12, color:"#991B1B", marginBottom:6 }}>
            ❌ {errors.length} righe escluse per errori:
          </div>
          {errors.slice(0,5).map((e,i) => (
            <div key={i} style={{ fontSize:11, color:"#991B1B" }}>· {e}</div>
          ))}
          {errors.length > 5 && (
            <div style={{ fontSize:11, color:"#991B1B" }}>…e altri {errors.length-5} errori</div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {importing && (
        <div style={{ height:6, background:"var(--border)", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progress}%`,
            background:"#059669", borderRadius:99, transition:"width .3s" }} />
        </div>
      )}

      {/* Tabella preview */}
      <div style={{ overflowX:"auto", border:"1px solid var(--border)", borderRadius:10 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"var(--navy)", color:"white" }}>
              {["","Nome","Tipo","Cliente","Ubicazione","Matricola","Marca/Modello","Stato","Installato"].map(h => (
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontWeight:700,
                  fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,50).map((r, i) => (
              <tr key={i} style={{ borderBottom:"1px solid var(--border)",
                background: i%2===0 ? "var(--surface)" : "var(--surface-2)" }}>
                <td style={{ padding:"7px 10px", textAlign:"center" }}>
                  {r.id
                    ? <span style={{ background:"#EFF6FF",color:"#1D4ED8",
                        padding:"1px 6px",borderRadius:99,fontSize:10,fontWeight:700 }}>
                        ✏ agg.
                      </span>
                    : <span style={{ background:"#ECFDF5",color:"#065F46",
                        padding:"1px 6px",borderRadius:99,fontSize:10,fontWeight:700 }}>
                        + nuovo
                      </span>
                  }
                </td>
                <td style={{ padding:"7px 10px", fontWeight:600, maxWidth:180,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.nome}</td>
                <td style={{ padding:"7px 10px", color:"var(--text-3)" }}>{r.tipo||"—"}</td>
                <td style={{ padding:"7px 10px" }}>
                  {r.clienteId
                    ? <span style={{color:"#7F77DD",fontWeight:600}}>{r.clienteNome}</span>
                    : r.clienteNome
                      ? <span style={{color:"#EF4444"}} title="Cliente non trovato">⚠ {r.clienteNome}</span>
                      : <span style={{color:"var(--text-3)"}}>—</span>
                  }
                </td>
                <td style={{ padding:"7px 10px", color:"var(--text-3)" }}>{r.ubicazione||"—"}</td>
                <td style={{ padding:"7px 10px", fontFamily:"monospace", fontSize:11 }}>{r.matricola||"—"}</td>
                <td style={{ padding:"7px 10px", color:"var(--text-3)" }}>
                  {[r.marca,r.modello].filter(Boolean).join(" ")||"—"}
                </td>
                <td style={{ padding:"7px 10px" }}>
                  <span style={{
                    background: r.stato==="attivo"?"#ECFDF5":r.stato==="inattivo"?"#F1F5F9":"#FEF3C7",
                    color: r.stato==="attivo"?"#065F46":r.stato==="inattivo"?"#475569":"#92400E",
                    padding:"2px 8px", borderRadius:99, fontWeight:600, fontSize:10,
                  }}>{r.stato}</span>
                </td>
                <td style={{ padding:"7px 10px", color:"var(--text-3)" }}>{r.dataInst||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 50 && (
          <div style={{ textAlign:"center", padding:"10px", fontSize:12, color:"var(--text-3)",
            borderTop:"1px solid var(--border)" }}>
            Mostrate le prime 50 righe di {rows.length}
          </div>
        )}
      </div>
    </div>
  );

  // Step: done
  const insertCount  = rows.filter(r => !r.id).length;
  const updateCount  = rows.filter(r => r.id).length;
  return (
    <div style={{ textAlign:"center", padding:"40px 24px" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
      <div style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>
        {imported} asset {modoUpdate ? "sincronizzati" : "importati"}!
      </div>
      {modoUpdate ? (
        <div style={{ display:"flex", gap:20, justifyContent:"center", marginBottom:20 }}>
          {insertCount > 0 && (
            <div style={{ background:"#ECFDF5", border:"1px solid #A7F3D0",
              borderRadius:8, padding:"10px 20px" }}>
              <div style={{ fontWeight:700, fontSize:18, color:"#059669" }}>{insertCount}</div>
              <div style={{ fontSize:12, color:"#065F46" }}>Nuovi inseriti</div>
            </div>
          )}
          {updateCount > 0 && (
            <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE",
              borderRadius:8, padding:"10px 20px" }}>
              <div style={{ fontWeight:700, fontSize:18, color:"#1D4ED8" }}>{updateCount}</div>
              <div style={{ fontSize:12, color:"#1E40AF" }}>Aggiornati</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize:13, color:"var(--text-3)", marginBottom:24 }}>
          Gli asset sono ora disponibili nell'anagrafica.
        </div>
      )}
      <button onClick={onDone}
        style={{ padding:"11px 28px", background:"#059669", color:"white",
          border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:"pointer" }}>
        Torna agli asset
      </button>
    </div>
  );
}
