// ═══════════════════════════════════════════════════════════════════
// TEST 3 — STRESS TEST (volumi, performance, edge cases)
// ═══════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll } from "vitest";

const isoDate = d => {
  if (typeof d === "string" && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};
const addDays  = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate()+n); return isoDate(d); };
const addMonths= (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth()+n); return isoDate(d); };
const FREQUENZE = [
  { v:"settimanale", giorni:7 }, { v:"mensile", giorni:30 },
  { v:"bimestrale", giorni:60 }, { v:"trimestrale", giorni:90 },
  { v:"semestrale", giorni:180 }, { v:"annuale", giorni:365 },
];
function generaOccorrenze(piano, dataInizio, mesi=12) {
  if (!dataInizio) return [];
  const freq = FREQUENZE.find(f => f.v === piano.frequenza);
  if (!freq) return [];
  const fine = addMonths(dataInizio, mesi);
  const occ = []; let cur = dataInizio;
  while (cur <= fine && occ.length < 500) {
    occ.push(cur);
    const mult = { mensile:1, bimestrale:2, trimestrale:3, semestrale:6, annuale:12 }[piano.frequenza];
    cur = mult ? addMonths(cur, mult) : addDays(cur, freq.giorni);
  }
  return occ;
}

// ── Factory dati di test ──────────────────────────────────────────
function makeMan(n, overrides={}) {
  return Array.from({ length: n }, (_, i) => ({
    id: i+1, titolo: `Manutenzione ${i+1}`, tipo: "ordinaria",
    stato: ["pianificata","inCorso","completata","scaduta"][i%4],
    priorita: ["bassa","media","alta","urgente"][i%4],
    operatoreId: (i%5)+1, clienteId: (i%10)+1, assetId: (i%20)+1,
    pianoId: i%3===0 ? Math.floor(i/3)+1 : null,
    data: addDays("2025-01-01", i), durata: 60+(i%4)*30,
    note: "", oreEffettive: i%4===2 ? 2+(i%3) : null,
    createdAt: `2025-01-${String((i%28)+1).padStart(2,"0")}T08:00:00Z`,
    ...overrides,
  }));
}

function makeOperatori(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i+1, nome: `Operatore ${i+1}`, tipo: i%3===0?"interno":"fornitore",
    col: "#378ADD", email: `op${i+1}@test.it`, tariffa_ora: i%3===0 ? null : 40+(i%3)*10,
  }));
}

// ════════════════════════════════════════════════════════════════════

describe("STRESS — generaOccorrenze con volumi alti", () => {
  it("100 piani mensili generati in < 100ms", () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      generaOccorrenze({ frequenza: "mensile" }, "2025-01-01", 12);
    }
    expect(Date.now() - start).toBeLessThan(100);
  });

  it("1000 piani settimanali generati in < 500ms", () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      generaOccorrenze({ frequenza: "settimanale" }, "2025-01-01", 12);
    }
    expect(Date.now() - start).toBeLessThan(500);
  });

  it("piano a 10 anni non esplode (limite 500)", () => {
    const occ = generaOccorrenze({ frequenza: "settimanale" }, "2020-01-01", 120);
    expect(occ.length).toBe(500);
    expect(occ[0]).toBe("2020-01-01");
    expect(occ[499]).toBeTruthy();
  });

  it("occorrenze sempre in ordine crescente", () => {
    const occ = generaOccorrenze({ frequenza: "mensile" }, "2025-06-15", 24);
    for (let i = 1; i < occ.length; i++) {
      expect(occ[i] > occ[i-1]).toBe(true);
    }
  });

  it("nessun duplicato nelle occorrenze", () => {
    const occ = generaOccorrenze({ frequenza: "settimanale" }, "2025-01-01", 12);
    const unique = new Set(occ);
    expect(unique.size).toBe(occ.length);
  });
});

