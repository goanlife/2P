// ═══════════════════════════════════════════════════════════════════
// TEST 1 — LOGICA CORE (funzioni pure, zero I/O)
// ═══════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach } from "vitest";

// ── Utility interne (copiate per test isolato) ────────────────────
const isoDate = d => {
  if (typeof d === "string" && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};
const fmtData  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const addDays  = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate()+n); return isoDate(d); };
const addMonths = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth()+n); return isoDate(d); };

const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7 },
  { v:"mensile",     l:"Mensile",     giorni:30 },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60 },
  { v:"trimestrale", l:"Trimestrale", giorni:90 },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];

function generaOccorrenze(piano, dataInizio, mesi=12, skipPassate=false) {
  if (!dataInizio) return [];
  const freq = FREQUENZE.find(f => f.v === piano.frequenza);
  if (!freq) return [];
  const fine = (piano.dataFine && piano.dataFine > dataInizio)
    ? piano.dataFine
    : addMonths(dataInizio, mesi);
  const occ = []; let cur = dataInizio;
  const oggi = new Date().toISOString().split("T")[0];
  while (cur <= fine && occ.length < 500) {
    if (!skipPassate || cur >= oggi) occ.push(cur);
    const mult = { mensile:1, bimestrale:2, trimestrale:3, semestrale:6, annuale:12 }[piano.frequenza];
    cur = mult ? addMonths(cur, mult) : addDays(cur, freq.giorni);
  }
  return occ;
}

function conflitti(manutenzioni, operatoreId, data, escludiId=null) {
  return manutenzioni.filter(m =>
    m.operatoreId === Number(operatoreId) &&
    m.data === data &&
    m.stato !== "completata" &&
    m.id !== escludiId
  );
}

// ════════════════════════════════════════════════════════════════════

describe("isoDate — formattazione date", () => {
  it("restituisce la stessa stringa se già in formato ISO", () => {
    expect(isoDate("2025-03-15")).toBe("2025-03-15");
  });
  it("converte un oggetto Date correttamente", () => {
    expect(isoDate(new Date("2025-06-01"))).toBe("2025-06-01");
  });
  it("padding corretto su mese e giorno singoli", () => {
    const d = new Date("2025-01-05");
    expect(isoDate(d)).toBe("2025-01-05");
  });
});

describe("fmtData — formato italiano", () => {
  it("restituisce — per valori falsy", () => {
    expect(fmtData(null)).toBe("—");
    expect(fmtData("")).toBe("—");
    expect(fmtData(undefined)).toBe("—");
  });
  it("formatta correttamente una data ISO", () => {
    expect(fmtData("2025-03-15")).toBe("15/03/2025");
  });
  it("non shifta la data per timezone (T00:00:00 fix)", () => {
    // Senza il fix T00:00:00, in timezone UTC-x la data shifterebbe al giorno prima
    const result = fmtData("2025-01-01");
    expect(result).toBe("01/01/2025");
  });
});

describe("addDays / addMonths — calcoli data", () => {
  it("addDays aggiunge giorni correttamente", () => {
    expect(addDays("2025-01-28", 7)).toBe("2025-02-04");
  });
  it("addDays gestisce fine mese", () => {
    expect(addDays("2025-01-31", 1)).toBe("2025-02-01");
  });
  it("addMonths aggiunge mesi", () => {
    expect(addMonths("2025-01-15", 1)).toBe("2025-02-15");
  });
  it("addMonths gestisce fine anno", () => {
    expect(addMonths("2025-11-01", 2)).toBe("2026-01-01");
  });
  it("addMonths gestisce mese lungo → mese corto (clamp)", () => {
    // 31 gennaio + 1 mese = 3 marzo (JS clampa a 28/29 feb poi aggiunge i giorni rimanenti)
    const result = addMonths("2025-01-31", 1);
    expect(result).toMatch(/^2025-0[23]-/);
  });
});

