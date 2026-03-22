// ═══════════════════════════════════════════════════════════════════
// TEST 4 — SLA LOGIC
// ═══════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from "vitest";

const SLA_DEFAULT = {
  bassa:   { ore_risposta:72,  ore_risoluzione:168 },
  media:   { ore_risposta:24,  ore_risoluzione:72  },
  alta:    { ore_risposta:8,   ore_risoluzione:24  },
  urgente: { ore_risposta:2,   ore_risoluzione:8   },
};

function oreRimaste(dataStr, oreMax) {
  if (!dataStr) return null;
  const creata = new Date(dataStr);
  const scadenza = new Date(creata.getTime() + oreMax * 3600000);
  const diff = scadenza - Date.now();
  return Math.round(diff / 3600000);
}

function getSlaStatus(manutenzione, slaConfig=[]) {
  const cfg = slaConfig.find(s => s.priorita === manutenzione.priorita)
    || SLA_DEFAULT[manutenzione.priorita]
    || SLA_DEFAULT.media;
  if (manutenzione.stato === "completata") return null;
  // Fix Sprint 7: guard su null
  const startSla = manutenzione.createdAt || (manutenzione.data ? manutenzione.data + "T08:00:00" : null);
  if (!startSla) return null;
  const oreRis = oreRimaste(startSla, cfg.ore_risoluzione);
  if (oreRis === null) return null;
  const scaduto = oreRis < 0;
  const urgente = oreRis >= 0 && oreRis < (cfg.ore_risoluzione * 0.2);
  return { oreRis, scaduto, urgente, semaforo: scaduto ? "rosso" : urgente ? "giallo" : "verde" };
}

describe("SLA — calcolo semaforo", () => {
  beforeEach(() => {
    // Mock Date.now() per avere controllo totale sui tempi
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("verde: attività media creata ora, 72h di tempo", () => {
    const man = { priorita: "media", stato: "pianificata", createdAt: "2025-03-15T12:00:00Z", data: "2025-03-15" };
    const s = getSlaStatus(man);
    expect(s.semaforo).toBe("verde");
    expect(s.oreRis).toBe(72);
  });

  it("rosso: attività media creata 80h fa (scaduta)", () => {
    const man = { priorita: "media", stato: "pianificata", createdAt: "2025-03-12T04:00:00Z", data: "2025-03-12" };
    const s = getSlaStatus(man);
    expect(s.scaduto).toBe(true);
    expect(s.semaforo).toBe("rosso");
  });

  it("giallo: attività media con meno del 20% del tempo rimasto", () => {
    // 72h SLA, giallo sotto 14.4h rimaste → creata 58+ ore fa
    const man = { priorita: "media", stato: "pianificata", createdAt: "2025-03-12T20:00:00Z", data: "2025-03-12" };
    const s = getSlaStatus(man);
    expect(s.urgente).toBe(true);
    expect(s.semaforo).toBe("giallo");
  });

  it("null per attività completata", () => {
    const man = { priorita: "media", stato: "completata", createdAt: "2025-03-15T10:00:00Z", data: "2025-03-15" };
    expect(getSlaStatus(man)).toBeNull();
  });

  it("urgente: SLA 8h, creata 1h fa → 7h rimaste → verde", () => {
    // SLA_DEFAULT.urgente.ore_risoluzione = 8h
    // creata 1h fa → 7h rimaste → 7 > 8*0.2=1.6h → verde
    const man = { priorita: "urgente", stato: "inCorso", createdAt: "2025-03-15T11:00:00Z", data: "2025-03-15" };
    const s = getSlaStatus(man);
    expect(s.oreRis).toBe(7);
    expect(s.scaduto).toBe(false);
    expect(s.semaforo).toBe("verde"); // 7h rimaste su 8h totali → ancora verde
  });

  it("urgente: SLA 8h, creata 7.5h fa → 0.5h rimaste → giallo", () => {
    // 0.5h < 8*0.2=1.6h → giallo
    const man = { priorita: "urgente", stato: "inCorso", createdAt: "2025-03-15T04:30:00Z", data: "2025-03-15" };
    const s = getSlaStatus(man);
    expect(s.oreRis).toBeLessThan(2);
    expect(s.urgente).toBe(true);
    expect(s.semaforo).toBe("giallo");
  });

  it("usa config SLA personalizzata del tenant", () => {
    const customConfig = [{ priorita: "media", ore_risoluzione: 48 }]; // 48h invece di 72
    const man = { priorita: "media", stato: "pianificata", createdAt: "2025-03-15T12:00:00Z", data: "2025-03-15" };
    const s = getSlaStatus(man, customConfig);
    expect(s.oreRis).toBe(48); // usa config custom
  });

  it("fallback a SLA_DEFAULT se config tenant vuota", () => {
    const man = { priorita: "alta", stato: "pianificata", createdAt: "2025-03-15T12:00:00Z", data: "2025-03-15" };
    const s = getSlaStatus(man, []);
    expect(s.oreRis).toBe(24); // SLA_DEFAULT.alta = 24h
  });

  it("usa data pianificata come fallback se createdAt null", () => {
    const man = { priorita: "media", stato: "pianificata", createdAt: null, data: "2025-03-15" };
    const s = getSlaStatus(man);
    // data + T08:00:00 → 2025-03-15T08:00:00 → 4h prima del "now" alle 12:00
    expect(s).not.toBeNull();
  });
});

describe("SLA — edge cases", () => {
  it("priorità non riconosciuta usa SLA media come fallback", () => {
    const man = { priorita: "xxxxx", stato: "pianificata", createdAt: new Date().toISOString(), data: "2025-03-15" };
    const s = getSlaStatus(man);
    expect(s).not.toBeNull(); // non crasha
  });

  it("createdAt null e data null → null (guard nel componente)", () => {
    // La funzione oreRimaste riceve null → NaN, ma getSlaStatus deve gestirlo
    const man = { priorita: "media", stato: "pianificata", createdAt: null, data: null };
    const s = getSlaStatus(man);
    // Con il fix in SLABadge: se startSla è null → return null
    expect(s).toBeNull();
  });
});