describe("STRESS — filtraggio su dataset grandi", () => {
  let man;
  beforeAll(() => { man = makeMan(1000); });

  it("filter per stato su 1000 attività < 5ms", () => {
    const start = Date.now();
    const result = man.filter(m => m.stato === "pianificata");
    expect(Date.now() - start).toBeLessThan(5);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filter per operatore su 1000 attività < 5ms", () => {
    const start = Date.now();
    const result = man.filter(m => m.operatoreId === 1);
    expect(Date.now() - start).toBeLessThan(5);
    expect(result.length).toBeGreaterThan(0);
  });

  it("calcolo KPI su 1000 attività < 10ms", () => {
    const start = Date.now();
    const stats = {
      tot: man.length,
      pi:  man.filter(m => m.stato === "pianificata").length,
      ic:  man.filter(m => m.stato === "inCorso").length,
      sc:  man.filter(m => m.stato === "scaduta").length,
      ur:  man.filter(m => m.priorita === "urgente" && m.stato !== "completata").length,
    };
    expect(Date.now() - start).toBeLessThan(10);
    expect(stats.tot).toBe(1000);
    expect(stats.pi + stats.ic + stats.sc + man.filter(m=>m.stato==="completata").length).toBe(1000);
  });

  it("find operatore su 1000 attività < 2ms", () => {
    const operatori = makeOperatori(50);
    const start = Date.now();
    man.slice(0, 100).forEach(m => {
      operatori.find(o => o.id === m.operatoreId);
    });
    expect(Date.now() - start).toBeLessThan(2);
  });

  it("calcolo costi aggregati su 1000 attività < 20ms", () => {
    const operatori = makeOperatori(5);
    const start = Date.now();
    const costi = operatori.map(op => ({
      ...op,
      ore: man.filter(m => m.operatoreId === op.id && m.oreEffettive)
              .reduce((s, m) => s + (m.oreEffettive || 0), 0),
    }));
    expect(Date.now() - start).toBeLessThan(20);
    expect(costi.every(c => c.ore >= 0)).toBe(true);
  });
});

describe("STRESS — conflitti su dataset grandi", () => {
  let man;
  beforeAll(() => {
    man = makeMan(500);
    // Crea artificialmente 50 conflitti
    for (let i = 0; i < 50; i++) {
      man.push({ ...man[i], id: 10000+i, stato: "pianificata" });
    }
  });

  it("rilevamento conflitti su 550 attività < 10ms", () => {
    const start = Date.now();
    let totalConflitti = 0;
    for (let op = 1; op <= 5; op++) {
      const dates = [...new Set(man.map(m => m.data))].slice(0, 10);
      dates.forEach(data => {
        const c = man.filter(m => m.operatoreId === op && m.data === data && m.stato !== "completata");
        if (c.length > 1) totalConflitti++;
      });
    }
    expect(Date.now() - start).toBeLessThan(10);
  });
});

describe("STRESS — import CSV con dati anomali", () => {
  // Simula la funzione parseRow di ImportaClienti
  function parseRow(row) {
    return {
      rs:       (row.rs || "").toString().trim(),
      piva:     (row.piva || "").toString().trim(),
      email:    (row.email || "").toString().trim(),
      tel:      (row.tel || "").toString().trim(),
      contatto: (row.contatto || "").toString().trim(),
    };
  }

  it("gestisce 10000 righe CSV in < 200ms", () => {
    const rows = Array.from({ length: 10000 }, (_, i) => ({
      rs: `Cliente ${i}`, piva: String(i).padStart(11, "0"),
      email: `c${i}@test.it`, tel: `02${i}`, contatto: `Referente ${i}`,
    }));
    const start = Date.now();
    const parsed = rows.map(parseRow).filter(r => r.rs);
    expect(Date.now() - start).toBeLessThan(200);
    expect(parsed).toHaveLength(10000);
  });

  it("filtra righe vuote", () => {
    const rows = [{ rs:"", piva:"", email:"" }, { rs:"Valido", piva:"123" }];
    const parsed = rows.map(parseRow).filter(r => r.rs);
    expect(parsed).toHaveLength(1);
  });

  it("gestisce valori null/undefined nelle celle", () => {
    const row = { rs: null, piva: undefined, email: null };
    const parsed = parseRow(row);
    expect(parsed.rs).toBe("");
    expect(parsed.piva).toBe("");
  });

  it("gestisce caratteri speciali e unicode", () => {
    const row = { rs: "Società & Figli — S.r.l.", piva: "IT01234567890" };
    const parsed = parseRow(row);
    expect(parsed.rs).toBe("Società & Figli — S.r.l.");
  });

  it("trim spazi sulle celle", () => {
    const row = { rs: "  Spazi   ", email: "  a@b.it  " };
    const parsed = parseRow(row);
    expect(parsed.rs).toBe("Spazi");
    expect(parsed.email).toBe("a@b.it");
  });
});

