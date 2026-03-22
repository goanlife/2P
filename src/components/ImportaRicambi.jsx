import React, { useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";

const UNITA_VALIDE = ["pz", "m", "m²", "kg", "l", "h", "conf.", "set", "rotolo"];

// Mappa colonne flessibile (gestisce varianti di nome)
const COL_MAP = {
  nome:      ["nome","name","descrizione","description","articolo","prodotto"],
  codice:    ["codice","sku","cod","code","riferimento","ref","part number","part_number"],
  unita:     ["unita","unità","unit","um","u.m.","misura","uom"],
  prezzo:    ["prezzo","price","costo","cost","€","euro","importo","val","valore"],
  categoria: ["categoria","category","tipo","type","famiglia","group","gruppo"],
  note:      ["note","notes","fornitore","supplier","descrizione2","obs","info"],
};

function mapHeader(header) {
  const h = header.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  for (const [field, variants] of Object.entries(COL_MAP)) {
    if (variants.some(v => h === v.replace(/[^a-z0-9]/g, "") || h.includes(v.replace(/[^a-z0-9]/g, "")))) {
      return field;
    }
  }
  return null;
}

function parseRow(row, colMap) {
  const r = {};
  for (const [col, field] of Object.entries(colMap)) {
    r[field] = (row[col] ?? "").toString().trim();
  }
  return {
    nome:      r.nome || "",
    codice:    r.codice || null,
    unita:     r.unita || "pz",
    prezzo:    r.prezzo ? parseFloat(r.prezzo.replace(",", ".").replace(/[^0-9.]/g, "")) || null : null,
    categoria: r.categoria || null,
    note:      r.note || null,
  };
}

export function ImportaRicambi({ tenantId, onDone }) {
  const [step, setStep]           = useState("upload"); // upload | preview | import | done
  const [rows, setRows]           = useState([]);
  const [errors, setErrors]       = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [fileName, setFileName]   = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef();

  const processFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // Lazy import XLSX solo quando serve (risparmia ~300KB nel bundle iniziale)
        const XLSX = await import("xlsx");
        let rawRows = [];

        if (file.name.endsWith(".csv")) {
          // Parse CSV
          const text = new TextDecoder("utf-8").decode(e.target.result);
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          const sep = lines[0].includes(";") ? ";" : ",";
          const headers = lines[0].split(sep).map(h => h.replace(/"/g, "").trim());
          rawRows = lines.slice(1).map(line => {
            const vals = line.split(sep).map(v => v.replace(/"/g, "").trim());
            const obj = {};
            headers.forEach((h, i) => obj[h] = vals[i] ?? "");
            return obj;
          });
        } else {
          // Parse Excel
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        }

        // Mappa colonne
        const firstRow = rawRows[0] || {};
        const colMap = {};
        for (const col of Object.keys(firstRow)) {
          const field = mapHeader(col);
          if (field) colMap[col] = field;
        }

        const parsed = rawRows
          .filter(r => Object.values(r).some(v => v !== ""))
          .map(r => parseRow(r, colMap));

        const errs = [];
        parsed.forEach((r, i) => {
          if (!r.nome) errs.push(`Riga ${i + 2}: nome mancante`);
        });

        setRows(parsed.filter(r => r.nome));
        setErrors(errs);
        setStep("preview");
      } catch (err) {
        setErrors([`Errore lettura file: ${err.message}`]);
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const handleFile = (file) => processFile(file);

  const importa = async () => {
    setImporting(true);
    setStep("import");
    const BATCH = 50;
    let imported = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map(r => ({ ...r, tenant_id: tenantId }));
      // Separa record con codice (upsert) da quelli senza (insert)
      const conCodice = batch.filter(r => r.codice);
      const senzaCodice = batch.filter(r => !r.codice);
      if (conCodice.length) await supabase.from("ricambi").upsert(conCodice, { onConflict: "tenant_id,codice" });
      if (senzaCodice.length) await supabase.from("ricambi").insert(senzaCodice);
      imported += batch.length;
      setProgress(Math.round(imported / rows.length * 100));
    }

    setStep("done");
    setImporting(false);
    setTimeout(() => onDone?.(), 1500);
  };

  const st = {
    wrap: { padding: "20px 24px" },
    drop: { border: `2px dashed ${dragOver ? "var(--amber)" : "var(--border-dim)"}`, borderRadius: 12, padding: "40px 20px", textAlign: "center", cursor: "pointer", transition: "all .2s", background: dragOver ? "#FFFBEB" : "var(--surface-2)" },
    th: { fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", padding: "6px 10px", borderBottom: "2px solid var(--border)", textAlign: "left" },
    td: { fontSize: 12, padding: "6px 10px", borderBottom: "1px solid var(--border)" },
    badge: (ok) => ({ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: ok ? "#ECFDF5" : "#FEF3C7", color: ok ? "#065F46" : "#92400E" }),
  };

  return (
    <div style={st.wrap}>
      {/* Step: Upload */}
      {step === "upload" && (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📥 Importa ricambi da file</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
            Supporta CSV e Excel (.xlsx). Colonne riconosciute automaticamente: nome, codice, unità, prezzo, categoria, note/fornitore.
          </div>

          {/* Drop zone */}
          <div style={st.drop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])} />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Trascina il file qui o clicca per selezionarlo</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>CSV (.csv) · Excel (.xlsx, .xls)</div>
          </div>

          {/* Template download */}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>📋 Formato atteso (esempio):</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-2)", overflowX: "auto", whiteSpace: "nowrap" }}>
              nome;codice;unita;prezzo;categoria;note<br />
              Filtro olio;FO-001;pz;12.50;Filtri;Fornitore XYZ<br />
              Cinghia distribuzione;CD-002;pz;45.00;Cinghie;<br />
              Guarnizione testata;GT-003;pz;28.00;Guarnizioni;
            </div>
            <button onClick={() => {
              const csv = "nome;codice;unita;prezzo;categoria;note\nFiltro olio;FO-001;pz;12.50;Filtri;Fornitore XYZ\nCinghia distribuzione;CD-002;pz;45.00;Cinghie;";
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "template_ricambi.csv"; a.click();
            }} style={{ marginTop: 10, padding: "5px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 5, fontSize: 11, cursor: "pointer", color: "var(--text-2)" }}>
              ⬇ Scarica template CSV
            </button>
          </div>

          {errors.length > 0 && (
            <div style={{ marginTop: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px" }}>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: "#DC2626" }}>❌ {e}</div>)}
            </div>
          )}
        </>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🔍 Anteprima — {rows.length} ricambi trovati</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{fileName}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setStep("upload"); setRows([]); setErrors([]); }}
                style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", cursor: "pointer", fontSize: 13 }}>
                ← Ricarica
              </button>
              <button onClick={importa} disabled={rows.length === 0}
                style={{ padding: "7px 20px", background: "var(--amber)", color: "#0D1B2A", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ✓ Importa {rows.length} ricambi
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div style={{ marginBottom: 10, background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 6, padding: "8px 12px" }}>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: "#92400E" }}>⚠ {e}</div>)}
            </div>
          )}

          <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--surface-2)" }}>
                <tr>
                  {["Nome","Codice","Unità","Prezzo","Categoria","Note"].map(h =>
                    <th key={h} style={st.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                    <td style={st.td}><strong>{r.nome}</strong></td>
                    <td style={st.td}><span style={{ fontFamily: "monospace", fontSize: 11 }}>{r.codice || "—"}</span></td>
                    <td style={st.td}><span style={st.badge(UNITA_VALIDE.includes(r.unita))}>{r.unita}</span></td>
                    <td style={st.td}>{r.prezzo ? `€${r.prezzo.toFixed(2)}` : "—"}</td>
                    <td style={st.td}>{r.categoria || "—"}</td>
                    <td style={st.td} title={r.note || ""}>{r.note ? r.note.slice(0, 30) + (r.note.length > 30 ? "…" : "") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Step: Import */}
      {step === "import" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Importazione in corso...</div>
          <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden", maxWidth: 400, margin: "0 auto" }}>
            <div style={{ height: "100%", background: "var(--amber)", borderRadius: 99, transition: "width .3s", width: progress + "%" }} />
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>{progress}% completato</div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{rows.length} ricambi importati con successo!</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>Il catalogo è stato aggiornato.</div>
        </div>
      )}
    </div>
  );
}
