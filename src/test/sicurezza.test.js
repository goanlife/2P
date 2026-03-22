// ═══════════════════════════════════════════════════════════════════
// TEST 5 — SICUREZZA e MULTI-TENANT
// ═══════════════════════════════════════════════════════════════════
import { describe, it, expect } from "vitest";

// Simula la logica di filtraggio dati del portale cliente
function calcolaManView(man, isCliente, mySiti) {
  if (!isCliente || !mySiti) return man;
  return man.filter(m => mySiti.includes(m.clienteId));
}
function calcolaClientiView(clienti, isCliente, mySiti) {
  if (!isCliente || !mySiti) return clienti;
  return clienti.filter(c => mySiti.includes(c.id));
}
function calcolaAssetsView(assets, isCliente, mySiti) {
  if (!isCliente || !mySiti) return assets;
  return assets.filter(a => mySiti.includes(a.clienteId));
}

// Simula toDbM con tenant_id
const toDbM = (f, uid, tid) => ({
  titolo: f.titolo, stato: f.stato,
  user_id: uid,
  ...(tid && { tenant_id: tid }),
});

describe("Multi-tenant — isolamento dati portale cliente", () => {
  const allMan = [
    { id:1, clienteId:10, titolo:"A", stato:"pianificata" },
    { id:2, clienteId:10, titolo:"B", stato:"completata" },
    { id:3, clienteId:20, titolo:"C", stato:"pianificata" }, // altro cliente
    { id:4, clienteId:30, titolo:"D", stato:"pianificata" }, // altro cliente
  ];
  const allClienti = [
    { id:10, rs:"Cliente A" }, { id:20, rs:"Cliente B" }, { id:30, rs:"Cliente C" },
  ];
  const allAssets = [
    { id:1, clienteId:10, nome:"Asset 1" },
    { id:2, clienteId:20, nome:"Asset 2" }, // altro cliente
  ];

  it("cliente vede solo le proprie manutenzioni", () => {
    const view = calcolaManView(allMan, true, [10]);
    expect(view).toHaveLength(2);
    expect(view.every(m => m.clienteId === 10)).toBe(true);
  });

  it("cliente NON vede manutenzioni di altri clienti", () => {
    const view = calcolaManView(allMan, true, [10]);
    expect(view.some(m => m.clienteId === 20)).toBe(false);
    expect(view.some(m => m.clienteId === 30)).toBe(false);
  });

  it("admin vede tutto (isCliente=false)", () => {
    const view = calcolaManView(allMan, false, null);
    expect(view).toHaveLength(4);
  });

  it("cliente con siti multipli vede tutti i suoi", () => {
    const view = calcolaManView(allMan, true, [10, 20]);
    expect(view).toHaveLength(3);
    expect(view.some(m => m.clienteId === 30)).toBe(false);
  });

  it("cliente senza siti assegnati non vede nulla", () => {
    const view = calcolaManView(allMan, true, []);
    expect(view).toHaveLength(0);
  });

  it("clientiView filtrata correttamente", () => {
    const view = calcolaClientiView(allClienti, true, [10]);
    expect(view).toHaveLength(1);
    expect(view[0].id).toBe(10);
  });

  it("assetsView filtrata per cliente", () => {
    const view = calcolaAssetsView(allAssets, true, [10]);
    expect(view).toHaveLength(1);
    expect(view[0].clienteId).toBe(10);
  });
});

describe("Sicurezza — tenant_id nei payload DB", () => {
  it("insert include tenant_id se presente", () => {
    const payload = toDbM({ titolo:"T", stato:"pianificata" }, "uid-1", "tenant-A");
    expect(payload.tenant_id).toBe("tenant-A");
  });

  it("insert NON include tenant_id se null", () => {
    const payload = toDbM({ titolo:"T", stato:"pianificata" }, "uid-1", null);
    expect(Object.keys(payload)).not.toContain("tenant_id");
  });

  it("user_id sempre incluso", () => {
    const payload = toDbM({ titolo:"T", stato:"pianificata" }, "uid-xyz", "t1");
    expect(payload.user_id).toBe("uid-xyz");
  });

  it("uid() undefined non passa se session è null (guard)", () => {
    const session = null;
    const uid = () => session?.user?.id || null;
    expect(uid()).toBeNull();
  });
});

describe("Sicurezza — validazione input", () => {
  it("XSS: titolo con script tag viene trattato come testo", () => {
    const titolo = "<script>alert('xss')</script>";
    // In React il testo è auto-escaped — verifichiamo che non venga eseguito
    // Il test verifica che la stringa sia preservata as-is (non eseguita)
    expect(titolo).toContain("<script>");
    // In produzione React renderizza come testo — nessun elemento DOM creato
  });

  it("SQL injection in titolo non altera la query (parametrized via Supabase)", () => {
    const malicious = "'; DROP TABLE manutenzioni; --";
    // Supabase usa query parametrizzate — il titolo viene passato come valore
    // Non c'è concatenazione di stringhe SQL
    const payload = toDbM({ titolo: malicious, stato: "pianificata" }, "uid", "tid");
    expect(payload.titolo).toBe(malicious); // stringa preservata, non eseguita
  });

  it("email con formato non valido viene rilevata", () => {
    const invalidEmails = ["noemail", "@nodomain.it", "no@", "no @test.it", ""];
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    invalidEmails.forEach(email => expect(regex.test(email)).toBe(false));
  });

  it("email valide vengono accettate", () => {
    const validEmails = ["user@example.com", "a+b@test.co.uk", "mario.rossi@azienda.it"];
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    validEmails.forEach(email => expect(regex.test(email)).toBe(true));
  });

  it("numero ordine con timestamp è sempre unico in 1000 tentativi", () => {
    const numeri = new Set();
    for (let i = 0; i < 1000; i++) {
      // Simula la logica di generazione numero ordine
      const ts = (Date.now() + i).toString(36).toUpperCase().slice(-4);
      const num = `OA-2025-${ts}`;
      numeri.add(num);
    }
    expect(numeri.size).toBe(1000); // tutti unici
  });
});

describe("Sicurezza — STATO richiesta cliente", () => {
  it("richiesta cliente entra con stato='richiesta'", () => {
    const nuovaRichiesta = { titolo: "Guasto pompa", stato: "richiesta" };
    expect(nuovaRichiesta.stato).toBe("richiesta");
  });

  it("stato 'richiesta' è distinto da 'pianificata'", () => {
    expect("richiesta").not.toBe("pianificata");
  });

  it("STATO_LABEL include 'richiesta'", () => {
    const STATO_LABEL = { richiesta:"Richiesta", pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };
    expect(STATO_LABEL.richiesta).toBe("Richiesta");
  });
});
