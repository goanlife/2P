import React from "react";
import { supabase } from "../supabase";
import { ImportaCSV, buildColMap } from "./ImportaCSV";

// ─── Configurazione colonne asset ─────────────────────────────────────────
const COL_MAP = {
  id:           ["id_manuман","id","manuман_id","asset_id","id_asset"],
  nome:         ["nome","name","asset","denominazione","impianto","attrezzatura","apparecchiatura","equipment"],
  tipo:         ["tipo","type","categoria","category","tipologia","classe"],
  cliente:      ["cliente","client","azienda","company","sito","site","rs","ragionesociale"],
  ubicazione:   ["ubicazione","location","posizione","sede","reparto","zona","area"],
  matricola:    ["matricola","serial","serialnumber","sn","seriale","codice","numero"],
  marca:        ["marca","brand","produttore","manufacturer"],
  modello:      ["modello","model","versione","codicemodello"],
  data_inst:    ["data installazione","datainstallazione","installazione","data acquisto","acquisto","anno"],
  stato:        ["stato","status","condizione","state"],
  note:         ["note","notes","commenti","info","annotazioni"],
  costo_acquisto:["costo","costo acquisto","price","prezzo","valore"],
  garanzia_al:  ["garanzia","warranty","scadenzagaranzia","data garanzia","fine garanzia"],
};

function parseRow(raw, colMap, { clienti=[] }) {
  const get = f => {
    const col = Object.entries(colMap).find(([,field]) => field === f)?.[0];
    return col !== undefined ? (raw[col] ?? "").toString().trim() : "";
  };
  const parseData = s => {
    if (!s) return null;
    if (/^\d{4}$/.test(s)) return `${s}-01-01`;
    const d1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (d1) { const y = d1[3].length===2?"20"+d1[3]:d1[3]; return `${y}-${d1[2].padStart(2,"0")}-${d1[1].padStart(2,"0")}`; }
    const d2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (d2) return `${d2[1]}-${d2[2].padStart(2,"0")}-${d2[3].padStart(2,"0")}`;
    return null;
  };
  const clienteRaw = get("cliente");
  const clienteId = clienti.find(c => c.rs?.toLowerCase()===clienteRaw.toLowerCase()||c.codice?.toLowerCase()===clienteRaw.toLowerCase())?.id || null;
  const statoRaw = get("stato").toLowerCase();
  const stato = statoRaw.includes("man")?"manutenzione":statoRaw.includes("inatt")||statoRaw.includes("off")?"inattivo":"attivo";
  return {
    id:           get("id") ? parseInt(get("id"), 10)||null : null,
    nome:         get("nome"),
    tipo:         get("tipo"),
    clienteId,    clienteNome: clienteRaw,
    ubicazione:   get("ubicazione"),
    matricola:    get("matricola"),
    marca:        get("marca"),
    modello:      get("modello"),
    data_inst:    parseData(get("data_inst")),
    stato,
    note:         get("note"),
    costo_acquisto: get("costo_acquisto") ? parseFloat(get("costo_acquisto").replace(/[^0-9.]/g,""))||null : null,
    garanzia_al:  parseData(get("garanzia_al")),
  };
}

function validateRow(r) {
  if (!r.nome) return "Nome obbligatorio";
  return null;
}

export function ImportaAsset({ tenantId, userId, clienti=[], onDone }) {
  const handleImport = async (righe) => {
    const inserts = righe.filter(r => !r.id).map(r => ({
      nome: r.nome, tipo: r.tipo||"", cliente_id: r.clienteId,
      ubicazione: r.ubicazione, matricola: r.matricola, marca: r.marca, modello: r.modello,
      data_inst: r.data_inst, stato: r.stato||"attivo", note: r.note,
      costo_acquisto: r.costo_acquisto, garanzia_al: r.garanzia_al,
      user_id: userId, tenant_id: tenantId,
    }));
    const updates = righe.filter(r => r.id);
    if (inserts.length) await supabase.from("assets").insert(inserts);
    for (const r of updates) {
      await supabase.from("assets").update({
        nome: r.nome, tipo: r.tipo, ubicazione: r.ubicazione,
        matricola: r.matricola, marca: r.marca, modello: r.modello,
        costo_acquisto: r.costo_acquisto,
      }).eq("id", r.id).eq("tenant_id", tenantId);
    }
  };

  return (
    <ImportaCSV
      titolo="Importa Asset"
      colMap={COL_MAP}
      parseRow={parseRow}
      validateRow={validateRow}
      previewCols={["nome","tipo","clienteNome","stato","matricola"]}
      previewLabels={{nome:"Nome",tipo:"Tipo",clienteNome:"Cliente",stato:"Stato",matricola:"Matricola"}}
      onImport={handleImport}
      templateHeaders={["Nome","Tipo","Cliente","Ubicazione","Matricola","Marca","Modello","Stato","Note"]}
      templateNome="template-asset.csv"
      ctx={{ clienti }}
      onDone={onDone}
    />
  );
}
