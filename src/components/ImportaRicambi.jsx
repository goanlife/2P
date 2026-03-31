import React from "react";
import { supabase } from "../supabase";
import { ImportaCSV } from "./ImportaCSV";

const COL_MAP = {
  codice:      ["codice","code","part number","partnumber","pn","sku","id"],
  nome:        ["nome","name","descrizione","description","denominazione","ricambio"],
  categoria:   ["categoria","category","tipo","type","classe"],
  marca:       ["marca","brand","produttore","manufacturer"],
  fornitore:   ["fornitore","supplier","vendor","distributore"],
  prezzo:      ["prezzo","price","costo","cost","valore","unitprice"],
  giacenza:    ["giacenza","stock","quantita","quantity","qty","scorte"],
  scorta_min:  ["scorta minima","scortaminima","minstock","min","reorder","riordino"],
  note:        ["note","notes","commenti","info"],
};

function parseRow(raw, colMap) {
  const get = f => { const col=Object.entries(colMap).find(([,v])=>v===f)?.[0]; return col!==undefined?(raw[col]??"").toString().trim():""; };
  const pNum = s => s ? parseFloat(s.replace(/[^0-9.,-]/g,"").replace(",","."))||null : null;
  const pInt = s => s ? parseInt(s.replace(/[^0-9]/g,""),10)||0 : 0;
  return { codice:get("codice"), nome:get("nome"), categoria:get("categoria"), marca:get("marca"), fornitore:get("fornitore"), prezzo_unitario:pNum(get("prezzo")), giacenza_attuale:pInt(get("giacenza")), scorta_minima:pInt(get("scorta_min"))||1, note:get("note") };
}

export function ImportaRicambi({ tenantId, userId, onDone }) {
  const handleImport = async (righe) => {
    const rows = righe.map(r=>({...r, user_id:userId, tenant_id:tenantId}));
    await supabase.from("ricambi").insert(rows);
  };
  return (
    <ImportaCSV
      titolo="Importa Ricambi"
      colMap={COL_MAP}
      parseRow={parseRow}
      validateRow={r => r.nome ? null : "Nome obbligatorio"}
      previewCols={["codice","nome","categoria","giacenza_attuale","prezzo_unitario"]}
      previewLabels={{codice:"Codice",nome:"Nome",categoria:"Categoria",giacenza_attuale:"Giacenza",prezzo_unitario:"Prezzo"}}
      onImport={handleImport}
      templateHeaders={["Codice","Nome","Categoria","Marca","Fornitore","Prezzo","Giacenza","Scorta Minima","Note"]}
      templateNome="template-ricambi.csv"
      onDone={onDone}
    />
  );
}
