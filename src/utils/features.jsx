import { useState, useEffect } from "react";
// ─── Feature 9: Export CSV ───────────────────────────────────────────────────
export function exportCSV(man, clienti, assets, operatori, filtrate) {
  const rows = filtrate || man;
  const headers = ["ID","Titolo","Tipo","Stato","Priorità","Data","Durata(min)","Operatore","Cliente","Asset","Note","Chiuso_at","Ore_effettive"];

  const escape = v => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };

  const lines = [
    headers.join(","),
    ...rows.map(m => {
      const cl = clienti.find(c => c.id === m.clienteId);
      const as = assets.find(a => a.id === m.assetId);
      const op = operatori.find(o => o.id === m.operatoreId);
      return [
        m.id, m.titolo, m.tipo, m.stato, m.priorita,
        m.data, m.durata, op?.nome || "", cl?.rs || "", as?.nome || "",
        m.note || "", m.chiusoAt || "", m.oreEffettive || "",
      ].map(escape).join(",");
    }),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `manutenzioni_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Feature 10: QR Code (usando API qr-server) ──────────────────────────────

export function QRCodeAsset({ asset, onClose }) {
  const [size] = useState(200);
  const testo = `ASSET: ${asset.nome}\nMatricola: ${asset.matricola || "N/D"}\nTipo: ${asset.tipo || "N/D"}\nUbicazione: ${asset.ubicazione || "N/D"}`;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(testo)}&format=svg`;

  const stampa = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>QR Code - ${asset.nome}</title>
      <style>body{font-family:sans-serif;padding:24px;text-align:center}
      h2{margin-bottom:4px}p{color:#666;margin:4px 0}img{margin:16px 0;display:block;margin:20px auto}
      @media print{button{display:none}}</style></head>
      <body>
        <h2>${asset.nome}</h2>
        ${asset.tipo ? `<p>${asset.tipo}</p>` : ""}
        ${asset.matricola ? `<p>Matricola: ${asset.matricola}</p>` : ""}
        ${asset.ubicazione ? `<p>Ubicazione: ${asset.ubicazione}</p>` : ""}
        <img src="${url}" width="${size}" height="${size}" />
        <button onclick="window.print()">🖨 Stampa</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(13,27,42,.7)",
      backdropFilter: "blur(4px)", zIndex: 3000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)", padding: "28px 32px",
        width: "min(380px, 100%)", textAlign: "center",
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 16 }}>QR Code — {asset.nome}</div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <img src={url} alt="QR Code" width={size} height={size} style={{ margin: "0 auto 16px", display: "block", border: "1px solid var(--border)", borderRadius: 8, padding: 8, background: "white" }} />
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 16, lineHeight: 1.5 }}>
          {testo.split("\n").map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={stampa} style={{ flex: 1, padding: "10px", background: "var(--navy)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: "pointer" }}>
            🖨 Stampa / Salva
          </button>
          <button onClick={onClose} style={{ padding: "10px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "var(--surface)" }}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Feature 5: Verbale PDF ──────────────────────────────────────────────────
export function stampaVerbale(m, cliente, asset, operatore) {
  const win = window.open("", "_blank");
  const dataStampa = new Date().toLocaleDateString("it-IT");
  const fmtD = d => d ? new Date(d + "T00:00:00").toLocaleDateString("it-IT") : "—";

  win.document.write(`
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Verbale Intervento — ${m.titolo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #0D1B2A; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 800; color: #0D1B2A; letter-spacing: -.02em; }
    .logo span { color: #F59E0B; }
    .meta { text-align: right; font-size: 11px; color: #666; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${m.stato === "completata" ? "#ECFDF5" : "#FEF2F2"}; color: ${m.stato === "completata" ? "#065F46" : "#991B1B"}; border: 1px solid ${m.stato === "completata" ? "#A7F3D0" : "#FECACA"}; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .box { background: #F8F6F1; border: 1px solid #E2DDD4; border-radius: 8px; padding: 14px 16px; }
    .box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #888; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E2DDD4; font-size: 12px; }
    .row:last-child { border-bottom: none; }
    .row label { color: #666; }
    .row value { font-weight: 600; }
    .note { background: #F8F6F1; border: 1px solid #E2DDD4; border-radius: 8px; padding: 14px 16px; margin: 16px 0; white-space: pre-wrap; font-size: 12px; min-height: 80px; }
    .firma-box { border: 2px solid #E2DDD4; border-radius: 8px; min-height: 100px; display: flex; align-items: center; justify-content: center; background: white; overflow: hidden; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2DDD4; font-size: 11px; color: #888; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Manu<span>Man</span></div>
      <div style="font-size:11px;color:#888;margin-top:4px">Gestione Manutenzioni</div>
    </div>
    <div class="meta">
      <div>Verbale di intervento</div>
      <div>Data stampa: ${dataStampa}</div>
      <div>Rif. #${m.id}</div>
    </div>
  </div>

  <h1>${m.titolo}</h1>
  <div style="margin: 8px 0 20px; display:flex; gap:8px; align-items:center;">
    <span class="badge">${m.stato === "completata" ? "✓ Completato" : m.stato}</span>
    <span style="font-size:12px;color:#666">${m.tipo === "ordinaria" ? "Manutenzione Ordinaria" : "Manutenzione Straordinaria"}</span>
    ${m.priorita === "urgente" ? '<span style="font-size:11px;font-weight:700;color:#EF4444">⚡ URGENTE</span>' : ""}
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Dettagli intervento</div>
      <div class="row"><label>Data pianificata</label><value>${fmtD(m.data)}</value></div>
      <div class="row"><label>Durata pianificata</label><value>${m.durata} min (${Math.round(m.durata / 60 * 10) / 10}h)</value></div>
      ${m.oreEffettive ? `<div class="row"><label>Ore effettive</label><value>${m.oreEffettive}h</value></div>` : ""}
      ${m.chiusoAt ? `<div class="row"><label>Chiuso il</label><value>${new Date(m.chiusoAt).toLocaleString("it-IT")}</value></div>` : ""}
    </div>
    <div class="box">
      <div class="box-title">Riferimenti</div>
      ${cliente ? `<div class="row"><label>Cliente</label><value>${cliente.rs}</value></div>` : ""}
      ${asset ? `<div class="row"><label>Asset</label><value>${asset.nome}</value></div>` : ""}
      ${asset?.matricola ? `<div class="row"><label>Matricola</label><value>${asset.matricola}</value></div>` : ""}
      ${asset?.ubicazione ? `<div class="row"><label>Ubicazione</label><value>${asset.ubicazione}</value></div>` : ""}
      ${operatore ? `<div class="row"><label>Tecnico</label><value>${operatore.nome}</value></div>` : ""}
    </div>
  </div>

  ${m.note ? `<div class="box-title" style="margin-top:16px">Note iniziali</div><div class="note">${m.note}</div>` : ""}
  ${m.noteChiusura ? `<div class="box-title">Note tecniche</div><div class="note">${m.noteChiusura}</div>` : ""}
  ${m.partiUsate ? `<div class="box-title">Materiali utilizzati</div><div class="note">${m.partiUsate}</div>` : ""}

  <div class="grid" style="margin-top:24px">
    <div>
      <div class="box-title">Firma tecnico</div>
      <div class="firma-box">
        ${m.firmaSvg ? `<img src="${m.firmaSvg}" style="max-width:100%;max-height:100px" />` : '<span style="color:#ccc;font-size:12px">Non firmato</span>'}
      </div>
      <div style="font-size:11px;color:#666;margin-top:6px;text-align:center">${operatore?.nome || ""}</div>
    </div>
    <div>
      <div class="box-title">Firma cliente</div>
      <div class="firma-box"><span style="color:#ccc;font-size:12px">Firma cliente</span></div>
      <div style="font-size:11px;color:#666;margin-top:6px;text-align:center">${cliente?.contatto || ""}</div>
    </div>
  </div>

  <div class="footer">
    <span>ManuMan — Documento generato automaticamente</span>
    <span>Pag. 1 di 1</span>
  </div>

  <div style="text-align:center;margin-top:24px">
    <button onclick="window.print()" style="padding:10px 24px;background:#0D1B2A;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">🖨 Stampa / Salva PDF</button>
  </div>
</body>
</html>
  `);
  win.document.close();
}

// ─── Feature 7: Log attività ─────────────────────────────────────────────────

export async function logAction(sb, entitaTipo, entitaId, azione, dettagli, nomeOp, uid) {
  try {
    await sb.from("log_attivita").insert({
      entita_tipo:    entitaTipo,
      entita_id:      entitaId,
      azione,
      dettagli:       dettagli || {},
      operatore_nome: nomeOp || "",
      user_id:        uid,
    });
  } catch (e) {
    // Silenziosa — il log non deve mai bloccare l'azione principale
    console.warn("Log fallito:", e);
  }
}

export function LogAttivita({ entitaTipo, entitaId, sb }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aperto, setAperto] = useState(false);


  useEffect(() => {
    if (!aperto || !entitaId) return;
    setLoading(true);
    sb.from("log_attivita")
      .select("*")
      .eq("entita_tipo", entitaTipo)
      .eq("entita_id", entitaId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { setLog(data || []); setLoading(false); });
  }, [aperto, entitaId, entitaTipo]);

  const iconaAzione = a => ({
    creato: "✨", modificato: "✏", stato_cambiato: "🔄",
    completato: "✅", allegato_aggiunto: "📎", allegato_rimosso: "🗑",
  }[a] || "📋");

  return (
    <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 12 }}>
      <button type="button" onClick={() => setAperto(v => !v)} style={{
        display: "flex", alignItems: "center", gap: 8, background: "none",
        border: "none", padding: "4px 0", cursor: "pointer",
        color: "var(--text-2)", fontWeight: 600, fontSize: 13, width: "100%",
      }}>
        <span>📋</span><span>Storico modifiche</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)" }}>{aperto ? "▲" : "▼"}</span>
      </button>
      {aperto && (
        <div style={{ marginTop: 10 }}>
          {loading && <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: 8 }}>Caricamento...</div>}
          {!loading && log.length === 0 && <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: 8, fontStyle: "italic" }}>Nessuna attività registrata</div>}
          {log.map(l => (
            <div key={l.id} style={{
              display: "flex", gap: 10, padding: "8px 0",
              borderBottom: "1px solid var(--border)", fontSize: 12,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{iconaAzione(l.azione)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{l.azione.replace("_", " ")}</div>
                {l.operatore_nome && <div style={{ color: "var(--text-3)", fontSize: 11 }}>da {l.operatore_nome}</div>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0, textAlign: "right" }}>
                {new Date(l.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
