import React, { useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";

// Mappatura flessibile colonne → campi DB
const COL_MAP = {
  rs:       ["ragione sociale","ragionesociale","rs","nome","name","azienda","company","cliente","client","denominazione"],
  piva:     ["p.iva","piva","partita iva","partitaiva","vat","cf","codice fiscale","tax"],
  contatto: ["contatto","referente","contact","nome referente","responsabile","persona"],
  tel:      ["telefono","tel","phone","cellulare","mobile","fax"],
  email:    ["email","mail","e-mail","pec"],
  ind:      ["indirizzo","address","sede","via","street","ind"],
  settore:  ["settore","sector","industry","categoria","tipo","category","attività"],
  note:     ["note","notes","obs","commenti","info","descrizione"],
};

function mapHeader(header) {
  const h = header.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  for (const [field, variants] of Object.entries(COL_MAP)) {
    if (variants.some(v => h === v.replace(/[^a-z0-9]/g, "") || h.startsWith(v.replace(/[^a-z0-9]/g, "")))) {
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
    rs:       r.rs || "",
    piva:     r.piva || "",
    contatto: r.contatto || "",
    tel:      r.tel || "",
    email:    r.email || "",
    ind:      r.ind || "",
    settore:  r.settore || "",
    note:     r.note || "",
  };
}

export function ImportaClienti({ tenantId, userId, onDone }) {
  const [step, setStep]       = useState("upload");
  const [rows, setRows]       = useState([]);
  const [errors, setErrors]   = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [fileName, setFileName]   = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const [colMap, setColMap]       = useState({});
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
        if (file.name.toLowerCase().endsWith(".csv")) {
          const text = new TextDecoder("utf-8").decode(e.target.result);
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          const sep = lines[0].includes(";") ? ";" : ",";
          const headers = lines[0].split(sep).map(h => h.replace(/["']/g, "").trim());
          rawRows = lines.slice(1).map(line => {
            const vals = line.split(sep).map(v => v.replace(/["']/g, "").trim());
            const obj = {};
            headers.forEach((h, i) => obj[h] = vals[i] ?? "");
            return obj;
          });
        } else {
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        }

        const firstRow = rawRows[0] || {};
        const map = {};
        for (const col of Object.keys(firstRow)) {
          const field = mapHeader(col);
          if (field) map[col] = field;
        }
        setColMap(map);

        const parsed = rawRows
          .filter(r => Object.values(r).some(v => v !== ""))
          .map(r => parseRow(r, map));

        const errs = [];
        parsed.forEach((r, i) => {
          if (!r.rs) errs.push(`Riga ${i + 2}: ragione sociale mancante`);
        });

        setRows(parsed.filter(r => r.rs));
        setErrors(errs);
        setStep("preview");
      } catch (err) {
        setErrors([`Errore lettura file: ${err.message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const importa = async () => {
    setImporting(true);
    setStep("import");
    const BATCH = 100;
    let imported = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map(r => ({ ...r, tenant_id: tenantId, user_id: userId }));
      const { error } = await supabase.from("clienti").insert(batch);
      if (error) { setErrors([`Errore import: ${error.message}`]); setStep("upload"); setImporting(false); return; }
      imported += batch.length;
      setProgress(Math.round(imported / rows.length * 100));
    }
    setStep("done");
    setImporting(false);
    setTimeout(() => onDone?.(), 1500);
  };

  const colonne = Object.values(colMap);
  const riconosciute = [...new Set(colonne)];

  const st = {
    drop: { border: `2px dashed ${dragOver ? "var(--amber)" : "var(--border-dim)"}`, borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: "pointer", transition: "all .2s", background: dragOver ? "#FFFBEB" : "var(--surface-2)" },
    th:   { fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", padding: "6px 10px", borderBottom: "2px solid var(--border)", textAlign: "left", whiteSpace: "nowrap" },
    td:   { fontSize: 12, padding: "6px 10px", borderBottom: "1px solid var(--border)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  };

  return (
    <div style={{ padding: "20px 24px" }}>

      {/* ── Upload ── */}
      {step === "upload" && (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📥 Importa clienti da file</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
            CSV o Excel — le colonne vengono riconosciute automaticamente.
          </div>

          <div style={st.drop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
              onChange={e => processFile(e.target.files[0])} />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Trascina il file o clicca per selezionarlo</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>CSV (.csv) · Excel (.xlsx, .xls)</div>
          </div>

          {/* Template */}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>📋 Formato accettato (varianti di nome colonna riconosciute):</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 4, marginBottom: 10 }}>
              {Object.entries(COL_MAP).map(([field, variants]) => (
                <div key={field} style={{ fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color: "var(--amber)" }}>{field}</span>
                  <span style={{ color: "var(--text-3)" }}> — {variants.slice(0, 3).join(", ")}</span>
                </div>
              ))}
            </div>
            <button onClick={() => {
              const csv = "ragione sociale;p.iva;contatto;telefono;email;indirizzo;settore;note\nRossi Srl;01234567890;Mario Rossi;+39 02 123456;info@rossi.it;Via Roma 1 Milano;Industria;\nBianchi Spa;09876543210;Luigi Bianchi;+39 011 654321;info@bianchi.it;Corso Torino 5;Edilizia;Cliente VIP";
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "template_clienti.csv"; a.click();
            }} style={{ padding: "5px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 5, fontSize: 11, cursor: "pointer", color: "var(--text-2)" }}>
              ⬇ Scarica template CSV
            </button>
          </div>

          {errors.length > 0 && (
            <div style={{ marginTop: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px" }}>
              {errors.map((e, i) => <div key={`err-${i}-${e.slice(0,20)}`} style={{ fontSize: 12, color: "#DC2626" }}>❌ {e}</div>)}
            </div>
          )}
        </>
      )}

      {/* ── Preview ── */}
      {step === "preview" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🔍 Anteprima — {rows.length} clienti trovati</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{fileName}</div>
              {riconosciute.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {riconosciute.map(f => (
                    <span key={f} style={{ fontSize: 10, fontWeight: 700, background: "#ECFDF5", color: "#065F46", padding: "2px 6px", borderRadius: 4 }}>✓ {f}</span>
                  ))}
                  {Object.keys(COL_MAP).filter(f => !riconosciute.includes(f)).map(f => (
                    <span key={f} style={{ fontSize: 10, background: "var(--surface-3)", color: "var(--text-3)", padding: "2px 6px", borderRadius: 4 }}>— {f}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => { setStep("upload"); setRows([]); setErrors([]); }}
                style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", cursor: "pointer", fontSize: 13 }}>
                ← Ricarica
              </button>
              <button onClick={importa} disabled={rows.length === 0}
                style={{ padding: "7px 20px", background: "var(--amber)", color: "#0D1B2A", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ✓ Importa {rows.length} clienti
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div style={{ marginBottom: 10, background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 6, padding: "8px 12px" }}>
              {errors.slice(0, 5).map((e, i) => <div key={`err5-${i}`} style={{ fontSize: 11, color: "#92400E" }}>⚠ {e}</div>)}
              {errors.length > 5 && <div style={{ fontSize: 11, color: "#92400E" }}>...e altri {errors.length - 5} avvisi</div>}
            </div>
          )}

          <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--surface-2)" }}>
                <tr>
                  {["Ragione sociale","P.IVA","Contatto","Telefono","Email","Indirizzo","Settore"].map(h =>
                    <th key={h} style={st.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                    <td style={{ ...st.td, fontWeight: 600 }}>{r.rs}</td>
                    <td style={{ ...st.td, fontFamily: "monospace", fontSize: 11 }}>{r.piva || "—"}</td>
                    <td style={st.td}>{r.contatto || "—"}</td>
                    <td style={st.td}>{r.tel || "—"}</td>
                    <td style={{ ...st.td, color: r.email ? "var(--text-1)" : "var(--text-3)" }}>{r.email || "—"}</td>
                    <td style={st.td}>{r.ind || "—"}</td>
                    <td style={st.td}>{r.settore || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Importing ── */}
      {step === "import" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Importazione in corso...</div>
          <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden", maxWidth: 400, margin: "0 auto" }}>
            <div style={{ height: "100%", background: "var(--amber)", borderRadius: 99, transition: "width .3s", width: progress + "%" }} />
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>{progress}% — {Math.round(rows.length * progress / 100)}/{rows.length} clienti</div>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{rows.length} clienti importati!</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>La lista clienti è stata aggiornata.</div>
        </div>
      )}
    </div>
  );
}
