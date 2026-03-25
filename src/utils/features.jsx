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

// ─── Feature 11: Rapporto OdL PDF ────────────────────────────────────────────
export function stampaRapportoOdL(odl, attivita=[], cliente, operatore, assets=[], tenantNome="") {
  const win = window.open("", "_blank");
  if (!win) { alert("Popup bloccato. Consenti i popup per questo sito."); return; }

  const now     = new Date();
  const dataStampa = now.toLocaleDateString("it-IT");
  const oraStampa  = now.toLocaleTimeString("it-IT", {hour:"2-digit",minute:"2-digit"});
  const fmtD = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
  const fmtDT= d => d ? new Date(d).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
  const fmtH = min => {
    if (!min) return "—";
    const h = Math.floor(min/60), m = min%60;
    return h>0 ? `${h}h${m>0?m+"m":""}` : `${m}m`;
  };

  const attComp  = attivita.filter(a=>a.stato==="completata");
  const attPend  = attivita.filter(a=>a.stato!=="completata");
  const oreStimate = attivita.reduce((s,a)=>s+(a.durata||0),0);
  const oreEffettive = attivita.reduce((s,a)=>s+(a.oreEffettive||0)*60,0); // in minuti
  const noteChiusura = attivita.filter(a=>a.noteChiusura).map(a=>a.noteChiusura).join("\n");
  const partiUsate   = attivita.filter(a=>a.partiUsate).map(a=>a.partiUsate).join("\n");
  const firmaSvg     = attivita.find(a=>a.firmaSvg)?.firmaSvg || null;

  const STATO_BADGE = {
    completata: {bg:"#ECFDF5",col:"#065F46",bd:"#A7F3D0",l:"Completata"},
    inCorso:    {bg:"#FEF3C7",col:"#92400E",bd:"#FDE68A",l:"In corso"},
    pianificata:{bg:"#EFF6FF",col:"#1E40AF",bd:"#BFDBFE",l:"Pianificata"},
    scaduta:    {bg:"#FEF2F2",col:"#991B1B",bd:"#FECACA",l:"Scaduta"},
  };
  const ODL_STATO = {
    completato: {bg:"#ECFDF5",col:"#065F46",l:"Completato"},
    in_corso:   {bg:"#FEF3C7",col:"#92400E",l:"In corso"},
    confermato: {bg:"#EFF6FF",col:"#1E40AF",l:"Confermato"},
    bozza:      {bg:"#F9FAFB",col:"#374151",l:"Bozza"},
  };
  const stato = ODL_STATO[odl.stato] || ODL_STATO.bozza;

  const attivitaRows = attivita.map(a => {
    const asset = assets.find(x=>x.id===a.assetId);
    const sb    = STATO_BADGE[a.stato] || STATO_BADGE.pianificata;
    return `
      <tr>
        <td style="padding:8px 10px;font-weight:600">${a.titolo||"—"}</td>
        <td style="padding:8px 10px;color:#555">${asset?.nome||"—"}</td>
        <td style="padding:8px 10px;text-align:center">
          <span style="background:${sb.bg};color:${sb.col};border:1px solid ${sb.bd};
            padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">${sb.l}</span>
        </td>
        <td style="padding:8px 10px;text-align:right">${fmtH(a.durata)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;color:${a.oreEffettive?"#059669":"#999"}">${a.oreEffettive?a.oreEffettive+"h":"—"}</td>
        <td style="padding:8px 10px;color:#555;font-size:11px">${a.noteChiusura||""}</td>
      </tr>`;
  }).join("");

  win.document.write(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Rapporto OdL ${odl.numero||"#"+odl.id}</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#1a1a1a; padding:32px 36px; max-width:860px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:18px; border-bottom:3px solid #0D1B2A; margin-bottom:24px; }
    .logo { font-size:24px; font-weight:800; color:#0D1B2A; letter-spacing:-.02em; }
    .logo span { color:#F59E0B; }
    .meta { text-align:right; font-size:11px; color:#666; line-height:1.8; }
    .odl-num { font-size:22px; font-weight:800; color:#0D1B2A; margin-bottom:4px; }
    .odl-title { font-size:16px; font-weight:600; margin-bottom:10px; }
    .badge { display:inline-block; padding:4px 12px; border-radius:99px; font-size:12px; font-weight:700; margin-right:8px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:20px 0; }
    .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin:20px 0; }
    .box { background:#F8F6F1; border:1px solid #E2DDD4; border-radius:8px; padding:14px 16px; }
    .box-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:10px; }
    .row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #EEE; font-size:12px; }
    .row:last-child { border-bottom:none; }
    .row label { color:#666; }
    .kpi { text-align:center; padding:14px; background:#F8F6F1; border:1px solid #E2DDD4; border-radius:8px; }
    .kpi-val { font-size:28px; font-weight:800; color:#0D1B2A; line-height:1; }
    .kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-top:6px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    thead tr { background:#0D1B2A; color:white; }
    thead th { padding:9px 10px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
    tbody tr { border-bottom:1px solid #EEE; }
    tbody tr:hover { background:#FAFAF9; }
    .note-box { background:#F8F6F1; border:1px solid #E2DDD4; border-radius:8px; padding:14px 16px; margin:8px 0; white-space:pre-wrap; font-size:12px; min-height:60px; }
    .firma-box { border:2px solid #E2DDD4; border-radius:8px; min-height:90px; display:flex; align-items:center; justify-content:center; background:white; }
    .footer { margin-top:32px; padding-top:14px; border-top:1px solid #E2DDD4; font-size:10px; color:#aaa; display:flex; justify-content:space-between; }
    .print-btn { text-align:center; margin-top:28px; }
    @media print {
      body { padding:16px; }
      .print-btn { display:none; }
      .footer { position:fixed; bottom:16px; left:36px; right:36px; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="logo">Manu<span>Man</span></div>
      <div style="font-size:11px;color:#888;margin-top:3px">${tenantNome||"Gestione Manutenzioni"}</div>
    </div>
    <div class="meta">
      <div style="font-weight:700;font-size:13px">Rapporto Ordine di Lavoro</div>
      <div>Stampato il: ${dataStampa} ore ${oraStampa}</div>
    </div>
  </div>

  <!-- TITOLO OdL -->
  <div class="odl-num">${odl.numero||"OdL #"+odl.id}</div>
  <div class="odl-title">${odl.titolo||""}</div>
  <div style="margin-bottom:20px">
    <span class="badge" style="background:${stato.bg};color:${stato.col}">${stato.l}</span>
    ${odl.data_fine && odl.data_fine!==odl.data_inizio
      ? `<span style="font-size:12px;color:#555">Intervento multi-giorno: ${fmtD(odl.data_inizio)} → ${fmtD(odl.data_fine)}</span>`
      : `<span style="font-size:12px;color:#555">Data intervento: ${fmtD(odl.data_inizio)}</span>`}
  </div>

  <!-- KPI -->
  <div class="grid3">
    <div class="kpi">
      <div class="kpi-val">${attivita.length}</div>
      <div class="kpi-label">Attività totali</div>
    </div>
    <div class="kpi" style="background:${attComp.length===attivita.length&&attivita.length>0?"#ECFDF5":"#F8F6F1"}">
      <div class="kpi-val" style="color:${attComp.length===attivita.length&&attivita.length>0?"#059669":"#0D1B2A"}">${attComp.length}</div>
      <div class="kpi-label">Completate</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">${oreEffettive>0?fmtH(oreEffettive):fmtH(oreStimate)}</div>
      <div class="kpi-label">${oreEffettive>0?"Ore effettive":"Ore stimate"}</div>
    </div>
  </div>

  <!-- INFO SITO + OPERATORE -->
  <div class="grid2">
    <div class="box">
      <div class="box-title">Cliente / Sito</div>
      ${cliente
        ? `<div class="row"><label>Ragione sociale</label><span style="font-weight:600">${cliente.rs}</span></div>
           ${cliente.ind?`<div class="row"><label>Indirizzo</label><span>${cliente.ind}</span></div>`:""}
           ${cliente.tel?`<div class="row"><label>Telefono</label><span>${cliente.tel}</span></div>`:""}
           ${cliente.contatto?`<div class="row"><label>Contatto</label><span>${cliente.contatto}</span></div>`:""}`
        : '<div style="color:#999;font-size:12px">Cliente non specificato</div>'}
    </div>
    <div class="box">
      <div class="box-title">Operatore / Tecnico</div>
      ${operatore
        ? `<div class="row"><label>Nome</label><span style="font-weight:600">${operatore.nome}</span></div>
           ${operatore.spec?`<div class="row"><label>Specializzazione</label><span>${operatore.spec}</span></div>`:""}
           ${operatore.email?`<div class="row"><label>Email</label><span>${operatore.email}</span></div>`:""}`
        : '<div style="color:#999;font-size:12px">Operatore non assegnato</div>'}
      ${odl.durata_stimata?`<div class="row"><label>Durata stimata</label><span>${fmtH(odl.durata_stimata)}</span></div>`:""}
    </div>
  </div>

  <!-- TABELLA ATTIVITÀ -->
  <div class="box-title" style="margin-top:8px">Dettaglio attività</div>
  ${attivita.length===0
    ? '<div style="color:#999;font-size:12px;padding:12px 0">Nessuna attività collegata a questo OdL.</div>'
    : `<table>
        <thead>
          <tr>
            <th>Attività</th>
            <th>Asset / Zona</th>
            <th style="text-align:center">Stato</th>
            <th style="text-align:right">Stimata</th>
            <th style="text-align:right">Effettiva</th>
            <th>Note chiusura</th>
          </tr>
        </thead>
        <tbody>${attivitaRows}</tbody>
      </table>`}

  <!-- NOTE + MATERIALI -->
  ${odl.note?`<div class="box-title" style="margin-top:20px">Note generali OdL</div><div class="note-box">${odl.note}</div>`:""}
  ${noteChiusura?`<div class="box-title" style="margin-top:16px">Note tecniche dalle attività</div><div class="note-box">${noteChiusura}</div>`:""}
  ${partiUsate?`<div class="box-title" style="margin-top:16px">Materiali e ricambi utilizzati</div><div class="note-box">${partiUsate}</div>`:""}

  <!-- FIRME -->
  <div class="grid2" style="margin-top:24px">
    <div>
      <div class="box-title">Firma tecnico</div>
      <div class="firma-box">
        ${firmaSvg
          ? `<img src="${firmaSvg}" style="max-width:100%;max-height:90px;object-fit:contain" />`
          : '<span style="color:#ccc;font-size:12px">Non firmato</span>'}
      </div>
      <div style="font-size:11px;color:#666;margin-top:6px;text-align:center">${operatore?.nome||""}</div>
    </div>
    <div>
      <div class="box-title">Firma e accettazione cliente</div>
      <div class="firma-box"><span style="color:#ccc;font-size:12px">__________________________</span></div>
      <div style="font-size:11px;color:#666;margin-top:6px;text-align:center">${cliente?.contatto||cliente?.rs||""}</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>ManuMan — Rapporto generato automaticamente il ${dataStampa}</span>
    <span>${odl.numero||"OdL #"+odl.id}</span>
  </div>

  <!-- STAMPA BUTTON -->
  <div class="print-btn">
    <button onclick="window.print()"
      style="padding:11px 28px;background:#0D1B2A;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:12px">
      🖨 Stampa / Salva PDF
    </button>
    <button onclick="window.close()"
      style="padding:11px 20px;background:#F1F5F9;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer">
      Chiudi
    </button>
  </div>

</body>
</html>`);
  win.document.close();
}
