import React, { useState, useMemo } from "react";
import { supabase } from "../supabase";
import { Overlay } from "./ui/Atoms";

// ── Utility ──────────────────────────────────────────────────────────────
const isoDate   = d => d.toISOString().split("T")[0];
const fmtData   = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"short"}) : "—";
const BATCH     = 50;

const FREQ_GIORNI = {
  settimanale:7, mensile:30, bimestrale:60,
  trimestrale:90, semestrale:180, annuale:365,
};

function addDays(d, n) {
  const dt = new Date(d+"T00:00:00"); dt.setDate(dt.getDate()+n);
  return dt.toISOString().split("T")[0];
}
function addMonths(d, n) {
  const dt = new Date(d+"T00:00:00"); dt.setMonth(dt.getMonth()+n);
  return dt.toISOString().split("T")[0];
}

// Genera tutte le date di occorrenza per una voce nel periodo
function occorrenzePeriodo(voce, piano, da, a) {
  const freq   = voce.frequenza || piano.frequenza || "mensile";
  const giorni = FREQ_GIORNI[freq] || 30;
  const start  = voce.dataInizio || piano.dataInizio || da;
  const end    = voce.dataFine   || piano.dataFine   || a;
  const fine   = end < a ? end : a;

  const result = [];
  let cur = start < da ? da : start;
  const mult = {mensile:1,bimestrale:2,trimestrale:3,semestrale:6,annuale:12}[freq];

  while (cur <= fine && result.length < 500) {
    result.push(cur);
    cur = mult ? addMonths(cur, mult) : addDays(cur, giorni);
  }
  return result;
}

// Raggruppa occorrenze in OdL per operatore+giorno (Alternativa B)
function costruisciOdL(voci, piano, operatori, assets, da, a) {
  // Mappa { "opId_data": { operatore, data, voci[] } }
  const gruppi = {};

  for (const voce of voci) {
    if (!voce.attivo) continue;
    const date = occorrenzePeriodo(voce, piano, da, a);
    for (const data of date) {
      // Raggruppa per operatore + data
      const key = `${voce.operatoreId||"nessuno"}_${data}`;
      if (!gruppi[key]) {
        gruppi[key] = {
          key,
          operatoreId: voce.operatoreId || null,
          data,
          voci: [],
          durata: 0,
        };
      }
      gruppi[key].voci.push(voce);
      gruppi[key].durata += Number(voce.durata || piano.durata || 60);
    }
  }

  // Converti in array ordinato per data
  return Object.values(gruppi).sort((a,b) => a.data.localeCompare(b.data));
}

