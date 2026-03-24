import React, { useState, useMemo, useCallback } from "react";
import { supabase } from "../supabase";
import { Field, Modal, Overlay, ConfirmDialog } from "./ui/Atoms";
import { ChecklistEditor } from "./PianoChecklist";

// ─── Costanti locali ───────────────────────────────────────────────────────
const FREQUENZE = [
  { v:"settimanale", l:"Settimanale" },
  { v:"mensile",     l:"Mensile"     },
  { v:"bimestrale",  l:"Bimestrale"  },
  { v:"trimestrale", l:"Trimestrale" },
  { v:"semestrale",  l:"Semestrale"  },
  { v:"annuale",     l:"Annuale"     },
];
const PRI = [
  { v:"bassa",   l:"Bassa",   col:"#94A3B8" },
  { v:"media",   l:"Media",   col:"#F59E0B" },
  { v:"alta",    l:"Alta",    col:"#3B82F6" },
  { v:"urgente", l:"Urgente", col:"#EF4444" },
];
const SCOPE_CFG = {
  asset:    { icon:"⚙", label:"Asset",    bg:"#EFF6FF", col:"#1E40AF" },
  area:     { icon:"📍", label:"Area",     bg:"#F0FDF4", col:"#166534" },
  generale: { icon:"📋", label:"Generale", bg:"#F9FAFB", col:"#374151" },
};
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const isoToday = () => new Date().toISOString().split("T")[0];

