import { useState, useEffect } from "react";
import { supabase } from "../supabase";

// ─── Editor checklist (nel form del piano) ────────────────────────────────
export function ChecklistEditor({ pianoId, pianoPadreId = null, readOnly = false }) {
  const [steps, setSteps] = useState([]);
  const [stepsEreditati, setStepsEreditati] = useState([]);
  const [nuovoTesto, setNuovoTesto] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pianoId) carica();
  }, [pianoId]);

  useEffect(() => {
    if (pianoPadreId) caricaEreditati();
    else setStepsEreditati([]);
  }, [pianoPadreId]);

  const caricaEreditati = async () => {
    const { data } = await supabase
      .from("piano_checklist")
      .select("*")
      .eq("piano_id", pianoPadreId)
      .order("ordine");
    setStepsEreditati(data || []);
  };

  const carica = async () => {
    const { data } = await supabase
      .from("piano_checklist")
      .select("*")
      .eq("piano_id", pianoId)
      .order("ordine");
    setSteps(data || []);
  };

  const aggiungi = async () => {
    if (!nuovoTesto.trim() || !pianoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("piano_checklist").insert({
        piano_id: pianoId,
        testo: nuovoTesto.trim(),
        ordine: steps.length,
        obbligatorio: true,
      }).select().single();
      if (!error && data) setSteps(p => [...p, data]);
      setNuovoTesto("");
    } catch(e) {
      console.error("Errore checklist:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const rimuovi = async (id) => {
  try {
    await supabase.from("piano_checklist").delete().eq("id", id);
    setSteps(p => p.filter(s => s.id !== id));
  } catch(e) { console.error("rimuovi:", e.message); }
};

  const toggleObbligatorio = async (id, val) => {
  try {
    await supabase.from("piano_checklist").update({ obbligatorio: val }).eq("id", id);
    setSteps(p => p.map(s => s.id === id ? { ...s, obbligatorio: val } : s));
  } catch(e) { console.error("toggleObbligatorio:", e.message); }
};

  const aggiornaOgniN = async (id, n) => {
  try {
    await supabase.from("piano_checklist").update({ ogni_n_interventi: n }).eq("id", id);
    setSteps(p => p.map(s => s.id === id ? { ...s, ogni_n_interventi: n } : s));
  } catch(e) { console.error("aggiornaOgniN:", e.message); }
};

  const sposta = async (idx, dir) => {
    const newSteps = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    // Aggiorna ordine
    await Promise.all(newSteps.map((s, i) =>
      supabase.from("piano_checklist").update({ ordine: i }).eq("id", s.id)
    ));
    setSteps(newSteps);
  };

  const st = {
    wrap: { marginTop: 8 },
    head: { fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 },
    step: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 4 },
    num:  { width: 20, height: 20, borderRadius: "50%", background: "var(--navy-3)", color: "var(--amber)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    txt:  { flex: 1, fontSize: 13, color: "var(--text-1)" },
    btn:  { background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 14, padding: "2px 4px" },
    inp:  { flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-dim)", background: "var(--surface)", color: "var(--text-1)", fontSize: 13 },
    add:  { padding: "8px 14px", background: "var(--amber)", color: "#0D1B2A", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  };

  return (
    <div style={st.wrap}>
      <div style={st.head}>✅ Checklist intervento ({steps.length} step)</div>
      {stepsEreditati.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
            📥 Ereditati dal piano padre ({stepsEreditati.length})
          </div>
          {stepsEreditati.map((s, i) => (
            <div key={s.id} style={{ ...st.step, opacity: 0.6, background: "var(--surface)", borderStyle: "dashed" }}>
              <div style={{ ...st.num, background: "var(--border)" }}>{i + 1}</div>
              <span style={{ ...st.txt, color: "var(--text-3)" }}>{s.testo}</span>
              {s.obbligatorio && <span style={{ fontSize: 10, color: "var(--text-3)" }}>obbl.</span>}
            </div>
          ))}
          {steps.length > 0 && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, marginBottom: 4 }}>+ Step aggiuntivi di questo livello:</div>}
        </div>
      )}
      {steps.map((s, i) => (
        <div key={s.id} style={st.step}>
          <div style={st.num}>{i + 1}</div>
          <span style={st.txt}>{s.testo}</span>
          <label title="Obbligatorio" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)", cursor: "pointer" }}>
            <input type="checkbox" checked={s.obbligatorio} onChange={e => toggleObbligatorio(s.id, e.target.checked)} />
            obbl.
          </label>
          <select
            value={s.ogni_n_interventi || 1}
            onChange={e => aggiornaOgniN(s.id, Number(e.target.value))}
            title="Ogni quanti interventi appare questo step"
            style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: "1px solid var(--border-dim)", background: "var(--surface)", color: "var(--text-2)", cursor: "pointer" }}>
            <option value={1}>ogni volta</option>
            <option value={2}>ogni 2</option>
            <option value={3}>ogni 3</option>
            <option value={4}>ogni 4</option>
            <option value={6}>ogni 6</option>
            <option value={8}>ogni 8</option>
            <option value={12}>ogni 12</option>
            <option value={26}>ogni 26</option>
            <option value={52}>ogni 52</option>
          </select>
          {!readOnly && <>
            <button style={st.btn} onClick={() => sposta(i, -1)} disabled={i === 0} title="Su">↑</button>
            <button style={st.btn} onClick={() => sposta(i, 1)} disabled={i === steps.length - 1} title="Giù">↓</button>
            <button style={{ ...st.btn, color: "var(--red)" }} onClick={() => rimuovi(s.id)} title="Rimuovi">✕</button>
          </>}
        </div>
      ))}
      {!readOnly && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input style={st.inp} placeholder="Aggiungi step checklist..." value={nuovoTesto}
            onChange={e => setNuovoTesto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && aggiungi()} />
          <button style={st.add} onClick={aggiungi} disabled={loading || !nuovoTesto.trim()}>
            + Aggiungi
          </button>
        </div>
      )}
      {steps.length === 0 && readOnly && (
        <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>Nessuna checklist definita per questo piano</div>
      )}
    </div>
  );
}

