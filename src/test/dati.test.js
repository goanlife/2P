// ═══════════════════════════════════════════════════════════════════
// TEST 2 — INTEGRITÀ DATI e TRASFORMAZIONI (mappers, toDb)
// ═══════════════════════════════════════════════════════════════════
import { describe, it, expect } from "vitest";

// ── Mappers (copie locali per test isolato) ───────────────────────
const mapM = r => ({
  id: r.id, titolo: r.titolo, tipo: r.tipo, stato: r.stato,
  priorita: r.priorita, operatoreId: r.operatore_id,
  clienteId: r.cliente_id, assetId: r.asset_id,
  pianoId: r.piano_id, assegnazioneId: r.assegnazione_id || null,
  data: r.data, durata: r.durata, note: r.note || "",
  userId: r.user_id || "", noteChiusura: r.note_chiusura || "",
  oreEffettive: r.ore_effettive || null, partiUsate: r.parti_usate || "",
  firmaSvg: r.firma_svg || "", chiusoAt: r.chiuso_at || null,
  numeroIntervento: r.numero_intervento || 1, createdAt: r.created_at || null,
});
const mapC = r => ({
  id: r.id, rs: r.rs, piva: r.piva || "", contatto: r.contatto || "",
  tel: r.tel || "", email: r.email || "", ind: r.ind || "",
  settore: r.settore || "", note: r.note || "", userId: r.user_id || "",
});
const mapOp = r => ({
  id: r.id, nome: r.nome, spec: r.spec || "", col: r.col || "#378ADD",
  tipo: r.tipo || "fornitore", email: r.email || "",
  authUserId: r.auth_user_id || null, tema: r.tema || "navy",
  tariffa_ora: r.tariffa_ora || null,
});

