import React, { useState, useEffect, useMemo } from "react";
import { ImportaRicambi } from "./ImportaRicambi";
import { supabase } from "../supabase";

const fmtEuro = v => v ? `€${Number(v).toFixed(2)}` : "—";

// ─── Ricambi usati in un intervento ──────────────────────────────────────
export function InterventoRicambi({ manutenzioneId, readOnly = false, tenantId }) {
  const [righe, setRighe]     = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [nuova, setNuova]      = useState({ ricambioId:"", nomeLibero:"", quantita:1, prezzoUnitario:"", note:"" });

  useEffect(() => { if(manutenzioneId) carica(); }, [manutenzioneId]);

  const carica = async () => {
    setLoading(true);
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("intervento_ricambi").select("*, ricambi(nome,codice,unita)").eq("manutenzione_id", manutenzioneId).order("created_at"),
      supabase.from("ricambi").select("*").order("nome"),
    ]);
    setRighe(r || []);
    setCatalogo(c || []);
    setLoading(false);
  };

  const aggiungi = async () => {
    const rc = catalogo.find(c => String(c.id) === nuova.ricambioId);
    const { data } = await supabase.from("intervento_ricambi").insert({
      manutenzione_id: manutenzioneId,
      ricambio_id:     rc ? rc.id : null,
      nome_libero:     rc ? null : (nuova.nomeLibero || "Ricambio"),
      quantita:        Number(nuova.quantita) || 1,
      prezzo_unitario: nuova.prezzoUnitario ? Number(nuova.prezzoUnitario) : (rc?.prezzo || null),
      note:            nuova.note || null,
    }).select("*, ricambi(nome,codice,unita)").single();
    if (data) {
      setRighe(p => [...p, data]);
      setNuova({ ricambioId:"", nomeLibero:"", quantita:1, prezzoUnitario:"", note:"" });
    }
  };

  const rimuovi = async (id) => {
    await supabase.from("intervento_ricambi").delete().eq("id", id);
    setRighe(p => p.filter(r => r.id !== id));
  };

  const totale = righe.reduce((s, r) => s + (r.quantita || 1) * (r.prezzo_unitario || 0), 0);

  const st = {
    wrap: { marginBottom: 8 },
    head: { fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 },
    row: { display: "grid", gridTemplateColumns: "1fr 60px 80px auto", gap: 6, alignItems: "center", padding: "6px 10px", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 4 },
    inp: { padding: "6px 8px", border: "1px solid var(--border-dim)", borderRadius: 5, fontSize: 12, background: "var(--surface)", color: "var(--text-1)", width: "100%" },
    btn: { padding: "6px 12px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  };

  if (loading) return <div style={{ fontSize: 12, color: "var(--text-3)", padding: "6px 0" }}>Caricamento ricambi...</div>;

  return (
    <div style={st.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={st.head}>🔩 Ricambi utilizzati</span>
        {totale > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)" }}>Totale: {fmtEuro(totale)}</span>}
      </div>

      {righe.map(r => {
        const nome = r.ricambi?.nome || r.nome_libero || "—";
        const unita = r.ricambi?.unita || "pz";
        const totR = (r.quantita || 1) * (r.prezzo_unitario || 0);
        return (
          <div key={r.id} style={st.row}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{nome}</div>
              {r.ricambi?.codice && <div style={{ fontSize: 10, color: "var(--text-3)" }}>{r.ricambi.codice}</div>}
              {r.note && <div style={{ fontSize: 10, color: "var(--text-3)", fontStyle: "italic" }}>{r.note}</div>}
            </div>
            <div style={{ fontSize: 12, textAlign: "center" }}>{r.quantita} {unita}</div>
            <div style={{ fontSize: 12, textAlign: "right", color: totR > 0 ? "var(--amber)" : "var(--text-3)" }}>
              {r.prezzo_unitario ? fmtEuro(totR) : "—"}
            </div>
            {!readOnly && (
              <button onClick={() => rimuovi(r.id)} style={{ ...st.btn, background: "#FEF2F2", color: "#DC2626", padding: "4px 8px" }}>✕</button>
            )}
          </div>
        );
      })}

      {righe.length === 0 && <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", marginBottom: 8 }}>Nessun ricambio registrato</div>}

      {!readOnly && (
        <div style={{ display: "grid", gap: 6, padding: "10px", background: "var(--surface-2)", borderRadius: 8, border: "1px dashed var(--border-dim)", marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 2 }}>Aggiungi ricambio</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {catalogo.length > 0 ? (
              <select value={nuova.ricambioId} onChange={e => setNuova(p => ({ ...p, ricambioId: e.target.value, nomeLibero: "" }))} style={st.inp}>
                <option value="">— Da catalogo —</option>
                {catalogo.map(c => <option key={c.id} value={String(c.id)}>{c.nome}{c.codice ? ` [${c.codice}]` : ""}</option>)}
                <option value="__libero">+ Inserisci manualmente</option>
              </select>
            ) : null}
            {(!nuova.ricambioId || nuova.ricambioId === "__libero") && (
              <input placeholder="Nome ricambio" value={nuova.nomeLibero} onChange={e => setNuova(p => ({ ...p, nomeLibero: e.target.value, ricambioId: "" }))} style={st.inp} />
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 100px 1fr auto", gap: 6 }}>
            <input type="number" placeholder="Qtà" min={0.1} step={0.1} value={nuova.quantita} onChange={e => setNuova(p => ({ ...p, quantita: e.target.value }))} style={st.inp} />
            <input type="number" placeholder="€ unitario" min={0} step={0.01} value={nuova.prezzoUnitario} onChange={e => setNuova(p => ({ ...p, prezzoUnitario: e.target.value }))} style={st.inp} />
            <input placeholder="Note (opz.)" value={nuova.note} onChange={e => setNuova(p => ({ ...p, note: e.target.value }))} style={st.inp} />
            <button onClick={aggiungi} disabled={!nuova.ricambioId && !nuova.nomeLibero.trim()}
              style={{ ...st.btn, background: "var(--amber)", color: "#0D1B2A", opacity: (!nuova.ricambioId && !nuova.nomeLibero.trim()) ? 0.5 : 1 }}>
              + Aggiungi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Catalogo ricambi (sezione Azienda o standalone) ─────────────────────
export function CatalogoRicambi({ tenantId }) {
  const [ricambi, setRicambi] = useState([]);
  const [form, setForm]       = useState({ nome: "", codice: "", unita: "pz", prezzo: "", categoria: "", note: "" });
  const [loading, setLoading]  = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const s = k => v => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { carica(); }, []);

  const carica = async () => {
    const { data } = await supabase.from("ricambi").select("*").order("nome");
    setRicambi(data || []);
    setLoading(false);
  };

  const salva = async () => {
    if (!form.nome.trim()) return;
    const { data } = await supabase.from("ricambi").insert({
      nome: form.nome.trim(), codice: form.codice || null,
      unita: form.unita || "pz", prezzo: form.prezzo ? Number(form.prezzo) : null,
      categoria: form.categoria || null, note: form.note || null, tenant_id: tenantId,
    }).select().single();
    if (data) { setRicambi(p => [...p, data]); setForm({ nome: "", codice: "", unita: "pz", prezzo: "", categoria: "", note: "" }); setMostraForm(false); }
  };

  const elimina = async (id) => {
    await supabase.from("ricambi").delete().eq("id", id);
    setRicambi(p => p.filter(r => r.id !== id));
  };

  const UNITA = ["pz", "m", "m²", "kg", "l", "h", "conf."];
  const st = {
    row: { display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 100px auto", gap: 8, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 13 },
    inp: { padding: "7px 10px", border: "1px solid var(--border-dim)", borderRadius: 6, fontSize: 13, background: "var(--surface)", color: "var(--text-1)", width: "100%" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>🔩 Catalogo ricambi ({ricambi.length})</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={() => {setShowImport(p=>!p);setMostraForm(false);}} style={{ padding: "7px 14px", background:"var(--surface)", color:"var(--text-1)", border:"1px solid var(--border)", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {showImport ? "✕ Chiudi import" : "📥 Importa CSV/Excel"}
          </button>
          <button onClick={() => {setMostraForm(p => !p);setShowImport(false);}} style={{ padding: "7px 14px", background: "var(--amber)", color: "#0D1B2A", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {mostraForm ? "✕ Annulla" : "+ Nuovo ricambio"}
          </button>
        </div>
      </div>

      {showImport && (
        <div style={{border:"1px solid var(--border)",borderRadius:10,marginBottom:16,overflow:"hidden"}}>
          <ImportaRicambi tenantId={tenantId} onDone={()=>{setShowImport(false);carica();}} />
        </div>
      )}
      {mostraForm && (
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Nome *</label><input value={form.nome} onChange={e => s("nome")(e.target.value)} style={st.inp} placeholder="Es. Filtro olio 10W-40" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Codice / SKU</label><input value={form.codice} onChange={e => s("codice")(e.target.value)} style={st.inp} placeholder="Es. FO-001" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 120px 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Unità</label>
              <select value={form.unita} onChange={e => s("unita")(e.target.value)} style={st.inp}>
                {UNITA.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Prezzo unitario (€)</label><input type="number" value={form.prezzo} onChange={e => s("prezzo")(e.target.value)} style={st.inp} placeholder="0.00" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Categoria</label><input value={form.categoria||""} onChange={e => s("categoria")(e.target.value)} style={st.inp} placeholder="Es. Filtri, Cinghie..." /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Note</label><input value={form.note} onChange={e => s("note")(e.target.value)} style={st.inp} placeholder="Fornitore, riferimento..." /></div>
          </div>
          <button onClick={salva} disabled={!form.nome.trim()} style={{ padding: "8px 20px", background: "var(--amber)", color: "#0D1B2A", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", justifySelf: "start" }}>Salva ricambio</button>
        </div>
      )}

      {loading ? <div style={{ color: "var(--text-3)", fontSize: 13 }}>Caricamento...</div> : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ ...st.row, background: "var(--surface-2)", fontWeight: 700, fontSize: 11, color: "var(--text-2)", textTransform: "uppercase" }}>
            <span>Nome</span><span>Codice</span><span>Unità</span><span>Prezzo</span><span></span>
          </div>
          {ricambi.length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>Nessun ricambio nel catalogo</div>}
          {ricambi.map(r => (
            <div key={r.id} style={st.row}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.nome}</div>
                {r.note && <div style={{ fontSize: 11, color: "var(--text-3)" }}>{r.note}</div>}
              </div>
              <div style={{ color: "var(--text-3)", fontSize: 12 }}>{r.codice || "—"}</div>
              <div style={{ fontSize: 12 }}>{r.unita}</div>
              <div style={{ fontWeight: 600, color: r.prezzo ? "var(--amber)" : "var(--text-3)" }}>{r.prezzo ? fmtEuro(r.prezzo) : "—"}</div>
              <button onClick={() => elimina(r.id)} style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 5, padding: "3px 7px", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