// ─── Compilazione checklist durante intervento ────────────────────────────
export function ChecklistIntervento({ manutenzione, onProgressChange, readOnly=false }) {
  const [steps, setSteps] = useState([]);
  const [stato, setStato] = useState({}); // { stepId: { completato, note } }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (manutenzione?.pianoId) carica();
    else setLoading(false);
  }, [manutenzione?.id]);

  const caricaEreditati = async () => {
    const { data } = await supabase
      .from("piano_checklist")
      .select("*")
      .eq("piano_id", pianoPadreId)
      .order("ordine");
    setStepsEreditati(data || []);
  };

  const carica = async () => {
    setLoading(true);
    // Carica step del piano
    const { data: stepsData } = await supabase
      .from("piano_checklist")
      .select("*")
      .eq("piano_id", manutenzione.pianoId)
      .order("ordine");

    // Carica stato attuale per questo intervento
    const { data: statoData } = await supabase
      .from("manutenzione_checklist")
      .select("*")
      .eq("manutenzione_id", manutenzione.id);

    // Mostra solo step attivi per questo intervento (cadenza)
    const nIntervento = manutenzione.numero_intervento || 1;
    const stepsArr = (stepsData || []).filter(s => {
      const n = s.ogni_n_interventi || 1;
      return n === 1 || nIntervento % n === 0;
    });
    setSteps(stepsArr);

    const statoMap = {};
    (statoData || []).forEach(r => {
      statoMap[r.step_id] = { completato: r.completato, note: r.note || "" };
    });
    setStato(statoMap);
    setLoading(false);

    // Notifica progresso iniziale
    aggiornaProgresso(stepsArr, statoMap);
  };

  const aggiornaProgresso = (stepsArr, statoMap) => {
    if (!onProgressChange || !stepsArr) return;
    const obbligatori = stepsArr.filter(s => s.obbligatorio);
    const completatiObbligatori = obbligatori.filter(s => statoMap[s.id]?.completato);
    const tuttiObbligatoriOk = obbligatori.length === 0 || completatiObbligatori.length === obbligatori.length;
    const totCompletati = stepsArr.filter(s => statoMap[s.id]?.completato).length;
    onProgressChange({
      totale: stepsArr.length,
      completati: totCompletati,
      obbligatoriOk: tuttiObbligatoriOk,
      obbligatoriTot: obbligatori.length,
      obbligatoriCompletati: completatiObbligatori.length,
    });
  };

  const toggleStep = async (step) => {
    if (readOnly) return;
    const corrente = stato[step.id] || { completato: false, note: "" };
    const nuovoValore = !corrente.completato;

    const nuovoStato = { ...stato, [step.id]: { ...corrente, completato: nuovoValore } };
    setStato(nuovoStato);
    if (steps && steps.length) aggiornaProgresso(steps, nuovoStato);

    // Upsert nel DB
    await supabase.from("manutenzione_checklist").upsert({
      manutenzione_id: manutenzione.id,
      step_id: step.id,
      completato: nuovoValore,
      completato_at: nuovoValore ? new Date().toISOString() : null,
    }, { onConflict: "manutenzione_id,step_id" });
  };

  if (loading) return <div style={{ fontSize: 13, color: "var(--text-3)", padding: "8px 0" }}>Caricamento checklist...</div>;
  if (steps.length === 0) return (
    <div style={{ textAlign:"center", padding:"28px 16px", color:"var(--text-3)" }}>
      <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:6, color:"var(--text-2)" }}>Nessuna checklist configurata</div>
      <div style={{ fontSize:12, lineHeight:1.6 }}>
        Per aggiungere una checklist a questo piano,<br/>
        vai in <strong>Piani</strong> → modifica il piano → tab Checklist.
      </div>
    </div>
  );

  const bloccata = manutenzione?.stato === "pianificata";

  const completati = steps.filter(s => stato[s.id]?.completato).length;
  const obbligatoriMancanti = steps.filter(s => s.obbligatorio && !stato[s.id]?.completato);
  const perc = steps.length ? Math.round(completati / steps.length * 100) : 0;

  const st = {
    wrap: { marginBottom: 16 },
    head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    title: { fontSize: 13, fontWeight: 700, color: "var(--text-1)" },
    bar: { height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden", marginBottom: 10 },
    fill: { height: "100%", background: perc === 100 ? "#059669" : "var(--amber)", borderRadius: 99, transition: "width .3s", width: perc + "%" },
    step: (completato) => ({
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
      background: completato ? "#ECFDF5" : "var(--surface-2)",
      border: `1px solid ${completato ? "#A7F3D0" : "var(--border)"}`,
      borderRadius: 8, marginBottom: 6, cursor: "pointer", transition: "all .15s",
    }),
    check: (completato) => ({
      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
      border: `2px solid ${completato ? "#059669" : "var(--border-dim)"}`,
      background: completato ? "#059669" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontSize: 12, transition: "all .15s",
    }),
    warn: { background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400E", marginBottom: 8 },
  };

  return (
    <div style={st.wrap}>
      <div style={st.head}>
        <span style={st.title}>✅ Checklist — {completati}/{steps.length} completati</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: perc === 100 ? "#059669" : "var(--amber)" }}>{perc}%</span>
      </div>
      <div style={st.bar}><div style={st.fill} /></div>
      {bloccata && (
        <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--text-3)",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🔒</span>
          <span>Avvia l'intervento per compilare la checklist</span>
        </div>
      )}
      {!bloccata && obbligatoriMancanti.length > 0 && (
        <div style={st.warn}>
          ⚠ {obbligatoriMancanti.length} step obbligatori ancora da completare
        </div>
      )}
      {steps.map((s, i) => {
        const comp = stato[s.id]?.completato;
        return (
          <div key={s.id} style={{...st.step(comp), cursor: readOnly?"default":"pointer", opacity: readOnly ? 0.7 : 1}} onClick={() => !readOnly && toggleStep(s)}>
            <div style={st.check(comp)}>{comp && "✓"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: comp ? 500 : 400, color: comp ? "#065F46" : "var(--text-1)", textDecoration: comp ? "line-through" : "none", opacity: comp ? 0.8 : 1 }}>
                {i + 1}. {s.testo}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                {s.obbligatorio && !comp && (
                  <span style={{ fontSize: 10, color: "#B45309", fontWeight: 600, background: "#FEF3C7", padding: "1px 5px", borderRadius: 3 }}>OBBLIGATORIO</span>
                )}
                {(s.ogni_n_interventi || 1) > 1 && (
                  <span style={{ fontSize: 10, color: "var(--text-3)", background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>
                    ogni {s.ogni_n_interventi} interventi
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
