import { useI18n } from "../i18n/index.jsx";
import { generaReportMensile } from "./AIAssistente";
import React, { useState, useMemo } from "react";
import { HelpButton } from "./HelpPanel";

// ── helpers ───────────────────────────────────────────────────────────────
const fmtD  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const fmtDT = d => d ? new Date(d).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtH  = min => {
  if (!min && min!==0) return "—";
  const h = Math.floor(min/60), m = min%60;
  return h>0 ? `${h}h${m>0?m+"m":""}` : `${m}m`;
};
const esc = v => {
  if (v==null||v==="") return "";
  const s=String(v);
  return s.includes(",")||s.includes('"')||s.includes("\n")?`"${s.replace(/"/g,'""')}"`:`${s}`;
};
const downloadCSV = (headers, rows, filename) => {
  const csv=["\uFEFF"+headers.join(","), ...rows.map(r=>r.map(esc).join(","))].join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  a.download=filename; a.click(); URL.revokeObjectURL(a.href);
};
const oggi = () => new Date().toISOString().split("T")[0];
const meseInizio = () => { const d=new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
const meseFinePrecedente = () => {
  const d=new Date(); d.setDate(0); return d.toISOString().split("T")[0];
};

// ── Catalogo report ────────────────────────────────────────────────────────
const CATALOGO = [
  // PER IL CLIENTE
  { id:"interventi_cliente",   cat:"cliente",  icon:"📋", titolo:"Rapporto interventi per cliente",
    desc:"Tutti gli interventi eseguiti in un periodo per un cliente specifico. Ideale per rendicontazione mensile.",
    campi:["cliente","periodo"] },
  { id:"stato_asset_cliente",  cat:"cliente",  icon:"⚙",  titolo:"Stato asset del cliente",
    desc:"Inventario impianti del cliente con stato attuale, ultime manutenzioni e scadenze imminenti.",
    campi:["cliente"] },
  { id:"scadenze_cliente",     cat:"cliente",  icon:"⚖",  titolo:"Scadenze normative del cliente",
    desc:"Adempimenti normativi obbligatori del cliente con stato e date di scadenza.",
    campi:["cliente"] },

  // PER IL FORNITORE / COSTI
  { id:"consuntivo_operatore", cat:"costi",    icon:"👤", titolo:"Consuntivo ore per operatore",
    desc:"Ore lavorate, tariffa oraria e costo totale per ciascun operatore nel periodo selezionato.",
    campi:["periodo"] },
  { id:"costi_per_cliente",    cat:"costi",    icon:"💶", titolo:"Analisi costi per cliente",
    desc:"Costo degli interventi (ore effettive × tariffa) per ogni cliente. Utile per verifica redditività.",
    campi:["periodo"] },
  { id:"budget_consuntivo",    cat:"costi",    icon:"📊", titolo:"Budget vs Consuntivo",
    desc:"Confronto tra ore stimate (budget) e ore effettive (consuntivo) per cliente e piano.",
    campi:["periodo"] },

  // PER L'AMMINISTRAZIONE
  { id:"registro_interventi",  cat:"admin",    icon:"📑", titolo:"Registro interventi completo",
    desc:"Export completo per contabilità: tutti gli interventi con codici, ore, costi, operatori.",
    campi:["periodo"] },
  { id:"odl_fatturabili",      cat:"admin",    icon:"🧾", titolo:"OdL completati fatturabili",
    desc:"Ordini di lavoro completati nel periodo con ore effettive e costo totale per la fatturazione.",
    campi:["periodo","cliente"] },

  // OPERATIVI
  { id:"piano_lavori",         cat:"operativo",icon:"🗓", titolo:"Piano lavori settimanale",
    desc:"Attività pianificate nei prossimi 7 giorni per tutti gli operatori. Utile per briefing settimanale.",
    campi:[] },
  { id:"attivita_critiche",    cat:"operativo",icon:"🚨", titolo:"Attività critiche e scadute",
    desc:"Tutte le attività urgenti, in ritardo o con SLA a rischio. Dashboard operativo per il responsabile.",
    campi:[] },
  { id:"asset_in_scadenza",    cat:"operativo",icon:"⏰", titolo:"Asset con scadenze imminenti",
    desc:"Impianti con manutenzione in scadenza, garanzia in scadenza o ore di utilizzo vicino alla soglia.",
    campi:[] },
];

const CAT_LABEL = {
  cliente:   { l:"Per il Cliente",              bg:"#EFF6FF", col:"#1E40AF", brd:"#BFDBFE" },
  costi:     { l:"Gestione Costi",            bg:"#ECFDF5", col:"#065F46", brd:"#A7F3D0" },
  admin:     { l:"Amministrazione",          bg:"#F5F3FF", col:"#4C1D95", brd:"#DDD6FE" },
  operativo: { l:"Operativi",                         bg:"#FEF3C7", col:"#92400E", brd:"#FDE68A" },
};

// ── Generatori HTML per window.print() ────────────────────────────────────

const htmlBase = (titolo, tenantNome, contenuto) => `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>${titolo}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:28px 32px;max-width:900px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #0D1B2A;margin-bottom:20px}
.logo{font-size:22px;font-weight:800;color:#0D1B2A;letter-spacing:-.02em}
.logo span{color:#F59E0B}
.meta{text-align:right;font-size:10px;color:#666;line-height:1.8}
h2{font-size:16px;font-weight:700;margin-bottom:4px}
.sub{font-size:11px;color:#888;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin:12px 0}
thead tr{background:#0D1B2A;color:white}
thead th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
tbody tr{border-bottom:1px solid #eee}
tbody tr:hover{background:#fafaf9}
td{padding:7px 10px;font-size:11px}
.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
.kpi{background:#F8F6F1;border:1px solid #E2DDD4;border-radius:8px;padding:12px 14px;text-align:center}
.kpi-val{font-size:26px;font-weight:800;color:#0D1B2A;line-height:1}
.kpi-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-top:5px}
.section{margin:20px 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;border-bottom:1px solid #eee;padding-bottom:4px}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #eee;font-size:9px;color:#aaa;display:flex;justify-content:space-between}
.print-btn{text-align:center;margin-top:24px}
@media print{body{padding:8px}.print-btn{display:none}.footer{position:fixed;bottom:8px;left:32px;right:32px}}
</style>
</head>
<body>
<div class="header">
  <div><div class="logo">Manu<span>Man</span></div><div style="font-size:10px;color:#888;margin-top:2px">${tenantNome||"Gestione Manutenzioni"}</div></div>
  <div class="meta"><div style="font-weight:700;font-size:12px">${titolo}</div><div>Generato: ${new Date().toLocaleString("it-IT")}</div></div>
</div>
${contenuto}
<div class="footer"><span>ManuMan — Report generato automaticamente</span><span>Pagina 1</span></div>
<div class="print-btn">
  <button onclick="window.print()" style="padding:10px 24px;background:#0D1B2A;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-right:10px">🖨 Stampa / Salva PDF</button>
  <button onclick="window.close()" style="padding:10px 18px;background:#F1F5F9;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">Chiudi</button>
</div>
</body></html>`;

function apriReport(html) {
  const w = window.open("","_blank");
  if (!w) { console.warn("Popup bloccato. Consenti i popup per questo sito."); return; }
  w.document.write(html); w.document.close();
}

// ── Generatori per ogni report ─────────────────────────────────────────────

function genInterventiCliente({ man, clienti, operatori, assets, clienteId, da, a, tenantNome }) {
  const cl   = clienti.find(c=>c.id===Number(clienteId));
  const rows = man.filter(m => m.clienteId===Number(clienteId) && m.data>=da && m.data<=a);
  const comp = rows.filter(r=>r.stato==="completata");
  const oreEff = rows.reduce((s,r)=>s+(r.oreEffettive||0),0);
  const oreStim = rows.reduce((s,r)=>s+(r.durata||0),0);

  const badge = s => {
    const B={completata:"background:#ECFDF5;color:#065F46",pianificata:"background:#EFF6FF;color:#1E40AF",scaduta:"background:#FEF2F2;color:#991B1B",inCorso:"background:#FEF3C7;color:#92400E"};
    return `<span class="badge" style="${B[s]||""}">${s}</span>`;
  };

  const righe = rows.map(r=>{
    const op = operatori.find(o=>o.id===r.operatoreId);
    const as = assets.find(a=>a.id===r.assetId);
    return `<tr>
      <td>${fmtD(r.data)}</td>
      <td style="font-weight:600">${r.titolo}</td>
      <td>${r.tipo==="ordinaria"?"Ordinaria":"Straordinaria"}</td>
      <td>${as?.nome||"—"}</td>
      <td>${op?.nome||"—"}</td>
      <td>${badge(r.stato)}</td>
      <td style="text-align:right">${fmtH(r.durata)}</td>
      <td style="text-align:right;font-weight:600;color:${r.oreEffettive?"#059669":"#999"}">${r.oreEffettive?r.oreEffettive+"h":"—"}</td>
    </tr>`;
  }).join("");

  const body = `
<h2>Rapporto Interventi — ${cl?.rs||"Cliente"}</h2>
<div class="sub">${fmtD(da)} → ${fmtD(a)}</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val">${rows.length}</div><div class="kpi-lbl">Totale</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#059669">${comp.length}</div><div class="kpi-lbl">Completati</div></div>
  <div class="kpi"><div class="kpi-val">${fmtH(oreStim)}</div><div class="kpi-lbl">Ore stimate</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#059669">${oreEff>0?oreEff+"h":"—"}</div><div class="kpi-lbl">Ore effettive</div></div>
</div>
${rows.length>0?`<table><thead><tr><th>Data</th><th>Intervento</th><th>Tipo</th><th>Asset</th><th>Tecnico</th><th>Stato</th><th style="text-align:right">Stimate</th><th style="text-align:right">Effettive</th></tr></thead><tbody>${righe}</tbody></table>`:"<div style='text-align:center;padding:20px;color:#999'>Nessun intervento nel periodo selezionato.</div>"}`;

  apriReport(htmlBase("Rapporto Interventi", tenantNome, body));
}

function genStatoAsset({ assets, clienti, man, clienteId, tenantNome }) {
  const lista = clienteId ? assets.filter(a=>a.clienteId===Number(clienteId)) : assets;
  const cl    = clienti.find(c=>c.id===Number(clienteId));

  const righe = lista.map(a => {
    const ultMat = man.filter(m=>m.assetId===a.id&&m.stato==="completata").sort((x,y)=>y.data.localeCompare(x.data))[0];
    const att    = man.filter(m=>m.assetId===a.id&&m.stato!=="completata").length;
    const gg = a.garanzia_al ? Math.ceil((new Date(a.garanzia_al)-new Date())/86400000) : null;
    const garBadge = gg!=null ? (gg<0?`<span style="color:#EF4444;font-weight:700">Scaduta</span>`:gg<30?`<span style="color:#F59E0B;font-weight:700">${gg}gg</span>`:`<span style="color:#059669">${fmtD(a.garanzia_al)}</span>`):"—";
    const soglia = a.soglia_ore&&a.ore_utilizzo ? Math.round(a.ore_utilizzo/a.soglia_ore*100) : null;
    const statoBadge = {attivo:"background:#ECFDF5;color:#065F46",manutenzione:"background:#FEF3C7;color:#92400E",inattivo:"background:#F1F5F9;color:#475569"}[a.stato]||"";
    return `<tr>
      <td style="font-weight:600">${a.nome}</td>
      <td>${a.tipo||"—"}</td>
      <td>${a.ubicazione||"—"}</td>
      <td><span class="badge" style="${statoBadge}">${a.stato}</span></td>
      <td>${ultMat?fmtD(ultMat.data):"Mai"}</td>
      <td>${att>0?`<span style="color:#EF4444;font-weight:700">${att}</span>`:"0"}</td>
      <td>${soglia!=null?`<div style="display:flex;align-items:center;gap:6px"><div style="width:60px;height:6px;background:#eee;border-radius:99px;overflow:hidden"><div style="height:100%;width:${Math.min(soglia,100)}%;background:${soglia>90?"#EF4444":soglia>70?"#F59E0B":"#059669"};border-radius:99px"></div></div>${soglia}%</div>`:"—"}</td>
      <td>${garBadge}</td>
    </tr>`;
  }).join("");

  const body=`
<h2>Stato Asset${cl?` — ${cl.rs}`:""}</h2>
<div class="sub">${lista.length} asset censiti</div>
<table><thead><tr><th>Asset</th><th>Tipo</th><th>Ubicazione</th><th>Stato</th><th>Ultima manut.</th><th>Attive</th><th>Utilizzo</th><th>Garanzia</th></tr></thead><tbody>${righe}</tbody></table>`;

  apriReport(htmlBase("Stato Asset", tenantNome, body));
}

function genConsuntivoOperatori({ man, operatori, da, a, tenantNome }) {
  const rows = man.filter(m=>m.data>=da&&m.data<=a&&m.stato==="completata");

  const perOp = operatori.map(op=>{
    const mine = rows.filter(r=>r.operatoreId===op.id);
    const oreEff = mine.reduce((s,r)=>s+(r.oreEffettive||0),0);
    const oreStim = Math.round(mine.reduce((s,r)=>s+(r.durata||0),0)/60*10)/10;
    const costo = op.tariffa_ora ? Math.round(oreEff*op.tariffa_ora) : null;
    return { op, n:mine.length, oreEff, oreStim, costo };
  }).filter(x=>x.n>0).sort((a,b)=>b.oreEff-a.oreEff);

  const totOre  = perOp.reduce((s,x)=>s+x.oreEff,0);
  const totCosto= perOp.reduce((s,x)=>s+(x.costo||0),0);

  const righe = perOp.map(({op,n,oreEff,oreStim,costo})=>`<tr>
    <td><div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:${op.col};flex-shrink:0"></div>${op.nome}</div></td>
    <td>${op.spec||"—"}</td>
    <td style="text-align:center">${n}</td>
    <td style="text-align:right">${oreStim}h</td>
    <td style="text-align:right;font-weight:600;color:#059669">${oreEff}h</td>
    <td style="text-align:right">${op.tariffa_ora?`€${op.tariffa_ora}/h`:"—"}</td>
    <td style="text-align:right;font-weight:700;color:#0D1B2A">${costo?`€${costo.toLocaleString("it-IT")}`:"—"}</td>
  </tr>`).join("");

  const body=`
<h2>Consuntivo Ore Operatori</h2>
<div class="sub">${fmtD(da)} → ${fmtD(a)}</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val">${perOp.length}</div><div class="kpi-lbl">Operatori</div></div>
  <div class="kpi"><div class="kpi-val">${rows.length}</div><div class="kpi-lbl">Interventi</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#059669">${totOre}h</div><div class="kpi-lbl">Ore tot. eff.</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#0D1B2A">${totCosto>0?`€${totCosto.toLocaleString("it-IT")}`:"—"}</div><div class="kpi-lbl">Costo totale</div></div>
</div>
<table><thead><tr><th>Operatore</th><th>Specializzazione</th><th style="text-align:center">Interventi</th><th style="text-align:right">Ore stim.</th><th style="text-align:right">Ore eff.</th><th style="text-align:right">Tariffa</th><th style="text-align:right">Costo</th></tr></thead><tbody>${righe}</tbody></table>`;

  apriReport(htmlBase("Consuntivo Operatori", tenantNome, body));
}

function genCostiCliente({ man, clienti, operatori, da, a, tenantNome }) {
  const rows = man.filter(m=>m.data>=da&&m.data<=a&&m.stato==="completata");

  const perCl = clienti.map(c=>{
    const mine = rows.filter(r=>r.clienteId===c.id);
    if (!mine.length) return null;
    const oreEff = mine.reduce((s,r)=>s+(r.oreEffettive||0),0);
    const costo = mine.reduce((s,r)=>{
      const op = operatori.find(o=>o.id===r.operatoreId);
      return s+(op?.tariffa_ora ? (r.oreEffettive||0)*op.tariffa_ora : 0);
    },0);
    return { c, n:mine.length, oreEff, costo:Math.round(costo) };
  }).filter(Boolean).sort((a,b)=>b.costo-a.costo||b.oreEff-a.oreEff);

  const totCosto = perCl.reduce((s,x)=>s+x.costo,0);

  const righe = perCl.map(({c,n,oreEff,costo})=>`<tr>
    <td style="font-weight:600">${c.rs}</td>
    <td>${c.settore||"—"}</td>
    <td style="text-align:center">${n}</td>
    <td style="text-align:right">${oreEff}h</td>
    <td style="text-align:right;font-weight:700;color:#0D1B2A">${costo>0?`€${costo.toLocaleString("it-IT")}`:"—"}</td>
    <td style="text-align:right">
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
        <div style="width:60px;height:6px;background:#eee;border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${totCosto>0?Math.round(costo/totCosto*100):0}%;background:#0D1B2A;border-radius:99px"></div>
        </div>
        ${totCosto>0?Math.round(costo/totCosto*100):0}%
      </div>
    </td>
  </tr>`).join("");

  const body=`
<h2>Analisi Costi per Cliente</h2>
<div class="sub">${fmtD(da)} → ${fmtD(a)}</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val">${perCl.length}</div><div class="kpi-lbl">Clienti</div></div>
  <div class="kpi"><div class="kpi-val">${rows.length}</div><div class="kpi-lbl">Interventi</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#059669">${totCosto>0?`€${totCosto.toLocaleString("it-IT")}`:"—"}</div><div class="kpi-lbl">Costo totale</div></div>
  <div class="kpi"><div class="kpi-val">${perCl.length>0?`€${Math.round(totCosto/perCl.length).toLocaleString("it-IT")}`:"—"}</div><div class="kpi-lbl">Media per cliente</div></div>
</div>
<table><thead><tr><th>Cliente</th><th>Settore</th><th style="text-align:center">Interventi</th><th style="text-align:right">Ore eff.</th><th style="text-align:right">Costo</th><th style="text-align:right">% totale</th></tr></thead><tbody>${righe}</tbody></table>`;

  apriReport(htmlBase("Costi per Cliente", tenantNome, body));
}

function genRegistroCompleto({ man, clienti, assets, operatori, da, a, tenantNome }) {
  const rows = man.filter(m=>m.data>=da&&m.data<=a).sort((a,b)=>a.data.localeCompare(b.data));
  const headers=["ID","N° Intervento","Data","Titolo","Tipo","Stato","Priorità","Cliente","Asset","Operatore","Durata stim. (min)","Ore effettive","Costo €","Note chiusura","Chiuso il"];
  const csvRows = rows.map(r=>{
    const cl=clienti.find(c=>c.id===r.clienteId);
    const as=assets.find(a=>a.id===r.assetId);
    const op=operatori.find(o=>o.id===r.operatoreId);
    const costo = op?.tariffa_ora&&r.oreEffettive ? Math.round(r.oreEffettive*op.tariffa_ora) : "";
    return [r.id,r.numeroIntervento||"",r.data,r.titolo,r.tipo,r.stato,r.priorita,cl?.rs||"",as?.nome||"",op?.nome||"",r.durata,r.oreEffettive||"",costo,r.noteChiusura||"",r.chiusoAt?new Date(r.chiusoAt).toLocaleString("it-IT"):""];
  });
  downloadCSV(headers, csvRows, `registro_interventi_${da}_${a}.csv`);
}

function genPianoLavori({ man, clienti, assets, operatori, tenantNome }) {
  const da   = oggi();
  const a    = new Date(); a.setDate(a.getDate()+6);
  const aStr = a.toISOString().split("T")[0];
  const rows = man.filter(m=>m.data>=da&&m.data<=aStr&&m.stato!=="completata").sort((a,b)=>a.data.localeCompare(b.data)||a.priorita.localeCompare(b.priorita));

  const GIORNI=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
  const giorni = [...Array(7)].map((_,i)=>{
    const d=new Date(); d.setDate(d.getDate()+i);
    const iso=d.toISOString().split("T")[0];
    const att=rows.filter(r=>r.data===iso);
    return {iso,label:GIORNI[d.getDay()]+" "+d.getDate()+"/"+String(d.getMonth()+1).padStart(2,"0"),att};
  });

  const colonne = giorni.map(g=>{
    const celle=g.att.map(r=>{
      const cl=clienti.find(c=>c.id===r.clienteId);
      const op=operatori.find(o=>o.id===r.operatoreId);
      const PRI={urgente:"#FEF2F2;border-left:3px solid #EF4444",alta:"#EFF6FF;border-left:3px solid #3B82F6",media:"#FFFBEB",bassa:"#F8F6F1"};
      return `<div style="background:${PRI[r.priorita]||PRI.media};padding:6px 8px;border-radius:4px;margin-bottom:4px;font-size:10px">
        <div style="font-weight:700">${r.titolo.slice(0,35)}</div>
        ${cl?`<div style="color:#666">${cl.rs}</div>`:""}
        ${op?`<div style="color:#888">${op.nome}</div>`:""}
      </div>`;
    }).join("");
    return `<td style="vertical-align:top;padding:8px;border:1px solid #eee;width:${100/7}%">
      <div style="font-weight:700;font-size:11px;margin-bottom:6px;color:${g.att.length?'#0D1B2A':'#999'}">${g.label}${g.att.length?` (${g.att.length})`:""}</div>
      ${celle||`<div style="color:#ccc;font-size:10px;text-align:center;padding:8px 0">—</div>`}
    </td>`;
  }).join("");

  const body=`
<h2>Piano Lavori — Prossimi 7 giorni</h2>
<div class="sub">${fmtD(da)} → ${fmtD(aStr)} · ${rows.length} attività pianificate</div>
<table style="table-layout:fixed"><tbody><tr>${colonne}</tr></tbody></table>`;

  apriReport(htmlBase("Piano Lavori Settimanale", tenantNome, body));
}

function genAttivitaCritiche({ man, clienti, assets, operatori, tenantNome }) {
  const urgenti = man.filter(m=>m.priorita==="urgente"&&m.stato!=="completata");
  const scadute = man.filter(m=>m.stato==="scaduta");
  const oggi_str = oggi();
  const scadono = man.filter(m=>m.stato==="pianificata"&&m.data>oggi_str&&m.data<=addDays(oggi_str,3));

  function addDays(iso,n){const d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);return d.toISOString().split("T")[0];}

  const section=(titolo,colore,rows)=>{
    if(!rows.length) return `<div class="section" style="color:${colore}">${titolo} — nessuna</div>`;
    const righe=rows.map(r=>{
      const cl=clienti.find(c=>c.id===r.clienteId);
      const op=operatori.find(o=>o.id===r.operatoreId);
      return `<tr><td>${fmtD(r.data)}</td><td style="font-weight:600">${r.titolo}</td><td>${cl?.rs||"—"}</td><td>${op?.nome||"—"}</td></tr>`;
    }).join("");
    return `<div class="section" style="color:${colore}">${titolo} (${rows.length})</div>
<table><thead><tr><th>Data</th><th>Attività</th><th>Cliente</th><th>Operatore</th></tr></thead><tbody>${righe}</tbody></table>`;
  };

  const body=`
<h2>Attività Critiche e Scadute</h2>
<div class="sub">Situazione al ${fmtD(oggi())}</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val" style="color:#EF4444">${urgenti.length}</div><div class="kpi-lbl">Urgenti</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#EF4444">${scadute.length}</div><div class="kpi-lbl">Scadute</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#F59E0B">${scadono.length}</div><div class="kpi-lbl">Scadono in 3gg</div></div>
  <div class="kpi"><div class="kpi-val">${urgenti.length+scadute.length+scadono.length}</div><div class="kpi-lbl">Totale critiche</div></div>
</div>
${section("⚡ Urgenti",  "#EF4444", urgenti)}
${section("🔴 Scadute",  "#DC2626", scadute)}
${section("⚠ Scadono presto", "#D97706", scadono)}`;

  apriReport(htmlBase("Attività Critiche", tenantNome, body));
}

function genAssetScadenza({ assets, clienti, tenantNome }) {
  const oggiD  = new Date();
  const tra30  = new Date(); tra30.setDate(tra30.getDate()+30);
  const tra30s = tra30.toISOString().split("T")[0];

  const garInScadenza = assets.filter(a=>a.garanzia_al&&a.garanzia_al<=tra30s&&a.garanzia_al>=oggi());
  const garScaduta    = assets.filter(a=>a.garanzia_al&&a.garanzia_al<oggi());
  const oreAlert      = assets.filter(a=>a.soglia_ore&&a.ore_utilizzo&&a.ore_utilizzo/a.soglia_ore>=0.9);

  const rigaAsset = (a,tag) => {
    const cl=clienti.find(c=>c.id===a.clienteId);
    return `<tr><td style="font-weight:600">${a.nome}</td><td>${cl?.rs||"—"}</td><td>${a.ubicazione||"—"}</td><td>${tag}</td></tr>`;
  };

  const body=`
<h2>Asset con Scadenze Imminenti</h2>
<div class="sub">Situazione al ${fmtD(oggi())}</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-val" style="color:#F59E0B">${garInScadenza.length}</div><div class="kpi-lbl">Garanzia ≤30gg</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#EF4444">${garScaduta.length}</div><div class="kpi-lbl">Garanzia scaduta</div></div>
  <div class="kpi"><div class="kpi-val" style="color:#F59E0B">${oreAlert.length}</div><div class="kpi-lbl">Ore ≥90% soglia</div></div>
</div>
${garInScadenza.length?`<div class="section" style="color:#D97706">⚠ Garanzia in scadenza entro 30 giorni</div>
<table><thead><tr><th>Asset</th><th>Cliente</th><th>Ubicazione</th><th>Scadenza</th></tr></thead><tbody>${garInScadenza.map(a=>rigaAsset(a,`<span style="color:#D97706;font-weight:700">${fmtD(a.garanzia_al)}</span>`)).join("")}</tbody></table>`:""}
${garScaduta.length?`<div class="section" style="color:#DC2626">🔴 Garanzia già scaduta</div>
<table><thead><tr><th>Asset</th><th>Cliente</th><th>Ubicazione</th><th>Scaduta il</th></tr></thead><tbody>${garScaduta.map(a=>rigaAsset(a,`<span style="color:#EF4444;font-weight:700">${fmtD(a.garanzia_al)}</span>`)).join("")}</tbody></table>`:""}
${oreAlert.length?`<div class="section" style="color:#D97706">⚙ Ore utilizzo vicino alla soglia</div>
<table><thead><tr><th>Asset</th><th>Cliente</th><th>Ubicazione</th><th>Utilizzo</th></tr></thead><tbody>${oreAlert.map(a=>rigaAsset(a,`<span style="color:#D97706;font-weight:700">${a.ore_utilizzo}h / ${a.soglia_ore}h (${Math.round(a.ore_utilizzo/a.soglia_ore*100)}%)</span>`)).join("")}</tbody></table>`:""}`;

  apriReport(htmlBase("Asset in Scadenza", tenantNome, body));
}

// ── Componente principale ──────────────────────────────────────────────────
export function Reportistica({ man=[], clienti=[], assets=[], operatori=[], piani=[], odl=[], tenantNome="" }) {
  const { t } = useI18n();

  const generaAI = async () => {
    setAiLoading(true);
    setAiVisible(true);
    setAiReport("");
    try {
      // Filtra manutenzioni del mese selezionato
      const prefix = `${aiAnno}-${String(aiMese+1).padStart(2,"0")}`;
      const manMese = man.filter(m => (m.data||"").startsWith(prefix));
      const testo = await generaReportMensile({
        mese: aiMese, anno: aiAnno,
        manutenzioni: manMese,
        ticket:       [],
        clienti, assets, operatori, piani,
        odl: odl || [],
      });
      setAiReport(testo);
    } catch(e) {
      setAiReport("Errore durante la generazione: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };
  const [filtroCat, setFiltroCat] = useState("tutti");
  const [aiReport,    setAiReport]    = React.useState("");
  const [aiLoading,   setAiLoading]   = React.useState(false);
  const [aiMese,      setAiMese]      = React.useState(new Date().getMonth());
  const [aiAnno,      setAiAnno]      = React.useState(new Date().getFullYear());
  const [aiVisible,   setAiVisible]   = React.useState(false);
  const [params,    setParams]    = useState({
    clienteId: "",
    da:  meseInizio(),
    a:   oggi(),
  });
  const s = (k,v) => setParams(p=>({...p,[k]:v}));

  const catalogo = filtroCat==="tutti"
    ? CATALOGO
    : CATALOGO.filter(r=>r.cat===filtroCat);

  const genera = id => {
    const ctx = { man, clienti, assets, operatori, piani,
      clienteId: params.clienteId,
      da: params.da, a: params.a,
      tenantNome };
    switch(id) {
      case "interventi_cliente":  return genInterventiCliente(ctx);
      case "stato_asset_cliente": return genStatoAsset(ctx);
      case "consuntivo_operatore":return genConsuntivoOperatori(ctx);
      case "costi_per_cliente":   return genCostiCliente(ctx);
      case "registro_interventi": return genRegistroCompleto(ctx);
      case "piano_lavori":        return genPianoLavori(ctx);
      case "attivita_critiche":   return genAttivitaCritiche(ctx);
      case "asset_in_scadenza":   return genAssetScadenza(ctx);
      default: console.warn("Report in sviluppo.");
    }
  };

  const cats = ["tutti","cliente","costi","admin","operativo"];

  return (
    <div style={{ display:"grid", gap:16 }}>

      {/* ── AI Report ──────────────────────────────────────────────────── */}
      <div style={{
        background:"linear-gradient(135deg,#1E1B4B,#312E81)",
        borderRadius:"var(--radius-xl)", padding:"20px 24px",
        border:"1px solid #4C1D95",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <span style={{fontSize:24}}>🤖</span>
          <div>
            <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:15,color:"white"}}>Report Mensile AI</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>Insights e raccomandazioni generate da Claude</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <select value={aiMese} onChange={e=>setAiMese(Number(e.target.value))}
            style={{padding:"7px 10px",borderRadius:7,fontSize:12,border:"1px solid #4C1D95",background:"rgba(255,255,255,.1)",color:"white"}}>
            {["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"].map((m,i)=><option key={i} value={i} style={{background:"#1E1B4B"}}>{m}</option>)}
          </select>
          <select value={aiAnno} onChange={e=>setAiAnno(Number(e.target.value))}
            style={{padding:"7px 10px",borderRadius:7,fontSize:12,border:"1px solid #4C1D95",background:"rgba(255,255,255,.1)",color:"white"}}>
            {[2024,2025,2026,2027].map(y=><option key={y} value={y} style={{background:"#1E1B4B"}}>{y}</option>)}
          </select>
          <button onClick={generaAI} disabled={aiLoading}
            style={{padding:"8px 18px",background:"var(--amber)",color:"#0D1B2A",border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer",opacity:aiLoading?0.6:1}}>
            {aiLoading?"⟳ Generazione...":"✨ Genera report AI"}
          </button>
          {aiReport && <button onClick={()=>{
            const blob=new Blob([aiReport],{type:"text/plain"});
            const a=document.createElement("a");a.href=URL.createObjectURL(blob);
            a.download=`report-ai-${aiAnno}-${String(aiMese+1).padStart(2,"0")}.txt`;a.click();
          }} style={{padding:"8px 12px",background:"rgba(255,255,255,.15)",color:"white",border:"1px solid rgba(255,255,255,.2)",borderRadius:7,fontSize:11,cursor:"pointer"}}>↓ Scarica</button>}
        </div>
        {aiVisible && (
          <div style={{marginTop:14,background:"rgba(0,0,0,.25)",borderRadius:"var(--radius)",border:"1px solid rgba(255,255,255,.1)",padding:"14px 16px",maxHeight:280,overflowY:"auto"}}>
            {aiLoading
              ? <div style={{color:"rgba(255,255,255,.4)",textAlign:"center",padding:"16px 0",fontSize:12}}>Analisi in corso...</div>
              : <pre style={{fontSize:12,lineHeight:1.7,color:"rgba(255,255,255,.8)",whiteSpace:"pre-wrap",fontFamily:"var(--font-body)",margin:0}}>{aiReport}</pre>}
          </div>
        )}
      </div>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:18, marginBottom:3 }}>📄 Reportistica</h2>
          <div style={{ fontSize:12, color:"var(--text-3)" }}>
            Genera report PDF o esporta CSV per clienti, amministrazione e gestione costi
          </div>
        </div>
        <HelpButton sezione="statistiche" />
      </div>

      {/* Filtri globali */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
          letterSpacing:".05em", color:"var(--text-3)", marginBottom:10 }}>
          Parametri comuni ai report
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>Cliente</div>
            <select value={params.clienteId} onChange={e=>s("clienteId",e.target.value)} style={{width:"100%"}}>
              <option value="">Tutti i clienti</option>
              {clienti.map(c=><option key={c.id} value={String(c.id)}>{c.rs}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>Periodo da</div>
            <input type="date" value={params.da} onChange={e=>s("da",e.target.value)} style={{width:"100%"}} />
          </div>
          <div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>Periodo a</div>
            <input type="date" value={params.a} onChange={e=>s("a",e.target.value)} style={{width:"100%"}} />
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
          {[
            [t("report.this_month"),  ()=>{ s("da",meseInizio()); s("a",oggi()); }],
            [t("report.last_month"),()=>{ const d=new Date(); d.setDate(0); const ini=new Date(d.getFullYear(),d.getMonth(),1); s("da",ini.toISOString().split("T")[0]); s("a",d.toISOString().split("T")[0]); }],
            [t("report.quarter"),      ()=>{ const d=new Date(); d.setMonth(d.getMonth()-3); s("da",d.toISOString().split("T")[0]); s("a",oggi()); }],
            [t("report.this_year"),  ()=>{ s("da",`${new Date().getFullYear()}-01-01`); s("a",oggi()); }],
          ].map(([l,fn])=>(
            <button key={l} onClick={fn}
              style={{ fontSize:11, padding:"5px 12px", borderRadius:6,
                background:"var(--surface-2)", border:"1px solid var(--border)",
                cursor:"pointer", fontWeight:600 }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro categoria */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFiltroCat(c)}
            style={{
              padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:600, cursor:"pointer",
              border: filtroCat===c ? "2px solid var(--navy)" : "1px solid var(--border)",
              background: filtroCat===c ? "var(--navy)" : "var(--surface)",
              color: filtroCat===c ? "white" : "var(--text-2)",
            }}>
            {c==="tutti" ? t("actions.all") : CAT_LABEL[c]?.l}
          </button>
        ))}
      </div>

      {/* Grid report */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {catalogo.map(r => {
          const cat   = CAT_LABEL[r.cat];
          const needsCl = r.campi.includes("cliente") && !params.clienteId;
          const needsPeriodo = r.campi.includes("periodo") && (!params.da || !params.a);
          const disabled = needsCl || needsPeriodo;

          return (
            <div key={r.id} style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"var(--radius-xl)", padding:"18px", display:"grid",
              gap:10, alignContent:"start",
              opacity: disabled ? .7 : 1,
            }}>
              {/* Header card */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ fontSize:26, flexShrink:0 }}>{r.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, lineHeight:1.3 }}>{r.titolo}</div>
                  <span style={{
                    display:"inline-block", marginTop:5, fontSize:10, fontWeight:700,
                    padding:"2px 8px", borderRadius:99,
                    background:cat?.bg, color:cat?.col, border:`1px solid ${cat?.brd}`,
                  }}>{cat?.l}</span>
                </div>
              </div>

              <div style={{ fontSize:12, color:"var(--text-3)", lineHeight:1.6 }}>
                {r.desc}
              </div>

              {/* Avvisi parametri mancanti */}
              {disabled && (
                <div style={{ fontSize:11, color:"#D97706", padding:"6px 10px",
                  background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:6 }}>
                  {needsCl ? "⚠ Seleziona un cliente dai parametri" : "⚠ Imposta il periodo"}
                </div>
              )}

              <button
                onClick={()=>genera(r.id)}
                disabled={disabled}
                style={{
                  padding:"9px 0", borderRadius:8, fontWeight:700, fontSize:13,
                  background: disabled ? "var(--surface-3)" : "var(--navy)",
                  color: disabled ? "var(--text-3)" : "white",
                  border:"none", cursor: disabled ? "default" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                }}>
                {r.id==="registro_interventi" ? t("report.export_csv") : t("report.generate_pdf")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