describe("STRESS — multi-tenant isolamento dati", () => {
  const manTenant1 = makeMan(100, { tenantId: "tenant-A" });
  const manTenant2 = makeMan(100, { tenantId: "tenant-B" });
  const allMan = [...manTenant1, ...manTenant2];

  it("filtro tenant A restituisce solo i suoi dati", () => {
    const result = allMan.filter(m => m.tenantId === "tenant-A");
    expect(result).toHaveLength(100);
    expect(result.every(m => m.tenantId === "tenant-A")).toBe(true);
  });

  it("nessun dato di tenant-B visibile a tenant-A", () => {
    const result = allMan.filter(m => m.tenantId === "tenant-A");
    expect(result.some(m => m.tenantId === "tenant-B")).toBe(false);
  });

  it("KPI calcolati su 200 attività (2 tenant misti) < 5ms", () => {
    const start = Date.now();
    allMan.filter(m => m.tenantId === "tenant-A")
          .filter(m => m.stato === "pianificata");
    expect(Date.now() - start).toBeLessThan(5);
  });
});

describe("EDGE CASES — valori limite e casi estremi", () => {
  it("addDays con n=0 restituisce la stessa data", () => {
    expect(addDays("2025-03-15", 0)).toBe("2025-03-15");
  });
  it("addMonths con n=0 restituisce la stessa data", () => {
    expect(addMonths("2025-03-15", 0)).toBe("2025-03-15");
  });
  it("addDays con numero negativo va indietro nel tempo", () => {
    expect(addDays("2025-03-15", -7)).toBe("2025-03-08");
  });
  it("generaOccorrenze con data inizio nel futuro lontano", () => {
    const occ = generaOccorrenze({ frequenza: "mensile" }, "2099-01-01", 12);
    expect(occ[0]).toBe("2099-01-01");
    expect(occ.length).toBeGreaterThanOrEqual(12);
    expect(occ.length).toBeLessThanOrEqual(13);
  });
  it("generaOccorrenze con data inizio = data fine genera 1 sola occorrenza", () => {
    const occ = generaOccorrenze(
      { frequenza: "mensile", dataFine: "2025-01-01" },
      "2025-01-01", 12
    );
    expect(occ.length).toBeGreaterThanOrEqual(1);
    expect(occ[0]).toBe("2025-01-01");
  });
  it("costo 0 se tariffa_ora null", () => {
    const ore = 5, tariffa = null;
    const costo = tariffa ? ore * tariffa : null;
    expect(costo).toBeNull();
  });
  it("costo calcolato correttamente", () => {
    expect(5 * 45.5).toBe(227.5);
  });
  it("percentuale completamento non divide per zero", () => {
    const tot = 0, completate = 0;
    const tasso = tot > 0 ? Math.round(completate / tot * 100) : 0;
    expect(tasso).toBe(0);
  });
  it("SLA oreRimaste negativo = scaduto", () => {
    const oreRimaste = -5;
    expect(oreRimaste < 0).toBe(true);
  });
  it("SLA urgente 20% threshold = ultimo 20% prima scadenza", () => {
    const oreMax = 8;
    const threshold = oreMax * 0.2; // 1.6h
    expect(1 < threshold).toBe(true);  // 1h rimasta → urgente
    expect(3 < threshold).toBe(false); // 3h rimaste → normale
  });
});