// ─── ModalVoce — aggiungi/modifica una singola attività del piano ──────────
function ModalVoce({ ini, piano, clienti=[], assets=[], operatori=[], onClose, onSalva }) {
  const clientePiano = clienti.find(c => c.id === piano?.clienteId);
  const assetsCliente = useMemo(() =>
    assets.filter(a => a.clienteId === piano?.clienteId),
    [assets, piano?.clienteId]
  );
  const fornitori = useMemo(() => operatori.filter(o => o.tipo === "fornitore"), [operatori]);

  const vuoto = {
    titolo:"", scope:"asset", assetId:"", area_nome:"",
    operatoreId: fornitori[0]?.id ? String(fornitori[0].id) : "",
    frequenza:"mensile", durata:60, tipo:"ordinaria", priorita:"media", note:"",
  };
  const [f, sf] = useState(ini ? {
    ...vuoto, ...ini,
    assetId:    String(ini.assetId   || ""),
    operatoreId:String(ini.operatoreId || fornitori[0]?.id || ""),
  } : vuoto);
  const s = (k, v) => sf(p => ({ ...p, [k]: v }));

  const saveOk = !!f.titolo.trim() &&
    (f.scope === "asset" ? !!f.assetId : f.scope === "area" ? !!f.area_nome.trim() : true);

  return (
    <Modal
      title={ini ? "Modifica attività" : "Nuova attività nel piano"}
      onClose={onClose}
      onSave={() => onSalva({
        ...f,
        pianoId:     piano?.id,
        clienteId:   piano?.clienteId || null,
        assetId:     f.scope === "asset" && f.assetId ? Number(f.assetId) : null,
        area_nome:   f.scope === "area" ? f.area_nome : null,
        operatoreId: f.operatoreId ? Number(f.operatoreId) : null,
        durata:      Number(f.durata) || 60,
        dataInizio:  piano?.dataInizio || isoToday(),
        dataFine:    piano?.dataFine   || null,
        attivo:      true,
      })}
      saveOk={saveOk}
      saveLabel={ini ? "Aggiorna" : "Aggiungi attività"}
    >
      {/* Nome attività */}
      <Field label="Nome attività *">
        <input value={f.titolo} onChange={e => s("titolo", e.target.value)}
          style={{ width:"100%" }} placeholder="Es. Taglio erba, Cambio filtri pompa, Verifica estintori..." />
      </Field>

      {/* Scope */}
      <Field label="Tipo di attività">
        <div style={{ display:"flex", gap:8 }}>
          {Object.entries(SCOPE_CFG).map(([k, cfg]) => (
            <div key={k} onClick={() => s("scope", k)} style={{
              flex:1, padding:"10px 8px", borderRadius:8, cursor:"pointer", textAlign:"center",
              border: `2px solid ${f.scope === k ? cfg.col : "var(--border)"}`,
              background: f.scope === k ? cfg.bg : "var(--surface)",
              transition:"all .15s",
            }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{cfg.icon}</div>
              <div style={{ fontSize:12, fontWeight:700, color: f.scope===k ? cfg.col : "var(--text-2)" }}>{cfg.label}</div>
              <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>
                {k==="asset" ? "Macchina specifica" : k==="area" ? "Zona / luogo" : "Nessun vincolo"}
              </div>
            </div>
          ))}
        </div>
      </Field>

      {/* Asset se scope=asset */}
      {f.scope === "asset" && (
        <Field label="Asset *">
          <select value={f.assetId} onChange={e => s("assetId", e.target.value)} style={{ width:"100%" }}>
            <option value="">— Seleziona asset —</option>
            {assetsCliente.map(a => (
              <option key={a.id} value={String(a.id)}>{a.nome}{a.tipo ? ` (${a.tipo})` : ""}</option>
            ))}
          </select>
          {assetsCliente.length === 0 && (
            <div style={{ fontSize:11, color:"var(--amber)", marginTop:4 }}>
              ⚠ Nessun asset associato a {clientePiano?.rs || "questo cliente"}
            </div>
          )}
        </Field>
      )}

      {/* Area se scope=area */}
      {f.scope === "area" && (
        <Field label="Nome area / zona *">
          <input value={f.area_nome} onChange={e => s("area_nome", e.target.value)}
            style={{ width:"100%" }} placeholder="Es. Giardino Nord, Parcheggio Est, Locale caldaia..." />
        </Field>
      )}

      {/* Operatore */}
      <Field label="Operatore / fornitore">
        <select value={f.operatoreId} onChange={e => s("operatoreId", e.target.value)} style={{ width:"100%" }}>
          <option value="">— Non assegnato —</option>
          {fornitori.map(o => (
            <option key={o.id} value={String(o.id)}>{o.nome}{o.spec ? ` · ${o.spec}` : ""}</option>
          ))}
        </select>
      </Field>

      {/* Frequenza, durata, tipo, priorità */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Frequenza">
          <select value={f.frequenza} onChange={e => s("frequenza", e.target.value)} style={{ width:"100%" }}>
            {FREQUENZE.map(fr => <option key={fr.v} value={fr.v}>{fr.l}</option>)}
          </select>
        </Field>
        <Field label="Durata (min)">
          <input type="number" min={15} step={15} value={f.durata}
            onChange={e => s("durata", e.target.value)} style={{ width:"100%" }} />
        </Field>
        <Field label="Tipo">
          <select value={f.tipo} onChange={e => s("tipo", e.target.value)} style={{ width:"100%" }}>
            <option value="ordinaria">Ordinaria</option>
            <option value="straordinaria">Straordinaria</option>
          </select>
        </Field>
        <Field label="Priorità">
          <select value={f.priorita} onChange={e => s("priorita", e.target.value)} style={{ width:"100%" }}>
            {PRI.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </Field>
      </div>

      {/* Note */}
      <Field label="Note / istruzioni">
        <textarea value={f.note} onChange={e => s("note", e.target.value)}
          rows={2} style={{ width:"100%", resize:"vertical" }}
          placeholder="Istruzioni specifiche, materiali necessari, riferimenti tecnici..." />
      </Field>
    </Modal>
  );
}

// ─── ModalPiano — crea/modifica un piano (contenitore) ────────────────────
function ModalPianoNuovo({ ini, clienti=[], onClose, onSalva }) {
  const vuoto = { nome:"", clienteId:"", descrizione:"", dataInizio:isoToday(), dataFine:"", attivo:true };
  const [f, sf] = useState(ini ? {
    ...vuoto, ...ini, clienteId: String(ini.clienteId || "")
  } : vuoto);
  const s = (k, v) => sf(p => ({ ...p, [k]: v }));

  return (
    <Modal title={ini ? "Modifica piano" : "Nuovo piano di manutenzione"}
      onClose={onClose}
      onSave={() => onSalva({ ...f, clienteId: f.clienteId ? Number(f.clienteId) : null })}
      saveOk={!!f.nome.trim()}
      saveLabel={ini ? "Aggiorna" : "Crea piano"}
    >
      <Field label="Nome piano *">
        <input value={f.nome} onChange={e => s("nome", e.target.value)} style={{ width:"100%" }}
          placeholder="Es. Contratto 2025, Manutenzione estiva, Piano annuale..." />
      </Field>
      <Field label="Cliente / sito">
        <select value={f.clienteId} onChange={e => s("clienteId", e.target.value)} style={{ width:"100%" }}>
          <option value="">— Nessun cliente —</option>
          {clienti.map(c => <option key={c.id} value={String(c.id)}>{c.rs}</option>)}
        </select>
      </Field>
      <Field label="Descrizione">
        <textarea value={f.descrizione} onChange={e => s("descrizione", e.target.value)}
          rows={2} style={{ width:"100%", resize:"vertical" }}
          placeholder="Descrizione del contratto o piano di manutenzione..." />
      </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Data inizio">
          <input type="date" value={f.dataInizio} onChange={e => s("dataInizio", e.target.value)} style={{ width:"100%" }} />
        </Field>
        <Field label="Data fine (opz.)">
          <input type="date" value={f.dataFine} onChange={e => s("dataFine", e.target.value)} style={{ width:"100%" }} />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Riga voce nel piano ───────────────────────────────────────────────────
function RigaVoce({ voce, assets=[], operatori=[], onMod, onDel }) {
  const cfg  = SCOPE_CFG[voce.scope] || SCOPE_CFG.asset;
  const asset = assets.find(a => a.id === voce.assetId);
  const op   = operatori.find(o => o.id === voce.operatoreId);
  const freq = FREQUENZE.find(f => f.v === voce.frequenza);
  const pri  = PRI.find(p => p.v === voce.priorita);

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
      background:"var(--surface-2)", borderRadius:8, marginBottom:6,
      border:"1px solid var(--border)",
    }}>
      {/* Scope icon */}
      <div style={{
        width:34, height:34, borderRadius:7, flexShrink:0,
        background:cfg.bg, border:`1px solid ${cfg.col}22`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
      }}>{cfg.icon}</div>

      {/* Info principale */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:13, color:"var(--text-1)" }}>{voce.titolo}</div>
        <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3, display:"flex", gap:8, flexWrap:"wrap" }}>
          {voce.scope === "asset"    && asset   && <span>⚙ {asset.nome}</span>}
          {voce.scope === "area"     && voce.area_nome && <span>📍 {voce.area_nome}</span>}
          {voce.scope === "generale" && <span style={{ color:cfg.col, fontWeight:600 }}>Generale</span>}
          {op && <span style={{ display:"flex", alignItems:"center", gap:3 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:op.col, display:"inline-block" }}/>
            {op.nome}
          </span>}
        </div>
      </div>

      {/* Badge frequenza */}
      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:99,
        background:"var(--surface)", border:"1px solid var(--border)",
        color:"var(--text-2)", whiteSpace:"nowrap", flexShrink:0 }}>
        {freq?.l || voce.frequenza}
      </span>

      {/* Badge durata */}
      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:99,
        background:"var(--surface)", border:"1px solid var(--border)",
        color:"var(--text-2)", whiteSpace:"nowrap", flexShrink:0 }}>
        {voce.durata >= 60 ? `${Math.round(voce.durata/60)}h${voce.durata%60>0?voce.durata%60+"m":""}` : `${voce.durata}m`}
      </span>

      {/* Priorità dot */}
      {pri && <span style={{
        width:8, height:8, borderRadius:"50%", background:pri.col,
        flexShrink:0, title:pri.l,
      }} title={pri.l} />}

      {/* Azioni */}
      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
        <button className="btn-sm btn-icon" onClick={() => onMod(voce)}>✏</button>
        <button className="btn-sm btn-icon btn-danger" onClick={() => onDel(voce.id)}>✕</button>
      </div>
    </div>
  );
}