describe("generaOccorrenze — piani di manutenzione", () => {
  const piano_mensile = { frequenza: "mensile", dataFine: null };
  const piano_annuale = { frequenza: "annuale", dataFine: null };
  const piano_settimanale = { frequenza: "settimanale", dataFine: null };

  it("genera 12 occorrenze mensili in 12 mesi", () => {
    const occ = generaOccorrenze(piano_mensile, "2025-01-01", 12);
    expect(occ.length).toBeGreaterThanOrEqual(12);
    expect(occ.length).toBeLessThanOrEqual(13); // include o meno la data fine
  });
  it("prima occorrenza = data inizio", () => {
    const occ = generaOccorrenze(piano_mensile, "2025-01-01", 12);
    expect(occ[0]).toBe("2025-01-01");
  });
  it("ultima occorrenza non supera la fine", () => {
    const occ = generaOccorrenze(piano_mensile, "2025-01-01", 6);
    const fine = addMonths("2025-01-01", 6);
    occ.forEach(d => expect(d <= fine).toBe(true));
  });
  it("genera 1 occorrenza annuale in 12 mesi", () => {
    const occ = generaOccorrenze(piano_annuale, "2025-01-01", 12);
    expect(occ.length).toBeGreaterThanOrEqual(1);
    expect(occ.length).toBeLessThanOrEqual(2); // 12 mesi include data fine esatta
  });
  it("piano settimanale genera ~52 occorrenze in 12 mesi", () => {
    const occ = generaOccorrenze(piano_settimanale, "2025-01-01", 12);
    expect(occ.length).toBeGreaterThanOrEqual(50);
    expect(occ.length).toBeLessThanOrEqual(54);
  });
  it("non supera il limite di 500 occorrenze", () => {
    const piano_giornaliero = { frequenza: "settimanale", dataFine: null };
    const occ = generaOccorrenze(piano_giornaliero, "2020-01-01", 120); // 10 anni
    expect(occ.length).toBeLessThanOrEqual(500);
  });
  it("skipPassate esclude le date passate", () => {
    const passato = "2020-01-01";
    const occ = generaOccorrenze(piano_mensile, passato, 12, true);
    const oggi = new Date().toISOString().split("T")[0];
    occ.forEach(d => expect(d).toBeGreaterThanOrEqual(oggi));
  });
  it("ritorna [] se dataInizio è null", () => {
    expect(generaOccorrenze(piano_mensile, null)).toEqual([]);
  });
  it("ritorna [] per frequenza non riconosciuta", () => {
    expect(generaOccorrenze({ frequenza: "boh" }, "2025-01-01")).toEqual([]);
  });
  it("rispetta dataFine del piano se presente", () => {
    const piano = { frequenza: "mensile", dataFine: "2025-03-01" };
    const occ = generaOccorrenze(piano, "2025-01-01", 12);
    expect(occ.length).toBeLessThanOrEqual(3);
    occ.forEach(d => expect(d <= "2025-03-01").toBe(true));
  });
});

describe("conflitti — rilevamento sovrapposizioni", () => {
  const man = [
    { id:1, operatoreId:10, data:"2025-03-15", stato:"pianificata", titolo:"Manutenzione A" },
    { id:2, operatoreId:10, data:"2025-03-15", stato:"pianificata", titolo:"Manutenzione B" },
    { id:3, operatoreId:10, data:"2025-03-15", stato:"completata",  titolo:"Completata" },
    { id:4, operatoreId:20, data:"2025-03-15", stato:"pianificata", titolo:"Altro operatore" },
    { id:5, operatoreId:10, data:"2025-03-16", stato:"pianificata", titolo:"Giorno diverso" },
  ];

  it("trova conflitti per lo stesso operatore/data", () => {
    const c = conflitti(man, 10, "2025-03-15");
    expect(c).toHaveLength(2); // id 1 e 2
  });
  it("ignora le attività completate", () => {
    const c = conflitti(man, 10, "2025-03-15");
    expect(c.every(m => m.stato !== "completata")).toBe(true);
  });
  it("ignora altri operatori", () => {
    const c = conflitti(man, 10, "2025-03-15");
    expect(c.every(m => m.operatoreId === 10)).toBe(true);
  });
  it("esclude l'id corrente (modifica)", () => {
    const c = conflitti(man, 10, "2025-03-15", 1);
    expect(c).toHaveLength(1);
    expect(c[0].id).toBe(2);
  });
  it("nessun conflitto per data diversa", () => {
    const c = conflitti(man, 10, "2025-03-20");
    expect(c).toHaveLength(0);
  });
  it("nessun conflitto per operatore diverso", () => {
    const c = conflitti(man, 99, "2025-03-15");
    expect(c).toHaveLength(0);
  });
});
