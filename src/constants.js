export const GIORNI = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
export const MESI   = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

export const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7   },
  { v:"mensile",     l:"Mensile",     giorni:30  },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60  },
  { v:"trimestrale", l:"Trimestrale", giorni:90  },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];

export const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };

export const STATO_LABEL = {
  pianificata:"Pianificata",
  inCorso:"In corso",
  completata:"Completata",
  scaduta:"Scaduta",
};

export const TIPO_OP = {
  fornitore: { label:"Fornitore", style:{background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE"} },
  cliente:   { label:"Cliente",   style:{background:"#EEEDFE",color:"#4F46E5",border:"1px solid #C4B5FD"} },
  interno:   { label:"Interno",   style:{background:"#ECFDF5",color:"#065F46",border:"1px solid #A7F3D0"} },
};

export const COLORI_OP     = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6"];
export const COLORI_GRUPPI = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6","#0EA5E9","#84CC16"];

export const TEMI = [
  { id:"navy",   nome:"Navy",   top:"#0D1B2A", bot:"#F59E0B", desc:"Industrial scuro" },
  { id:"slate",  nome:"Slate",  top:"#1E293B", bot:"#6366F1", desc:"Grigio professionale" },
  { id:"forest", nome:"Forest", top:"#052E16", bot:"#22C55E", desc:"Verde bosco" },
  { id:"sunset", nome:"Sunset", top:"#431407", bot:"#F97316", desc:"Caldo arancione" },
  { id:"ocean",  nome:"Ocean",  top:"#0C4A6E", bot:"#0EA5E9", desc:"Azzurro oceano" },
];

export const OP_DEFAULT = [
  { nome:"Marco Rossi",   spec:"Elettrico",  col:"#378ADD", tipo:"fornitore" },
  { nome:"Laura Bianchi", spec:"Meccanico",  col:"#1D9E75", tipo:"fornitore" },
  { nome:"Giorgio Ferri", spec:"Idraulico",  col:"#D85A30", tipo:"fornitore" },
  { nome:"Anna Conti",    spec:"Generico",   col:"#7F77DD", tipo:"interno"   },
];

export const TABS = [
  {id:"dashboard",   l:"Dashboard",    icon:"◈"},
  {id:"manutenzioni",l:"Manutenzioni", icon:"⚡"},
  {id:"piani",       l:"Piani",        icon:"🔄"},
  {id:"calendario",  l:"Calendario",   icon:"📅"},
  {id:"assets",      l:"Asset",        icon:"⚙"},
  {id:"utenti",      l:"Utenti",       icon:"👥"},
  {id:"gruppi",      l:"Gruppi",       icon:"🗂"},
  {id:"clienti",     l:"Clienti",      icon:"🏢"},
  {id:"statistiche", l:"Statistiche",  icon:"📊"},
];

export const PRIMARY_TABS = [
  {id:"dashboard",    l:"Dashboard",  icon:"◈"},
  {id:"manutenzioni", l:"Attività",   icon:"⚡"},
  {id:"calendario",   l:"Calendario", icon:"📅"},
  {id:"clienti",      l:"Clienti",    icon:"🏢"},
];

export const DRAWER_TABS = [
  {id:"piani",       l:"Piani",        icon:"🔄"},
  {id:"assets",      l:"Asset",        icon:"⚙"},
  {id:"utenti",      l:"Utenti",       icon:"👥"},
  {id:"gruppi",      l:"Gruppi",       icon:"🗂"},
  {id:"statistiche", l:"Statistiche",  icon:"📊"},
];

// ─── Utils ────────────────────────────────────────────────────────────────
export const fmtData   = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
export const fmtDataOra= d => d ? new Date(d).toLocaleString("it-IT") : "—";
export const isoDate   = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
export const addDays   = (iso,n) => { const d=new Date(iso); d.setDate(d.getDate()+n); return isoDate(d); };
export const addMonths = (iso,n) => { const d=new Date(iso); d.setMonth(d.getMonth()+n); return isoDate(d); };

export function generaOccorrenze(piano, dataInizio, mesi=12) {
  if (!dataInizio) return [];
  const freq = FREQUENZE.find(f=>f.v===piano.frequenza); if (!freq) return [];
  const fine = (piano.dataFine&&piano.dataFine>dataInizio) ? piano.dataFine : addMonths(dataInizio, mesi);
  const occ=[]; let cur=dataInizio;
  while (cur<=fine && occ.length<200) {
    occ.push(cur);
    const mult={mensile:1,bimestrale:2,trimestrale:3,semestrale:6,annuale:12}[piano.frequenza];
    cur = mult ? addMonths(cur,mult) : addDays(cur,freq.giorni);
  }
  return occ;
}

export function conflitti(manutenzioni, operatoreId, data, escludiId=null) {
  return manutenzioni.filter(m=>m.operatoreId===Number(operatoreId)&&m.data===data&&m.stato!=="completata"&&m.id!==escludiId);
}
