import React, { useState, useRef, useEffect, useCallback } from "react";

// ─── Helper: chiama Claude API ────────────────────────────────────────────
async function claudeCall(systemPrompt, userMessage, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── 1. AUTO-CLASSIFICAZIONE TICKET ──────────────────────────────────────
export async function classificaTicket(testo, assets = [], clienti = []) {
  if (!testo || testo.length < 10) return null;

  const assetsNomi = assets.slice(0, 30).map(a => a.nome).join(", ");
  const clientiNomi = clienti.slice(0, 20).map(c => c.rs).join(", ");

  const system = `Sei un esperto di manutenzione industriale. Analizza la descrizione di un guasto/problema e restituisci SOLO un oggetto JSON valido, senza markdown né spiegazioni.`;

  const prompt = `Descrizione del problema: "${testo}"

Asset disponibili nel sistema: ${assetsNomi || "non specificati"}
Clienti: ${clientiNomi || "non specificati"}

Restituisci SOLO questo JSON (nessun testo extra):
{
  "tipo": "correttiva|urgente|miglioria|normativa",
  "priorita": "bassa|media|alta|critica",
  "causa_guasto": "stringa breve o null",
  "fermo_impianto": true|false,
  "titolo_suggerito": "titolo conciso max 60 caratteri",
  "spiegazione": "1 frase di spiegazione della classificazione"
}`;

  try {
    const raw = await claudeCall(system, prompt, 300);
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

// ─── 2. REPORT MENSILE AI ─────────────────────────────────────────────────
export async function generaReportMensile(dati) {
  const { mese, anno, manutenzioni, ticket, clienti, assets, operatori, odl } = dati;

  const nomeMese = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"][mese];

  // Statistiche da passare all'AI
  const completate    = manutenzioni.filter(m => m.stato === "completata");
  const scadute       = manutenzioni.filter(m => m.stato === "scaduta");
  const ticketAperti  = ticket.filter(t => t.stato === "aperto");
  const ticketChiusi  = ticket.filter(t => ["chiuso","risolto"].includes(t.stato));
  const oreTotal      = completate.reduce((s, m) => s + (m.oreEffettive || 0), 0);
  const fermi         = ticket.filter(t => t.fermo_impianto);

  // Top clienti per attività
  const perCliente = {};
  manutenzioni.forEach(m => {
    if (!m.clienteId) return;
    const cl = clienti.find(c => c.id === m.clienteId);
    if (!cl) return;
    if (!perCliente[cl.rs]) perCliente[cl.rs] = { completate: 0, scadute: 0, ticket: 0 };
    if (m.stato === "completata") perCliente[cl.rs].completate++;
    if (m.stato === "scaduta")    perCliente[cl.rs].scadute++;
  });
  ticket.forEach(t => {
    const cl = clienti.find(c => c.id === t.cliente_id);
    if (cl) { if (!perCliente[cl.rs]) perCliente[cl.rs] = { completate:0, scadute:0, ticket:0 }; perCliente[cl.rs].ticket++; }
  });

  // Top operatori
  const perOp = {};
  completate.forEach(m => {
    const op = operatori.find(o => o.id === m.operatoreId);
    if (op) { if (!perOp[op.nome]) perOp[op.nome] = 0; perOp[op.nome]++; }
  });

  const system = `Sei un esperto di analisi operativa per aziende di manutenzione industriale.
Scrivi report professionali, concisi, in italiano, con tono diretto e orientato ai dati.
Usa paragrafi brevi. Metti in evidenza anomalie e suggerisci azioni concrete.
NON usare markdown come ** o #. Usa solo testo plain con a capo per separare le sezioni.`;

  const prompt = `Genera il report mensile di ${nomeMese} ${anno} per questa azienda di manutenzione.

DATI DEL MESE:
- Manutenzioni programmate completate: ${completate.length}
- Manutenzioni scadute senza esecuzione: ${scadute.length}
- Ore totali di lavoro registrate: ${oreTotal.toFixed(1)}h
- OdL chiusi nel mese: ${odl.filter(o => o.stato === "completato").length}
- Ticket aperti: ${ticketAperti.length}
- Ticket risolti/chiusi: ${ticketChiusi.length}
- Fermi impianto segnalati: ${fermi.length}
- Asset totali monitorati: ${assets.length}
- Operatori attivi: ${operatori.filter(o => o.tipo === "fornitore").length}

DETTAGLIO PER CLIENTE (top 5):
${Object.entries(perCliente).slice(0,5).map(([n,v])=>`- ${n}: ${v.completate} completate, ${v.scadute} scadute, ${v.ticket} ticket`).join("\n")}

OPERATORI PIÙ ATTIVI:
${Object.entries(perOp).slice(0,3).map(([n,v])=>`- ${n}: ${v} interventi`).join("\n")}

Struttura il report in:
1. SINTESI DEL MESE (2-3 frasi)
2. PUNTI DI ATTENZIONE (problemi, ritardi, anomalie — sii diretto)
3. PERFORMANCE OPERATORI (breve)
4. RACCOMANDAZIONI (2-3 azioni concrete per il mese prossimo)`;

  return await claudeCall(system, prompt, 800);
}

// ─── 3. CHATBOT PANEL ─────────────────────────────────────────────────────
function buildContextSystem(dati) {
  const { manutenzioni, ticket, clienti, assets, operatori, piani, odl, tenantNome } = dati;

  const oggi = new Date().toISOString().split("T")[0];

  return `Sei ManuMan AI, l'assistente intelligente di ${tenantNome || "questa azienda"} per la gestione delle manutenzioni.
Hai accesso ai dati operativi in tempo reale. Rispondi in italiano, in modo diretto e utile.
Usa dati concreti nelle risposte. Sii breve (max 150 parole) salvo richieste di analisi dettagliate.

DATI ATTUALI (${oggi}):
- Manutenzioni totali: ${manutenzioni.length} (${manutenzioni.filter(m=>m.stato==="pianificata").length} pianificate, ${manutenzioni.filter(m=>m.stato==="inCorso").length} in corso, ${manutenzioni.filter(m=>m.stato==="scaduta").length} scadute)
- Ticket aperti: ${ticket.filter(t=>t.stato==="aperto").length}, in lavorazione: ${ticket.filter(t=>t.stato==="in_lavorazione").length}
- OdL attivi: ${odl.filter(o=>!["completato","annullato"].includes(o.stato)).length}
- Clienti: ${clienti.length}, Asset: ${assets.length}, Operatori: ${operatori.filter(o=>o.tipo==="fornitore").length}
- Piani attivi: ${piani.filter(p=>p.attivo).length}

CLIENTI: ${clienti.slice(0,15).map(c=>c.rs).join(", ")}
ASSET: ${assets.slice(0,20).map(a=>`${a.nome}(${a.tipo||"?"})`).join(", ")}
OPERATORI: ${operatori.filter(o=>o.tipo==="fornitore").slice(0,10).map(o=>o.nome).join(", ")}

MANUTENZIONI SCADUTE: ${manutenzioni.filter(m=>m.stato==="scaduta").slice(0,5).map(m=>{const cl=clienti.find(c=>c.id===m.clienteId);return `"${m.titolo}" (${cl?.rs||"?"}, ${m.data})`;}).join("; ")}

TICKET URGENTI/CRITICI: ${ticket.filter(t=>["urgente","correttiva"].includes(t.tipo)&&t.stato==="aperto").slice(0,5).map(t=>{const cl=clienti.find(c=>c.id===t.cliente_id);return `"${t.titolo}" (${cl?.rs||"?"}, ${t.priorita})`;}).join("; ")}`;
}

export function ChatbotPanel({ dati, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Ciao! Sono ManuMan AI 🤖\nChiedimi qualsiasi cosa sui tuoi dati operativi.\n\nEsempio: "Quali attività sono scadute questa settimana?" oppure "Come sta andando il Cliente Rossi?"` }
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const history = useRef([]); // cronologia per multi-turn

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const invia = useCallback(async () => {
    const testo = input.trim();
    if (!testo || loading) return;
    setInput("");
    setMessages(p => [...p, { role: "user", text: testo }]);
    setLoading(true);

    try {
      // Costruisci history per conversazione multi-turn
      history.current.push({ role: "user", content: testo });

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: buildContextSystem(dati),
          messages: history.current.slice(-10), // ultimi 10 messaggi
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const risposta = data.content?.[0]?.text || "Non ho capito, riprova.";

      history.current.push({ role: "assistant", content: risposta });
      setMessages(p => [...p, { role: "assistant", text: risposta }]);
    } catch (e) {
      setMessages(p => [...p, { role: "assistant", text: `⚠ Errore: ${e.message}. Controlla la connessione.` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, dati]);

  const suggerimenti = [
    "Attività scadute oggi",
    "Ticket urgenti aperti",
    "Asset a rischio guasto",
    "Performance operatori",
  ];

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: "min(420px,100vw)",
      background: "var(--surface)", borderLeft: "1px solid var(--border)",
      boxShadow: "-4px 0 32px rgba(0,0,0,.2)",
      zIndex: 600, display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--border)",
        background: "var(--navy)", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg,#F59E0B,#EF4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14, color: "white" }}>
            ManuMan AI
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>
            Assistente intelligente · powered by Claude
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}>✕</button>
      </div>

      {/* Messaggi */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
          }}>
            {m.role === "assistant" && (
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginRight: 8,
                background: "linear-gradient(135deg,#F59E0B,#EF4444)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                alignSelf: "flex-end",
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: "80%",
              padding: "10px 13px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? "var(--navy)" : "var(--surface-2)",
              color: m.role === "user" ? "white" : "var(--text-1)",
              fontSize: 13, lineHeight: 1.6,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "linear-gradient(135deg,#F59E0B,#EF4444)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
            }}>🤖</div>
            <div style={{ background: "var(--surface-2)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
              <span style={{ display: "inline-flex", gap: 4 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--text-3)",
                    animation: `bounce 1s ${i*0.2}s infinite`,
                    display: "inline-block",
                  }}/>
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggerimenti rapidi */}
      {messages.length <= 2 && (
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {suggerimenti.map(s => (
            <button key={s} onClick={() => { setInput(s); }}
              style={{
                padding: "4px 10px", fontSize: 11, fontWeight: 600,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 99, cursor: "pointer", color: "var(--text-2)",
                transition: "all .15s",
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); invia(); } }}
          placeholder="Scrivi una domanda... (Invio per inviare)"
          rows={2}
          style={{
            flex: 1, padding: "9px 12px", border: "1px solid var(--border-dim)",
            borderRadius: 10, fontSize: 13, resize: "none",
            background: "var(--surface)", color: "var(--text-1)",
            lineHeight: 1.5,
          }}
        />
        <button onClick={invia} disabled={!input.trim() || loading}
          style={{
            padding: "0 16px", background: "var(--navy)", color: "white",
            border: "none", borderRadius: 10, cursor: "pointer",
            fontWeight: 700, fontSize: 18, flexShrink: 0,
            opacity: (!input.trim() || loading) ? 0.4 : 1,
          }}>↑</button>
      </div>
    </div>
  );
}

// ─── 4. BADGE "AI" per auto-classificazione nel form ticket ──────────────
export function AIClassificaBadge({ suggerimento, onApplica }) {
  if (!suggerimento) return null;
  return (
    <div style={{
      background: "linear-gradient(135deg,#1E1B4B,#312E81)",
      border: "1px solid #4C1D95",
      borderRadius: "var(--radius)",
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#C4B5FD" }}>Suggerimento AI</span>
        <span style={{ fontSize: 10, color: "#7C3AED", marginLeft: "auto" }}>{suggerimento.spiegazione}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, background: "#4C1D95", color: "#DDD6FE", padding: "2px 8px", borderRadius: 99 }}>
          Tipo: {suggerimento.tipo}
        </span>
        <span style={{ fontSize: 11, background: "#4C1D95", color: "#DDD6FE", padding: "2px 8px", borderRadius: 99 }}>
          Priorità: {suggerimento.priorita}
        </span>
        {suggerimento.causa_guasto && (
          <span style={{ fontSize: 11, background: "#4C1D95", color: "#DDD6FE", padding: "2px 8px", borderRadius: 99 }}>
            Causa: {suggerimento.causa_guasto}
          </span>
        )}
        {suggerimento.fermo_impianto && (
          <span style={{ fontSize: 11, background: "#7C2D12", color: "#FED7AA", padding: "2px 8px", borderRadius: 99 }}>
            ⛔ Fermo impianto
          </span>
        )}
        <button onClick={() => onApplica(suggerimento)}
          style={{
            marginLeft: "auto", padding: "4px 12px", fontSize: 11, fontWeight: 700,
            background: "#7C3AED", color: "white", border: "none",
            borderRadius: 6, cursor: "pointer",
          }}>
          ✓ Applica
        </button>
      </div>
    </div>
  );
}

// CSS per bouncing dots
const bounceCss = `@keyframes bounce {
  0%,80%,100%{transform:translateY(0)}
  40%{transform:translateY(-6px)}
}`;
if (typeof document !== "undefined" && !document.getElementById("ai-bounce-css")) {
  const s = document.createElement("style");
  s.id = "ai-bounce-css";
  s.textContent = bounceCss;
  document.head.appendChild(s);
}
