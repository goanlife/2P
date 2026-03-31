// ═══════════════════════════════════════════════════════════════════════════
// constants.js — Costanti condivise in tutta l'app ManuMan
// Aggiorna qui, si propaga ovunque automaticamente
// ═══════════════════════════════════════════════════════════════════════════

// ─── Colori priorità ──────────────────────────────────────────────────────
export const PRI_COL = {
  bassa:   "#94A3B8",
  media:   "#F59E0B",
  alta:    "#3B82F6",
  urgente: "#EF4444",
  critica: "#DC2626",
};

export const PRI_BG = {
  bassa:   "#F8FAFC",
  media:   "#FFFBEB",
  alta:    "#EFF6FF",
  urgente: "#FFF1F2",
  critica: "#FEF2F2",
};

// ─── Etichette stato manutenzioni ─────────────────────────────────────────
export const STATO_LABEL = {
  richiesta:   "Richiesta",
  pianificata: "Pianificata",
  inCorso:     "In corso",
  completata:  "Completata",
  scaduta:     "Scaduta",
};

export const STATO_COL = {
  pianificata: "#3B82F6",
  inCorso:     "#F59E0B",
  completata:  "#059669",
  scaduta:     "#EF4444",
  richiesta:   "#7C3AED",
};

export const STATO_BG = {
  pianificata: "#EFF6FF",
  inCorso:     "#FFFBEB",
  completata:  "#ECFDF5",
  scaduta:     "#FEF2F2",
  richiesta:   "#F5F3FF",
};

// ─── Frequenze piani di manutenzione ──────────────────────────────────────
export const FREQUENZE = [
  { v: "giornaliero",  l: "Giornaliero",  giorni: 1   },
  { v: "settimanale",  l: "Settimanale",  giorni: 7   },
  { v: "mensile",      l: "Mensile",      giorni: 30  },
  { v: "bimestrale",   l: "Bimestrale",   giorni: 60  },
  { v: "trimestrale",  l: "Trimestrale",  giorni: 90  },
  { v: "semestrale",   l: "Semestrale",   giorni: 180 },
  { v: "annuale",      l: "Annuale",      giorni: 365 },
];

// ─── Stati Ordini di Lavoro ────────────────────────────────────────────────
export const STATI_ODL = [
  { v: "bozza",      l: "Bozza",      col: "#94A3B8", bg: "#F8FAFC" },
  { v: "confermato", l: "Confermato", col: "#3B82F6", bg: "#EFF6FF" },
  { v: "in_corso",   l: "In corso",   col: "#F59E0B", bg: "#FEF3C7" },
  { v: "completato", l: "Completato", col: "#059669", bg: "#ECFDF5" },
  { v: "annullato",  l: "Annullato",  col: "#EF4444", bg: "#FEF2F2" },
];

// ─── Tipi ticket ───────────────────────────────────────────────────────────
export const TICKET_TIPI = [
  { v: "correttiva", l: "🔧 Correttiva",  col: "#DC2626", bg: "#FEF2F2", desc: "Guasto in corso" },
  { v: "urgente",    l: "⚡ Urgente",     col: "#B91C1C", bg: "#FFF1F2", desc: "Rischio blocco imminente" },
  { v: "miglioria",  l: "⬆ Miglioria",   col: "#7C3AED", bg: "#F5F3FF", desc: "Miglioramento non urgente" },
  { v: "normativa",  l: "⚖ Normativa",   col: "#D97706", bg: "#FEF3C7", desc: "Adempimento non pianificato" },
];

export const TICKET_PRIORITA = [
  { v: "bassa",   l: "Bassa",      col: "#64748B" },
  { v: "media",   l: "Media",      col: "#F59E0B" },
  { v: "alta",    l: "Alta",       col: "#3B82F6" },
  { v: "critica", l: "🔴 Critica", col: "#DC2626" },
];

export const TICKET_STATI = [
  { v: "in_attesa",      l: "In attesa",       col: "#D97706", bg: "#FEF3C7" }, // richiesta cliente → approvazione admin
  { v: "aperto",         l: "Aperto",          col: "#3B82F6", bg: "#EFF6FF" },
  { v: "in_lavorazione", l: "In lavorazione",  col: "#F59E0B", bg: "#FFFBEB" },
  { v: "risolto",        l: "Risolto",         col: "#059669", bg: "#ECFDF5" },
  { v: "chiuso",         l: "Chiuso",          col: "#6B7280", bg: "#F9FAFB" },
  { v: "rifiutato",      l: "Rifiutato",       col: "#9333EA", bg: "#F5F3FF" },
  { v: "annullato",      l: "Annullato",       col: "#EF4444", bg: "#FEF2F2" },
];

// SLA ore di default per tipo+priorità (usato quando il cliente non ha profilo SLA)
export const SLA_ORE_DEFAULT = {
  urgente:   { critica: 2,  alta: 4,  media: 8,   bassa: 24  },
  correttiva:{ critica: 4,  alta: 8,  media: 24,  bassa: 48  },
  miglioria: { critica: 24, alta: 48, media: 72,  bassa: 168 },
  normativa: { critica: 8,  alta: 24, media: 72,  bassa: 168 },
};

// ─── Helper functions ──────────────────────────────────────────────────────
export const priCol    = v => PRI_COL[v]    || "#94A3B8";
export const priBg     = v => PRI_BG[v]     || "#F8FAFC";
export const statoCol  = v => STATO_COL[v]  || "#94A3B8";
export const statoBg   = v => STATO_BG[v]   || "var(--surface-2)";
export const statoLbl  = v => STATO_LABEL[v] || v;
export const odlStato  = v => STATI_ODL.find(s => s.v === v) || STATI_ODL[0];
export const tktTipo   = v => TICKET_TIPI.find(t => t.v === v) || TICKET_TIPI[0];
export const tktPri    = v => TICKET_PRIORITA.find(p => p.v === v) || TICKET_PRIORITA[1];
export const tktStato  = v => TICKET_STATI.find(s => s.v === v) || TICKET_STATI[0];