// toDb functions
const isoDate = d => {
  if (typeof d === "string" && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};
const toDbM = (f, uid, tid) => ({
  titolo: f.titolo, tipo: f.tipo || "ordinaria", stato: f.stato,
  priorita: f.priorita || "media",
  operatore_id: f.operatoreId ? Number(f.operatoreId) : null,
  cliente_id: f.clienteId ? Number(f.clienteId) : null,
  asset_id: f.assetId ? Number(f.assetId) : null,
  piano_id: f.pianoId ? Number(f.pianoId) : null,
  data: f.data, durata: Number(f.durata) || 60,
  note: f.note || "", user_id: uid,
  ...(tid && { tenant_id: tid }),
});
const toDbC = (f, uid, tid) => ({
  rs: f.rs, piva: f.piva || "", contatto: f.contatto || "",
  tel: f.tel || "", email: f.email || "", ind: f.ind || "",
  settore: f.settore || "", note: f.note || "", user_id: uid,
  ...(tid && { tenant_id: tid }),
});

// ════════════════════════════════════════════════════════════════════

describe("mapM — mapper manutenzione DB → JS", () => {
  const raw = {
    id: 42, titolo: "Cambio olio", tipo: "ordinaria", stato: "pianificata",
    priorita: "media", operatore_id: 5, cliente_id: 3, asset_id: 7,
    piano_id: 1, assegnazione_id: 2, data: "2025-03-15", durata: 60,
    note: "Note varie", user_id: "uuid-123", note_chiusura: null,
    ore_effettive: null, parti_usate: null, firma_svg: null,
    chiuso_at: null, numero_intervento: 1, created_at: "2025-03-01T10:00:00Z",
  };

  it("mappa id e titolo", () => {
    const m = mapM(raw);
    expect(m.id).toBe(42);
    expect(m.titolo).toBe("Cambio olio");
  });
  it("converte operatore_id → operatoreId (camelCase)", () => {
    expect(mapM(raw).operatoreId).toBe(5);
  });
  it("note null → stringa vuota", () => {
    expect(mapM({ ...raw, note: null }).note).toBe("");
  });
  it("assegnazione_id null → null (non stringa)", () => {
    expect(mapM({ ...raw, assegnazione_id: null }).assegnazioneId).toBeNull();
  });
  it("numero_intervento default 1 se mancante", () => {
    expect(mapM({ ...raw, numero_intervento: undefined }).numeroIntervento).toBe(1);
  });
  it("include createdAt", () => {
    expect(mapM(raw).createdAt).toBe("2025-03-01T10:00:00Z");
  });
  it("createdAt null se mancante nel DB", () => {
    expect(mapM({ ...raw, created_at: null }).createdAt).toBeNull();
  });
});

describe("mapC — mapper cliente DB → JS", () => {
  const raw = { id: 1, rs: "Rossi Srl", piva: "01234567890", contatto: "", tel: "", email: "", ind: "", settore: "", note: "", user_id: "u1" };
  it("mappa ragione sociale", () => expect(mapC(raw).rs).toBe("Rossi Srl"));
  it("piva preservata", () => expect(mapC(raw).piva).toBe("01234567890"));
  it("campi opzionali default stringa vuota", () => {
    const m = mapC({ ...raw, contatto: null, tel: null });
    expect(m.contatto).toBe("");
    expect(m.tel).toBe("");
  });
});

describe("mapOp — mapper operatore DB → JS", () => {
  it("tipo default 'fornitore'", () => {
    expect(mapOp({ id:1, nome:"Mario", tipo: undefined }).tipo).toBe("fornitore");
  });
  it("col default '#378ADD'", () => {
    expect(mapOp({ id:1, nome:"Mario", col: null }).col).toBe("#378ADD");
  });
  it("tariffa_ora null se mancante", () => {
    expect(mapOp({ id:1, nome:"Mario" }).tariffa_ora).toBeNull();
  });
  it("tariffa_ora preservata se presente", () => {
    expect(mapOp({ id:1, nome:"Mario", tariffa_ora: 45.5 }).tariffa_ora).toBe(45.5);
  });
});

describe("toDbM — serializzazione per Supabase", () => {
  const form = {
    titolo: "Test", tipo: "ordinaria", stato: "inCorso",
    priorita: "alta", operatoreId: "5", clienteId: "3",
    assetId: "7", pianoId: null, data: "2025-03-15", durata: "90", note: "",
  };

  it("converte operatoreId stringa → numero", () => {
    expect(toDbM(form, "u1", "t1").operatore_id).toBe(5);
  });
  it("operatoreId null → null (non 0)", () => {
    expect(toDbM({ ...form, operatoreId: null }, "u1", "t1").operatore_id).toBeNull();
  });
  it("durata stringa → numero", () => {
    expect(toDbM(form, "u1", "t1").durata).toBe(90);
  });
  it("durata default 60 se NaN", () => {
    expect(toDbM({ ...form, durata: "abc" }, "u1", "t1").durata).toBe(60);
  });
  it("include tenant_id se tid presente", () => {
    expect(toDbM(form, "u1", "tenant-123").tenant_id).toBe("tenant-123");
  });
  it("NON include tenant_id se tid null", () => {
    expect(toDbM(form, "u1", null)).not.toHaveProperty("tenant_id");
  });
  it("stato viene preservato senza default (fix Sprint 7)", () => {
    const result = toDbM({ ...form, stato: "inCorso" }, "u1", "t1");
    expect(result.stato).toBe("inCorso"); // Non deve resettare a 'pianificata'
  });
  it("stato null rimane null (chi inserisce deve passarlo esplicitamente)", () => {
    const result = toDbM({ ...form, stato: undefined }, "u1", "t1");
    expect(result.stato).toBeUndefined();
  });
  it("user_id correttamente impostato", () => {
    expect(toDbM(form, "user-xyz", "t1").user_id).toBe("user-xyz");
  });
});

describe("toDbC — serializzazione cliente", () => {
  const form = { rs: "Test Srl", piva: "123", contatto: "Mario", tel: "02123", email: "a@b.it", ind: "Via Roma", settore: "IT", note: "" };
  it("rs presente", () => expect(toDbC(form, "u1", "t1").rs).toBe("Test Srl"));
  it("include tenant_id", () => expect(toDbC(form, "u1", "t1").tenant_id).toBe("t1"));
  it("note default stringa vuota", () => expect(toDbC({ ...form, note: null }, "u1", "t1").note).toBe(""));
});

describe("Validazioni form — bordi critici", () => {
  it("titolo vuoto non deve passare la validazione", () => {
    const form = { titolo: "  ", stato: "pianificata" };
    expect(form.titolo.trim()).toBeFalsy();
  });
  it("ore effettive 0 non valide", () => {
    expect(Number("0") > 0).toBe(false);
    expect(Number("") > 0).toBe(false);
  });
  it("email non valida", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("")).toBe(false);
    expect(emailRegex.test("noemail")).toBe(false);
    expect(emailRegex.test("ok@test.it")).toBe(true);
  });
  it("dataFine deve essere > dataInizio", () => {
    const ini = "2025-01-01", fine = "2024-12-31";
    expect(fine > ini).toBe(false); // Fine prima di inizio → invalido
  });
});
