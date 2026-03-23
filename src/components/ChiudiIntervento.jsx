import { useState, useRef, useEffect } from "react";
import { ChecklistIntervento } from "./PianoChecklist";
import { InterventoRicambi } from "./GestioneRicambi";
import { CommentiAttivita } from "./CommentiAttivita";
const fmtData = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";

export function ChiudiIntervento({manutenzione, cliente, asset, onClose, onSalva, meOperatore=null}) {
  const [note,    setNote]    = useState(manutenzione.noteChiusura || "");
  const [ore,     setOre]     = useState(manutenzione.oreEffettive || Math.round((manutenzione.durata || 60) / 60 * 10) / 10);
  const [parti,   setParti]   = useState(manutenzione.partiUsate || "");
  const [loading, setLoading] = useState(false);
  const [hasFirma, setHasFirma] = useState(false);
  const [tab,     setTab]     = useState("dati"); // dati | firma | checklist
  const [checklistProgress, setChecklistProgress] = useState(null);

  const canvasRef = useRef();
  const isDrawing = useRef(false);
  const lastPos   = useRef(null);

  // Init canvas
  useEffect(() => {
    if (tab !== "firma" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0D1B2A";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [tab]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPos.current = pos;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasFirma(true);
  };

  const stopDraw = (e) => {
    e?.preventDefault();
    isDrawing.current = false;
  };

  const clearFirma = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasFirma(false);
  };

  const salva = async () => {
    setLoading(true);
    try {
        let firmaSvg = manutenzione.firmaSvg || "";
    if (hasFirma && canvasRef.current) {
      firmaSvg = canvasRef.current.toDataURL("image/png");
    }
    await onSalva({
      id:            manutenzione.id,
      stato:         "completata",
      note_chiusura: note,
      ore_effettive: parseFloat(ore) || null,
      parti_usate:   parti,
      firma_svg:     firmaSvg,
      chiuso_at:     new Date().toISOString(),
    });
        } finally {
    setLoading(false);
    }
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(13,27,42,.7)",
      backdropFilter: "blur(4px)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-xl)",
        width: "min(600px, 100%)", maxHeight: "94vh", overflowY: "auto",
        border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #052E16, #065F46)",
          padding: "20px 24px", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          color: "white",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 18 }}>
                ✓ Chiudi intervento
              </div>
              <div style={{ fontSize: 13, opacity: .8, marginTop: 3 }}>
                <span style={{opacity:.7,marginRight:5}}>#{manutenzione.pianoId ? manutenzione.numeroIntervento||1 : manutenzione.id}</span>
                {manutenzione.titolo}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8,
              width: 32, height: 32, color: "white", cursor: "pointer", fontSize: 16,
            }}>✕</button>
          </div>
          {/* Info rapida */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, opacity: .9, flexWrap: "wrap" }}>
            <span>📅 {fmtData(manutenzione.data)}</span>
            {cliente && <span>🏢 {cliente.rs}</span>}
            {asset   && <span>⚙ {asset.nome}</span>}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          {[{ id: "dati", l: "📝 Dati intervento" }, ...(manutenzione.pianoId ? [{ id: "checklist", l: "✅ Checklist" }] : []), { id: "ricambi", l: "🔩 Ricambi" }, { id: "commenti", l: "💬 Note" }, { id: "firma", l: "✍ Firma" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "12px 16px", border: "none",
              borderBottom: tab === t.id ? "2px solid #059669" : "2px solid transparent",
              background: "transparent", fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? "#059669" : "var(--text-2)",
              cursor: "pointer", fontSize: 13, transition: "all .15s",
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ padding: "20px 24px" }}>
          {tab === "dati" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 5 }}>
                    Ore effettive *
                  </label>
                  <input type="number" value={ore} onChange={e => setOre(e.target.value)} style={{borderColor: !ore || Number(ore)<=0 ? "#EF4444" : ""}}
                    step=".5" min="0" style={{borderColor: !ore ? "#F59E0B" : undefined,
                      width: "100%", boxSizing: "border-box", padding: "10px 12px",
                      border: "1px solid var(--border-dim)", borderRadius: "var(--radius-sm)",
                      fontSize: 14, fontFamily: "var(--font-head)", fontWeight: 700,
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 5 }}>
                    Durata pianificata
                  </label>
                  {!ore && <div style={{fontSize:11,color:"#B45309",marginTop:3,fontWeight:600}}>⚠ Inserisci le ore per statistiche accurate</div>}
                  <div style={{ padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", fontSize: 14, color: "var(--text-3)", border: "1px solid var(--border)" }}>
                    {Math.round((manutenzione.durata || 60) / 60 * 10) / 10} ore
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 5 }}>
                  Note tecniche dell'intervento
                </label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  rows={4} placeholder="Descrivere il lavoro svolto, eventuali anomalie riscontrate, raccomandazioni..."
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "10px 12px",
                    border: "1px solid var(--border-dim)", borderRadius: "var(--radius-sm)",
                    fontSize: 13, resize: "vertical", fontFamily: "var(--font-body)",
                  }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 5 }}>
                  Materiali e parti utilizzate
                </label>
                <textarea value={parti} onChange={e => setParti(e.target.value)}
                  rows={2} placeholder="Es: Filtro aria (cod. FA-001), Cinghia distribuzione, Olio motore 5L..."
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "10px 12px",
                    border: "1px solid var(--border-dim)", borderRadius: "var(--radius-sm)",
                    fontSize: 13, resize: "vertical", fontFamily: "var(--font-body)",
                  }} />
              </div>

              <div style={{
                background: "#ECFDF5", border: "1px solid #A7F3D0",
                borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12, color: "#065F46",
              }}>
                ℹ Usa il tab <strong>🔩 Ricambi</strong> per registrare i materiali usati e calcolare il costo totale dell'intervento. La firma nel tab <strong>✍ Firma</strong> per il verbale PDF.
              </div>
            </div>
          )}

          {tab === "checklist" && (
            <div style={{ padding: "4px 0" }}>
              <ChecklistIntervento
                manutenzione={{...manutenzione, numero_intervento: manutenzione.numeroIntervento||1}}
                stato={manutenzione.stato}
                onProgressChange={setChecklistProgress}
              />
            </div>
          )}

          {tab === "ricambi" && (
            <div style={{ padding: "4px 0" }}>
              <InterventoRicambi manutenzioneId={manutenzione.id} readOnly={false} />
            </div>
          )}

          {tab === "commenti" && (
            <div style={{ padding: "4px 0" }}>
              <CommentiAttivita
                manutenzioneId={manutenzione.id}
                meOperatore={meOperatore}
                onStatoChange={null}
              />
            </div>
          )}

          {tab === "firma" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
                Firma del tecnico — disegna con il dito o il mouse:
              </div>
              <div style={{ position: "relative", border: "2px solid var(--border-dim)", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "white" }}>
                <canvas
                  ref={canvasRef}
                  width={540}
                  height={180}
                  style={{ display: "block", width: "100%", touchAction: "none", cursor: "crosshair" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                {!hasFirma && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", pointerEvents: "none",
                    color: "#CBD5E1", fontSize: 14, fontStyle: "italic",
                  }}>
                    Firma qui...
                  </div>
                )}
              </div>
              {hasFirma && (
                <button onClick={clearFirma} style={{
                  fontSize: 12, padding: "6px 14px", color: "var(--red)",
                  borderColor: "#FECACA", background: "#FEF2F2", cursor: "pointer",
                  borderRadius: "var(--radius-sm)", border: "1px solid",
                }}>
                  🗑 Cancella firma
                </button>
              )}
              {manutenzione.firmaSvg && !hasFirma && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>Firma salvata precedentemente:</div>
                  <img src={manutenzione.firmaSvg} alt="firma" style={{ maxWidth: "100%", border: "1px solid var(--border)", borderRadius: 6 }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 10, padding: "16px 24px",
          borderTop: "1px solid var(--border)", justifyContent: "flex-end",
          background: "var(--surface-2)", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
        }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 13 }}>
            Annulla
          </button>
          <button onClick={salva} disabled={loading || !ore || Number(ore)<=0 || (checklistProgress && !checklistProgress.obbligatoriOk)} style={{
            padding: "10px 24px", borderRadius: "var(--radius-sm)",
            background: loading ? "#9CA3AF" : "#059669", color: "white",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 700,
          }}>
            {loading ? "Salvataggio..." : "✓ Chiudi intervento"}
          </button>
        </div>
      </div>
    </div>
  );
}
