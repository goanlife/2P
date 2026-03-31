import React from "react";
import { supabase } from "../supabase";
import { ImportaCSV } from "./ImportaCSV";

const COL_MAP = {
  rs:       ["ragione sociale","ragionesociale","rs","nome","name","azienda","company","cliente","denominazione"],
  piva:     ["p.iva","piva","partita iva","vat","cf","codice fiscale"],
  contatto: ["contatto","referente","contact","responsabile","persona"],
  tel:      ["telefono","tel","phone","cellulare","mobile"],
  email:    ["email","mail","e-mail","pec"],
  ind:      ["indirizzo","address","sede","via","street"],
  settore:  ["settore","sector","industry","categoria","attività"],
  note:     ["note","notes","commenti","info"],
};

function parseRow(raw, colMap) {
  const get = f => { const col=Object.entries(colMap).find(([,v])=>v===f)?.[0]; return col!==undefined?(raw[col]??"").toString().trim():""; };
  return { id:get("id")?parseInt(get("id"),10)||null:null, rs:get("rs"), piva:get("piva"), contatto:get("contatto"), tel:get("tel"), email:get("email"), ind:get("ind"), settore:get("settore"), note:get("note") };
}

export function ImportaClienti({ tenantId, userId, onDone }) {
  const handleImport = async (righe) => {
    const inserts = righe.filter(r=>!r.id).map(r=>({...r,user_id:userId,tenant_id:tenantId,id:undefined}));
    const updates = righe.filter(r=>r.id);
    if (inserts.length) await supabase.from("clienti").insert(inserts);
    for (const r of updates) await supabase.from("clienti").update({rs:r.rs,piva:r.piva,contatto:r.contatto,tel:r.tel,email:r.email,ind:r.ind,settore:r.settore,note:r.note}).eq("id",r.id).eq("tenant_id",tenantId);
  };
  return (
    <ImportaCSV
      titolo="Importa Clienti"
      colMap={COL_MAP}
      parseRow={parseRow}
      validateRow={r => r.rs ? null : "Ragione sociale obbligatoria"}
      previewCols={["rs","piva","contatto","email","tel"]}
      previewLabels={{rs:"Ragione Sociale",piva:"P.IVA",contatto:"Contatto",email:"Email",tel:"Tel"}}
      onImport={handleImport}
      templateHeaders={["Ragione Sociale","P.IVA","Contatto","Telefono","Email","Indirizzo","Settore","Note"]}
      templateNome="template-clienti.csv"
      onDone={onDone}
    />
  );
}