// ── Modal Anteprima OdL ───────────────────────────────────────────────────
export function ModalGeneraOdL({
  piano, voci=[], operatori=[], assets=[], clienti=[],
  tenantId, uid,
  onClose, onGenera,
}) {
  const oggi   = isoDate(new Date());
  const treMesi = addMonths(oggi, 3);

  const [da, setDa]       = useState(piano.dataInizio || oggi);
  const [a,  setA]        = useState(piano.dataFine   || treMesi);
  const [aggreg, setAggr] = useState("visita"); // visita | singola | unico
  const [confermando, setConfermando] = useState(false);
  const [step, setStep]   = useState("anteprima"); // anteprima | conferma | fatto
  const [risultato, setRisultato] = useState(null);

  const cliente = clienti.find(c=>c.id===piano.clienteId);

  // Calcola OdL in anteprima
  const odlAnteprima = useMemo(()=>{
    const vociAttive = voci.filter(v=>v.attivo);
    if (!vociAttive.length || !da || !a) return [];

    if (aggreg === "visita") {
      return costruisciOdL(vociAttive, piano, operatori, assets, da, a);
    }
    if (aggreg === "singola") {
      // Un OdL per ogni voce×data
      const result = [];
      for (const voce of vociAttive) {
        const date = occorrenzePeriodo(voce, piano, da, a);
        for (const data of date) {
          result.push({
            key: `${voce.id}_${data}`,
            operatoreId: voce.operatoreId || null,
            data,
            voci: [voce],
            durata: Number(voce.durata || piano.durata || 60),
          });
        }
      }
      return result.sort((a,b)=>a.data.localeCompare(b.data));
    }
    if (aggreg === "unico") {
      // Tutti gli OdL per visita ma poi un solo OdL finale (non comune, ma supportato)
      const byVisita = costruisciOdL(vociAttive, piano, operatori, assets, da, a);
      // Raggruppa per mese
      const byMese = {};
      for (const odl of byVisita) {
        const mese = odl.data.slice(0,7);
        if (!byMese[mese]) byMese[mese] = { key:mese, data:odl.data, mese, voci:[], durata:0, operatoreId:null };
        byMese[mese].voci.push(...odl.voci);
        byMese[mese].durata += odl.durata;
      }
      return Object.values(byMese).sort((a,b)=>a.mese.localeCompare(b.mese));
    }
    return [];
  }, [voci, piano, da, a, aggreg, operatori, assets]);

  const totAttivita = odlAnteprima.reduce((s,o)=>s+o.voci.length, 0);

  // Genera OdL nel DB
  const genera = async () => {
    if (!odlAnteprima.length) return;
    setConfermando(true);
    try {
      let nOdl = 0;
      let nAtt = 0;

      // Conta OdL esistenti per numerazione
      const { count: esistenti } = await supabase
        .from("ordini_lavoro").select("id",{count:"exact",head:true})
        .eq("tenant_id", tenantId);
      let counter = (esistenti||0) + 1;

      for (const gruppo of odlAnteprima) {
        // 1. Crea OdL
        const op = operatori.find(o=>o.id===gruppo.operatoreId);
        const numero = `OdL-${new Date().getFullYear()}-${String(counter).padStart(3,"0")}`;
        const titoloParts = [
          piano.nome,
          cliente?.rs ? `· ${cliente.rs}` : "",
          `· ${fmtData(gruppo.data)}`,
        ].filter(Boolean).join(" ");

        const { data: odlRow, error: odlErr } = await supabase
          .from("ordini_lavoro")
          .insert({
            tenant_id:      tenantId,
            piano_id:       piano.id,
            cliente_id:     piano.clienteId || null,
            operatore_id:   gruppo.operatoreId || null,
            numero,
            titolo:         titoloParts,
            stato:          "bozza",
            data_inizio:    gruppo.data,
            data_fine:      gruppo.data,  // mono-giorno di default
            durata_stimata: gruppo.durata,
            created_by:     uid,
          })
          .select().single();

        if (odlErr) { console.error(odlErr); continue; }
        counter++;
        nOdl++;

        // 2. Crea manutenzioni collegate all'OdL
        const rows = gruppo.voci.map((voce, idx) => ({
          titolo:          voce.titolo || piano.nome,
          tipo:            voce.tipo   || piano.tipo    || "ordinaria",
          stato:           "pianificata",
          priorita:        voce.priorita || piano.priorita || "media",
          operatore_id:    voce.operatoreId || null,
          cliente_id:      piano.clienteId  || null,
          asset_id:        voce.scope==="asset" ? (voce.assetId||null) : null,
          piano_id:        piano.id,
          assegnazione_id: voce.id || null,
          odl_id:          odlRow.id,
          data:            gruppo.data,
          durata:          Number(voce.durata || piano.durata || 60),
          note:            voce.note || piano.descrizione || "",
          user_id:         uid,
          numero_intervento: idx + 1,
          ...(tenantId && { tenant_id: tenantId }),
        }));

        for (let i=0; i<rows.length; i+=BATCH) {
          const { data:chunk } = await supabase.from("manutenzioni")
            .insert(rows.slice(i, i+BATCH)).select();
          if (chunk) nAtt += chunk.length;
        }
      }

      setRisultato({ nOdl, nAtt });
      setStep("fatto");
      onGenera?.({ nOdl, nAtt });
    } finally { setConfermando(false); }
  };

  const PRI_SCOPE = { asset:"⚙", area:"📍", generale:"📋" };

  return (
    <Overlay onClose={onClose}>
      <div style={{
        background:"var(--surface)", borderRadius:"var(--radius-xl)",
        width:"min(700px,97vw)", maxHeight:"92vh", overflow:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.3)",
      }}>
        {/* Header */}
        <div style={{padding:"20px 24px 16px", borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"var(--font-head)", fontWeight:700, fontSize:17}}>
            ⚡ Genera ordini di lavoro
          </div>
          <div style={{fontSize:12, color:"var(--text-3)", marginTop:4}}>
            {piano.nome}{cliente ? ` · ${cliente.rs}` : ""} · {voci.filter(v=>v.attivo).length} attività attive
          </div>
        </div>

        {step === "anteprima" && (
          <>
            <div style={{padding:"20px 24px", display:"grid", gap:16}}>
              {/* Periodo */}
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <div>
                  <div style={{fontSize:11, fontWeight:700, color:"var(--text-2)",
                    textTransform:"uppercase", letterSpacing:".04em", marginBottom:6}}>Da</div>
                  <input type="date" value={da} onChange={e=>setDa(e.target.value)}
                    style={{width:"100%"}} />
                </div>
                <div>
                  <div style={{fontSize:11, fontWeight:700, color:"var(--text-2)",
                    textTransform:"uppercase", letterSpacing:".04em", marginBottom:6}}>A</div>
                  <input type="date" value={a} min={da} onChange={e=>setA(e.target.value)}
                    style={{width:"100%"}} />
                </div>
              </div>

              {/* Aggregazione */}
              <div>
                <div style={{fontSize:11, fontWeight:700, color:"var(--text-2)",
                  textTransform:"uppercase", letterSpacing:".04em", marginBottom:8}}>
                  Raggruppa attività in OdL per
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
                  {[
                    { v:"visita",  l:"Visita", sub:"stesso operatore+giorno → 1 OdL" },
                    { v:"singola", l:"Attività", sub:"1 OdL per ogni attività" },
                    { v:"unico",   l:"Mese", sub:"tutte le attività del mese → 1 OdL" },
                  ].map(opt=>(
                    <button key={opt.v} onClick={()=>setAggr(opt.v)} style={{
                      padding:"10px 12px", borderRadius:"var(--radius)",
                      border:`2px solid ${aggreg===opt.v ? "var(--amber)" : "var(--border)"}`,
                      background: aggreg===opt.v ? "#FFFBEB" : "var(--surface)",
                      cursor:"pointer", textAlign:"left",
                    }}>
                      <div style={{fontWeight:700, fontSize:13, color: aggreg===opt.v ? "#92400E" : "var(--text-1)"}}>
                        {opt.l}
                      </div>
                      <div style={{fontSize:10, color:"var(--text-3)", marginTop:3, lineHeight:1.4}}>
                        {opt.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Anteprima OdL */}
              <div>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                  <div style={{fontSize:12, fontWeight:700, color:"var(--text-2)"}}>
                    Anteprima — {odlAnteprima.length} OdL · {totAttivita} attività
                  </div>
                  {odlAnteprima.length > 10 && (
                    <div style={{fontSize:11, color:"var(--text-3)"}}>
                      Mostrando prime 10 di {odlAnteprima.length}
                    </div>
                  )}
                </div>

                {odlAnteprima.length === 0 ? (
                  <div style={{textAlign:"center", padding:"24px", color:"var(--text-3)",
                    border:"1px dashed var(--border)", borderRadius:"var(--radius)"}}>
                    Nessuna occorrenza nel periodo selezionato.
                  </div>
                ) : (
                  <div style={{display:"grid", gap:6, maxHeight:360, overflowY:"auto"}}>
                    {odlAnteprima.slice(0,10).map(odl=>{
                      const op = operatori.find(o=>o.id===odl.operatoreId);
                      const ore = odl.durata >= 60
                        ? `${Math.round(odl.durata/60*10)/10}h`
                        : `${odl.durata}min`;
                      return (
                        <div key={odl.key} style={{
                          display:"flex", gap:12, alignItems:"flex-start",
                          padding:"10px 14px",
                          background:"var(--surface-2)", borderRadius:"var(--radius)",
                          border:"1px solid var(--border)",
                        }}>
                          {/* Data */}
                          <div style={{
                            width:48, height:48, borderRadius:"var(--radius-sm)",
                            background:"var(--amber-glow, #FEF3C7)",
                            display:"flex", flexDirection:"column",
                            alignItems:"center", justifyContent:"center",
                            flexShrink:0,
                          }}>
                            <div style={{fontSize:16, fontWeight:700, color:"#92400E", lineHeight:1}}>
                              {new Date(odl.data+"T00:00:00").getDate()}
                            </div>
                            <div style={{fontSize:9, color:"#92400E", textTransform:"uppercase", marginTop:2}}>
                              {new Date(odl.data+"T00:00:00").toLocaleDateString("it-IT",{month:"short"})}
                            </div>
                          </div>

                          {/* Info OdL */}
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap"}}>
                              {op && (
                                <span style={{
                                  display:"flex", alignItems:"center", gap:4,
                                  fontSize:12, fontWeight:600,
                                }}>
                                  <span style={{width:8, height:8, borderRadius:"50%",
                                    background:op.col, display:"inline-block"}}/>
                                  {op.nome}
                                </span>
                              )}
                              {!op && <span style={{fontSize:12, color:"var(--text-3)"}}>Operatore da assegnare</span>}
                              <span style={{fontSize:11, color:"var(--text-3)"}}>· {ore} totali</span>
                            </div>
                            {/* Elenco attività */}
                            <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
                              {odl.voci.map((v,i)=>(
                                <span key={i} style={{
                                  fontSize:10, padding:"2px 7px",
                                  background:"var(--surface)", border:"1px solid var(--border)",
                                  borderRadius:99, color:"var(--text-2)",
                                  display:"inline-flex", alignItems:"center", gap:3,
                                }}>
                                  <span>{PRI_SCOPE[v.scope||"asset"]}</span>
                                  {v.titolo || piano.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {odlAnteprima.length > 10 && (
                      <div style={{textAlign:"center", padding:"8px", fontSize:12,
                        color:"var(--text-3)", fontStyle:"italic"}}>
                        + altri {odlAnteprima.length - 10} OdL...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{
              padding:"14px 24px", borderTop:"1px solid var(--border)",
              display:"flex", justifyContent:"space-between", gap:10,
            }}>
              <button onClick={onClose} className="btn-ghost">Annulla</button>
              <button
                onClick={()=>setStep("conferma")}
                disabled={!odlAnteprima.length}
                className="btn-primary">
                Conferma e genera {odlAnteprima.length} OdL →
              </button>
            </div>
          </>
        )}

        {step === "conferma" && (
          <>
            <div style={{padding:"24px"}}>
              <div style={{
                background:"#FEF3C7", border:"1px solid #FDE68A",
                borderRadius:"var(--radius)", padding:"16px 18px", marginBottom:20,
              }}>
                <div style={{fontWeight:700, fontSize:14, color:"#92400E", marginBottom:6}}>
                  ⚠ Conferma generazione
                </div>
                <div style={{fontSize:13, color:"#92400E", lineHeight:1.6}}>
                  Verranno creati <strong>{odlAnteprima.length} Ordini di Lavoro</strong> con{" "}
                  <strong>{totAttivita} attività</strong> nel periodo{" "}
                  {fmtData(da)} → {fmtData(a)}.
                  <br/>Questa operazione non è reversibile automaticamente.
                </div>
              </div>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20}}>
                {[
                  { l:"OdL creati", v:odlAnteprima.length },
                  { l:"Attività generate", v:totAttivita },
                  { l:"Periodo", v:`${fmtData(da)}→${fmtData(a)}` },
                ].map(s=>(
                  <div key={s.l} style={{
                    background:"var(--surface-2)", borderRadius:"var(--radius-sm)",
                    padding:"12px 14px", textAlign:"center",
                  }}>
                    <div style={{fontSize:11, color:"var(--text-3)", marginBottom:4}}>{s.l}</div>
                    <div style={{fontWeight:700, fontSize:16}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              padding:"14px 24px", borderTop:"1px solid var(--border)",
              display:"flex", justifyContent:"space-between", gap:10,
            }}>
              <button onClick={()=>setStep("anteprima")} className="btn-ghost">← Torna indietro</button>
              <button onClick={genera} disabled={confermando} className="btn-primary">
                {confermando ? "⏳ Generazione in corso..." : "⚡ Genera ora"}
              </button>
            </div>
          </>
        )}

        {step === "fatto" && risultato && (
          <div style={{padding:"40px 24px", textAlign:"center"}}>
            <div style={{fontSize:48, marginBottom:16}}>🎉</div>
            <div style={{fontWeight:700, fontSize:17, marginBottom:8}}>Generazione completata!</div>
            <div style={{fontSize:13, color:"var(--text-2)", lineHeight:1.7}}>
              <strong>{risultato.nOdl} Ordini di Lavoro</strong> creati<br/>
              <strong>{risultato.nAtt} attività</strong> generate e collegate<br/>
              Trovi gli OdL nella tab <strong>Manutenzioni</strong>
            </div>
            <button onClick={onClose} className="btn-primary" style={{marginTop:24}}>
              Perfetto ✓
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}
