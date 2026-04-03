/**
 * ImportaCSV — Componente generico per import CSV/Excel
 * 
 * Sostituisce ImportaAsset, ImportaClienti, ImportaRicambi
 * Configurabile tramite props: colMap, parseRow, validateRow, onImport
 * 
 * Uso:
 *   <ImportaCSV
 *     titolo="Importa Asset"
 *     colMap={ASSET_COL_MAP}
 *     parseRow={(row, colMap, ctx) => ({...})}
 *     validateRow={row => row.nome ? null : "Nome obbligatorio"}
 *     previewCols={["nome","tipo","cliente","stato"]}
 *     previewLabels={{nome:"Nome",tipo:"Tipo",cliente:"Cliente",stato:"Stato"}}
 *     onImport={async (righeValide) => { /* bulk insert *\/ }}
 *     templateHeaders={["Nome","Tipo","Cliente","Stato","Note"]}
 *     templateNome="template-asset.csv"
 *     ctx={{ clienti: [...] }}
 *     onDone={() => {}}
 *   />
 */
import React, { useState, useRef, useCallback } from "react";

// ─── Utility: parse CSV ───────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.replace(/^["']|["']$/g, "").trim());
  const rows = lines.slice(1).map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

// ─── Utility: normalizza header per matching ──────────────────────────────
export function normHeader(h) {
  return h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

export function matchHeader(header, variants) {
  const n = normHeader(header);
  return variants.some(v => {
    const vn = normHeader(v);
    return n === vn || n.startsWith(vn) || vn.startsWith(n);
  });
}

export function buildColMap(headers, colMap) {
  const result = {};
  for (const h of headers) {
    for (const [field, variants] of Object.entries(colMap)) {
      if (matchHeader(h, variants)) { result[h] = field; break; }
    }
  }
  return result;
}

// ─── Utility: scarica template CSV ───────────────────────────────────────
export function downloadTemplate(headers, filename) {
  const bom = "\uFEFF";
  const csv = bom + headers.join(",") + "\n";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename || "template.csv";
  a.click();
}

// ─── Componente principale ────────────────────────────────────────────────
export function ImportaCSV({
  titolo = "Importa dati",
  colMap = {},
  parseRow,           // (rawRow, builtColMap, ctx) => oggetto parsato
  validateRow,        // (parsedRow) => string|null — null = ok
  previewCols = [],   // campi da mostrare nella preview
  previewLabels = {}, // { campo: "Etichetta" }
  onImport,           // async (righeValide) => void — esegue il salvataggio
  templateHeaders = [],
  templateNome = "template.csv",
  ctx = {},           // contesto extra (es. { clienti })
  onDone,
}) {
  const [step, setStep]         = useState("upload");   // upload | preview | done
  const [rows, setRows]         = useState([]);         // righe parsate
  const [errors, setErrors]     = useState([]);         // righe con errori
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult]     = useState({ ok: 0, err: 0 });
  const inputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);

    let rawRows = [];

    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      const { rows: r } = parseCSV(text);
      rawRows = r;
    } else {
      // Excel via SheetJS (se disponibile)
      try {
        const XLSX = await import("xlsx").catch(() => null);
        if (!XLSX) { console.warn("SheetJS non disponibile, usa CSV"); return; }
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      } catch (e) {
        console.error("Errore lettura Excel:", e);
        return;
      }
    }

    if (!rawRows.length) return;

    // Mappa colonne
    const headers = Object.keys(rawRows[0]);
    const builtColMap = buildColMap(headers, colMap);

    // Parsa ogni riga
    const parsed = rawRows.map((raw, i) => {
      try {
        const p = parseRow(raw, builtColMap, ctx);
        return { ...p, _row: i + 2, _raw: raw };
      } catch(e) {
        return { _row: i + 2, _raw: raw, _parseError: e.message };
      }
    });

    // Valida
    const valid = [], invalid = [];
    parsed.forEach(p => {
      if (p._parseError) { invalid.push({ ...p, _error: p._parseError }); return; }
      const err = validateRow ? validateRow(p, ctx) : null;
      if (err) invalid.push({ ...p, _error: err });
      else valid.push(p);
    });

    setRows(valid);
    setErrors(invalid);
    setStep("preview");
  }, [colMap, parseRow, validateRow, ctx]);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleImport = async () => {
    if (!rows.length || !onImport) return;
    setImporting(true);
    setProgress(0);
    try {
      const batch = 50;
      let ok = 0, err = 0;
      for (let i = 0; i < rows.length; i += batch) {
        const slice = rows.slice(i, i + batch);
        try {
          await onImport(slice);
          ok += slice.length;
        } catch(e) {
          err += slice.length;
          console.error("Import batch error:", e);
        }
        setProgress(Math.round((i + batch) / rows.length * 100));
      }
      setResult({ ok, err });
      setStep("done");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setStep("upload"); setRows([]); setErrors([]); setFileName(""); setProgress(0); };

  // ── Stili condivisi ─────────────────────────────────────────────────────
  const S = {
    box:   { background:"var(--surface)", borderRadius:"var(--radius-xl)", overflow:"hidden", display:"grid", gap:0 },
    head:  { padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" },
    body:  { padding:"20px" },
    foot:  { padding:"14px 20px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", gap:10 },
    badge: (c) => ({ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:c+"18", color:c, border:`1px solid ${c}33` }),
  };

  // ── STEP: Upload ─────────────────────────────────────────────────────────
  if (step === "upload") return (
    <div className="modal-box" style={S.box}>
      <div style={S.head}>
        <span style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:15 }}>{titolo}</span>
        {templateHeaders.length > 0 && (
          <button onClick={() => downloadTemplate(templateHeaders, templateNome)}
            style={{ fontSize:12, padding:"5px 12px", borderRadius:6, border:"1px solid var(--border)",
              background:"var(--surface-2)", cursor:"pointer", color:"var(--text-2)" }}>
            ↓ Template CSV
          </button>
        )}
      </div>
      <div style={S.body}>
        <div
          onDrop={handleDrop}
          onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
          onDragLeave={()=>setDragOver(false)}
          onClick={()=>inputRef.current?.click()}
          style={{
            border:`2px dashed ${dragOver?"var(--amber)":"var(--border)"}`,
            borderRadius:"var(--radius)", padding:"40px 20px", textAlign:"center",
            cursor:"pointer", transition:"all .15s", background:dragOver?"var(--amber)08":"transparent",
          }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📤</div>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>
            Trascina il file qui o clicca per scegliere
          </div>
          <div style={{ fontSize:12, color:"var(--text-3)" }}>CSV o Excel (.xlsx) supportati</div>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls"
            style={{ display:"none" }}
            onChange={e=>{ const f=e.target.files[0]; if(f) processFile(f); }} />
        </div>
        {fileName && (
          <div style={{ marginTop:12, fontSize:12, color:"var(--text-3)", textAlign:"center" }}>
            📄 {fileName}
          </div>
        )}
      </div>
    </div>
  );

  // ── STEP: Preview ────────────────────────────────────────────────────────
  if (step === "preview") return (
    <div className="modal-box" style={S.box}>
      <div style={S.head}>
        <div>
          <span style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:15 }}>{titolo} — Anteprima</span>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:3 }}>
            <span style={S.badge("#059669")}>✓ {rows.length} valide</span>
            {" "}
            {errors.length > 0 && <span style={S.badge("#EF4444")}>⚠ {errors.length} errori</span>}
          </div>
        </div>
        <button onClick={reset} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-3)", fontSize:20 }}>✕</button>
      </div>

      <div style={{ ...S.body, padding:"0" }}>
        <div style={{ overflowX:"auto", maxHeight:380 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"var(--surface-2)", position:"sticky", top:0 }}>
                <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:"var(--text-3)", borderBottom:"1px solid var(--border)", fontSize:11 }}>Riga</th>
                {previewCols.map(c => (
                  <th key={c} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:"var(--text-3)", borderBottom:"1px solid var(--border)", fontSize:11, whiteSpace:"nowrap" }}>
                    {previewLabels[c] || c}
                  </th>
                ))}
                <th style={{ padding:"8px 12px", textAlign:"center", fontWeight:700, color:"var(--text-3)", borderBottom:"1px solid var(--border)", fontSize:11 }}>Azione</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => (
                <tr key={i} style={{ borderBottom:"1px solid var(--border-dim)", background: i%2?"var(--surface-2)":"transparent" }}>
                  <td style={{ padding:"6px 12px", color:"var(--text-3)" }}>{r._row}</td>
                  {previewCols.map(c => (
                    <td key={c} style={{ padding:"6px 12px", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {r[c] !== undefined && r[c] !== null ? String(r[c]) : <span style={{color:"var(--text-3)"}}>—</span>}
                    </td>
                  ))}
                  <td style={{ padding:"6px 12px", textAlign:"center" }}>
                    <span style={S.badge(r.id ? "#3B82F6" : "#059669")}>{r.id ? "Aggiorna" : "Inserisci"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && (
            <div style={{ padding:"10px 12px", fontSize:12, color:"var(--text-3)", textAlign:"center", background:"var(--surface-2)" }}>
              Mostrando le prime 100 righe di {rows.length}
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div style={{ padding:"12px 16px", background:"#FEF2F2", borderTop:"1px solid #FECACA" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#991B1B", marginBottom:8 }}>
              ⚠ {errors.length} righe con errori (verranno saltate):
            </div>
            {errors.slice(0, 5).map((e, i) => (
              <div key={i} style={{ fontSize:11, color:"#991B1B", marginBottom:2 }}>
                Riga {e._row}: {e._error}
              </div>
            ))}
            {errors.length > 5 && <div style={{ fontSize:11, color:"#991B1B" }}>...e altri {errors.length - 5}</div>}
          </div>
        )}
      </div>

      <div style={S.foot}>
        <button onClick={reset} className="btn-ghost">← Cambia file</button>
        <button onClick={handleImport} disabled={!rows.length || importing} className="btn-primary">
          {importing
            ? `Importazione ${progress}%...`
            : `📥 Importa ${rows.length} righe`}
        </button>
      </div>
    </div>
  );

  // ── STEP: Done ───────────────────────────────────────────────────────────
  return (
    <div className="modal-box" style={S.box}>
      <div style={{ ...S.body, textAlign:"center", padding:"40px 20px" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>{result.err === 0 ? "✅" : "⚠️"}</div>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>
          {result.err === 0 ? "Importazione completata!" : "Importazione con avvisi"}
        </div>
        <div style={{ fontSize:13, color:"var(--text-2)", marginBottom:20 }}>
          {result.ok} righe importate con successo
          {result.err > 0 && `, ${result.err} errori`}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={reset} className="btn-ghost">↑ Importa altro</button>
          {onDone && <button onClick={onDone} className="btn-primary">Fatto</button>}
        </div>
      </div>
    </div>
  );
}