// ─── Pannello dettaglio piano ──────────────────────────────────────────────
function PannelloPiano({
  piano, voci=[], assets=[], clienti=[], operatori=[], manutenzioni=[],
  onModPiano, onDelPiano,
  onAggVoce, onModVoce, onDelVoce,
  onGeneraCalendario,
}) {
  const [showVoce, setShowVoce] = useState(false);
  const [inModVoce, setInModVoce] = useState(null);
  const [generando, setGenerando] = useState(false);

  const cliente = clienti.find(c => c.id === piano.clienteId);
  const manPiano = manutenzioni.filter(m => m.pianoId === piano.id);
  const attivePiano = manPiano.filter(m => m.stato !== "completata");
  const prossima = attivePiano.sort((a,b) => a.data.localeCompare(b.data))[0];

  const stimaInterventi = voci.reduce((tot, v) => {
    const freq = { settimanale:52, mensile:12, bimestrale:6, trimestrale:4, semestrale:2, annuale:1 };
    return tot + (freq[v.frequenza] || 12);
  }, 0);

  const genera = async () => {
    setGenerando(true);
    try { await onGeneraCalendario(piano); }
    finally { setGenerando(false); }
  };

  return (
    <div style={{ display:"grid", gap:14 }}>
      {/* Header piano */}
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:12, padding:"16px 18px",
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:700, fontSize:17 }}>{piano.nome}</div>
            <div style={{ fontSize:12, color:"var(--text-3)", marginTop:4, display:"flex", gap:12, flexWrap:"wrap" }}>
              {cliente && <span style={{ color:"#7F77DD", fontWeight:600 }}>🏢 {cliente.rs}</span>}
              {piano.dataInizio && <span>📅 {fmtData(piano.dataInizio)}{piano.dataFine ? ` → ${fmtData(piano.dataFine)}` : ""}</span>}
              {attivePiano.length > 0 && <span>🔄 {attivePiano.length} attività attive</span>}
              {prossima && <span>⏭ Prossima: {fmtData(prossima.data)}</span>}
            </div>
            {piano.descrizione && (
              <div style={{ fontSize:12, color:"var(--text-2)", marginTop:6, fontStyle:"italic" }}>
                {piano.descrizione}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <button className="btn-sm btn-icon" onClick={() => onModPiano(piano)}>✏</button>
            <button className="btn-sm btn-icon btn-danger" onClick={() => onDelPiano(piano.id)}>✕</button>
          </div>
        </div>
      </div>

      {/* Voci del piano */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--text-1)" }}>
            Attività del piano ({voci.length})
          </div>
          <button className="btn-primary" style={{ fontSize:12, padding:"6px 14px" }}
            onClick={() => { setInModVoce(null); setShowVoce(true); }}>
            + Aggiungi attività
          </button>
        </div>

        {voci.length === 0 ? (
          <div style={{
            border:"2px dashed var(--border)", borderRadius:10,
            padding:"32px", textAlign:"center", color:"var(--text-3)",
          }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>Nessuna attività</div>
            <div style={{ fontSize:12, marginBottom:16, lineHeight:1.6 }}>
              Aggiungi le attività di manutenzione: su asset specifici,<br/>
              per zone/aree o attività generali senza vincolo fisico.
            </div>
            <button className="btn-primary"
              onClick={() => { setInModVoce(null); setShowVoce(true); }}>
              + Aggiungi prima attività
            </button>
          </div>
        ) : (
          <>
            {voci.map(v => (
              <RigaVoce key={v.id} voce={v} assets={assets} operatori={operatori}
                onMod={v => { setInModVoce(v); setShowVoce(true); }}
                onDel={onDelVoce} />
            ))}

            {/* Footer — stima + genera */}
            <div style={{
              marginTop:10, padding:"12px 16px",
              background:"var(--surface-2)", borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
              border:"1px solid var(--border)",
            }}>
              <div style={{ fontSize:12, color:"var(--text-2)" }}>
                <span style={{ fontWeight:700 }}>{voci.length}</span> attività ·
                stima <span style={{ fontWeight:700 }}>{stimaInterventi}</span> interventi/anno
                {attivePiano.length > 0 && <span style={{ color:"var(--text-3)" }}> · {attivePiano.length} già generate</span>}
              </div>
              <button onClick={genera} disabled={generando}
                style={{
                  padding:"8px 18px", borderRadius:7, fontWeight:700, fontSize:13, cursor:"pointer",
                  background:"#059669", color:"white", border:"none", flexShrink:0,
                  opacity: generando ? 0.7 : 1,
                }}>
                {generando ? "⏳ Generazione..." : "⚡ Genera calendario"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Checklist del piano */}
      {piano.id && (
        <div style={{
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:10, padding:"14px 16px",
        }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", marginBottom:10 }}>
            ✅ Checklist comune (opzionale)
          </div>
          <ChecklistEditor pianoId={piano.id} />
        </div>
      )}

      {/* Modal voce */}
      {showVoce && (
        <ModalVoce
          ini={inModVoce}
          piano={piano}
          clienti={clienti} assets={assets} operatori={operatori}
          onClose={() => { setShowVoce(false); setInModVoce(null); }}
          onSalva={async f => {
            if (inModVoce) await onModVoce({ ...inModVoce, ...f });
            else await onAggVoce(f);
            setShowVoce(false); setInModVoce(null);
          }}
        />
      )}
    </div>
  );
}

// ─── GestionePiani — layout sidebar clienti + dettaglio piano ─────────────
export function GestionePiani({
  piani=[], assegnazioni=[], clienti=[], assets=[], manutenzioni=[],
  operatori=[], templates=[], ricambi=[],
  onAgg, onMod, onDel,
  onAggAss, onModAss, onDelAss,
  onAttivaDisattiva, onRinnova,
}) {
  const [pianoSelId, setPianoSelId] = useState(null);
  const [showNuovoPiano, setShowNuovoPiano] = useState(false);
  const [inModPiano, setInModPiano] = useState(null);
  const [clienteFiltro, setClienteFiltro] = useState(null); // null = tutti
  const [cerca, setCerca] = useState("");

  // Piano selezionato
  const pianoSel = piani.find(p => p.id === pianoSelId);

  // Raggruppa piani per cliente
  const pianiPerCliente = useMemo(() => {
    const map = {};
    piani.forEach(p => {
      const cid = p.clienteId || "__nessuno__";
      if (!map[cid]) map[cid] = [];
      map[cid].push(p);
    });
    return map;
  }, [piani]);

  // Clienti che hanno almeno un piano
  const clientiConPiani = useMemo(() => {
    const ids = new Set(piani.map(p => p.clienteId).filter(Boolean));
    return clienti.filter(c => ids.has(c.id));
  }, [piani, clienti]);

  // Voci del piano selezionato (sono le assegnazioni)
  const vociPianoSel = useMemo(() =>
    assegnazioni.filter(a => a.pianoId === pianoSelId && a.attivo !== false),
    [assegnazioni, pianoSelId]
  );

  // Filtra piani nella sidebar
  const pianiSidebar = useMemo(() => {
    let lista = piani;
    if (clienteFiltro) lista = lista.filter(p => p.clienteId === clienteFiltro);
    if (cerca.trim()) lista = lista.filter(p =>
      p.nome.toLowerCase().includes(cerca.toLowerCase()) ||
      clienti.find(c => c.id === p.clienteId)?.rs.toLowerCase().includes(cerca.toLowerCase())
    );
    return lista;
  }, [piani, clienteFiltro, cerca, clienti]);

  const handleDelPiano = (id) => {
    onDel(id);
    if (pianoSelId === id) setPianoSelId(null);
  };

  // Genera tutte le occorrenze di tutte le voci del piano
  const handleGeneraCalendario = useCallback(async (piano) => {
    const voci = assegnazioni.filter(a => a.pianoId === piano.id && a.attivo !== false);
    if (voci.length === 0) return;
    let totale = 0;
    for (const voce of voci) {
      // Genera solo se ha dataInizio
      if (!voce.dataInizio) continue;
      await onAggAss({ ...voce, _soloGenera: true }, piano);
      totale++;
    }
  }, [assegnazioni, onAggAss]);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:0, minHeight:500 }}>

      {/* ── Sidebar ── */}
      <div style={{
        borderRight:"1px solid var(--border)",
        paddingRight:16, display:"grid", alignContent:"start", gap:8,
      }}>
        {/* Cerca */}
        <input value={cerca} onChange={e => setCerca(e.target.value)}
          placeholder="🔍 Cerca piano..."
          style={{ marginBottom:4 }} />

        {/* Filtro cliente */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
          <button onClick={() => setClienteFiltro(null)} style={{
            fontSize:11, padding:"3px 9px", borderRadius:99,
            background: clienteFiltro === null ? "var(--navy)" : "var(--surface)",
            color: clienteFiltro === null ? "white" : "var(--text-3)",
            border:"1px solid var(--border)", cursor:"pointer",
          }}>Tutti</button>
          {clientiConPiani.slice(0,6).map(c => (
            <button key={c.id} onClick={() => setClienteFiltro(c.id)} style={{
              fontSize:11, padding:"3px 9px", borderRadius:99,
              background: clienteFiltro === c.id ? "#7F77DD" : "var(--surface)",
              color: clienteFiltro === c.id ? "white" : "var(--text-3)",
              border:"1px solid var(--border)", cursor:"pointer",
              maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>{c.rs}</button>
          ))}
        </div>

        {/* Lista piani */}
        {pianiSidebar.length === 0 && (
          <div style={{ fontSize:12, color:"var(--text-3)", textAlign:"center", padding:"16px 0" }}>
            Nessun piano trovato
          </div>
        )}
        {pianiSidebar.map(p => {
          const cl = clienti.find(c => c.id === p.clienteId);
          const nVoci = assegnazioni.filter(a => a.pianoId === p.id).length;
          const isSelected = p.id === pianoSelId;
          return (
            <div key={p.id}
              onClick={() => setPianoSelId(p.id)}
              style={{
                padding:"10px 12px", borderRadius:8, cursor:"pointer",
                border: `1px solid ${isSelected ? "#059669" : "var(--border)"}`,
                background: isSelected ? "#ECFDF5" : "var(--surface)",
                transition:"all .15s",
              }}
            >
              <div style={{
                fontWeight:700, fontSize:13,
                color: isSelected ? "#065F46" : "var(--text-1)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>{p.nome}</div>
              <div style={{ fontSize:11, color: isSelected ? "#059669" : "var(--text-3)", marginTop:3, display:"flex", gap:6 }}>
                {cl && <span>{cl.rs}</span>}
                <span>{nVoci} attività</span>
              </div>
            </div>
          );
        })}

        {/* Bottone nuovo piano */}
        <button
          className="btn-primary"
          style={{ marginTop:8, width:"100%" }}
          onClick={() => { setInModPiano(null); setShowNuovoPiano(true); }}
        >
          + Nuovo piano
        </button>
      </div>

      {/* ── Pannello dettaglio ── */}
      <div style={{ paddingLeft:20 }}>
        {!pianoSel ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-3)" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:8, color:"var(--text-2)" }}>
              Seleziona un piano
            </div>
            <div style={{ fontSize:13, marginBottom:24, lineHeight:1.6 }}>
              Scegli un piano dalla lista a sinistra per vedere<br/>
              e gestire le sue attività di manutenzione.<br/>
              Ogni attività può essere su un asset, un'area o generale.
            </div>
            <button className="btn-primary"
              onClick={() => { setInModPiano(null); setShowNuovoPiano(true); }}>
              + Crea primo piano
            </button>
          </div>
        ) : (
          <PannelloPiano
            piano={pianoSel}
            voci={vociPianoSel}
            assets={assets} clienti={clienti} operatori={operatori} manutenzioni={manutenzioni}
            onModPiano={p => { setInModPiano(p); setShowNuovoPiano(true); }}
            onDelPiano={handleDelPiano}
            onAggVoce={onAggAss}
            onModVoce={onModAss}
            onDelVoce={onDelAss}
            onGeneraCalendario={handleGeneraCalendario}
          />
        )}
      </div>

      {/* Modal nuovo/modifica piano */}
      {showNuovoPiano && (
        <ModalPianoNuovo
          ini={inModPiano}
          clienti={clienti}
          onClose={() => { setShowNuovoPiano(false); setInModPiano(null); }}
          onSalva={async f => {
            if (inModPiano) {
              await onMod({ ...inModPiano, ...f });
            } else {
              const np = await onAgg(f);
              if (np?.id) setPianoSelId(np.id);
            }
            setShowNuovoPiano(false); setInModPiano(null);
          }}
        />
      )}
    </div>
  );
}
