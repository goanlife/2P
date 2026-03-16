// Costanti globali condivise da tutti i componenti

export const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
export const GIORNI = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
export const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7   },
  { v:"mensile",     l:"Mensile",     giorni:30  },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60  },
  { v:"trimestrale", l:"Trimestrale", giorni:90  },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];
export const PRI_COLOR   = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
export const STATO_LABEL = { pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };
export const TIPO_OP = {
  fornitore: { label:"Fornitore", style:{background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE"} },
  cliente:   { label:"Cliente",   style:{background:"#EEEDFE",color:"#4F46E5",border:"1px solid #C4B5FD"} },
  interno:   { label:"Interno",   style:{background:"#ECFDF5",color:"#065F46",border:"1px solid #A7F3D0"} },
};
export const COLORI_GRUPPI = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6","#0EA5E9","#84CC16"];
export const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
export const isoDate = d => d.toISOString().split("T")[0];
export const addMonths = (d,n) => { const dt=new Date(d+"T00:00:00"); dt.setMonth(dt.getMonth()+n); return dt.toISOString().split("T")[0]; };
export const addDays = (d,n) => { const dt=new Date(d+"T00:00:00"); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; };
