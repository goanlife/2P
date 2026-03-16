import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "../supabase";

// ─── Temi ─────────────────────────────────────────────────────────────────
export const TEMI = [
  { id:"navy",   nome:"Navy",   top:"#0D1B2A", bot:"#F59E0B", desc:"Industrial scuro" },
  { id:"slate",  nome:"Slate",  top:"#1E293B", bot:"#6366F1", desc:"Grigio professionale" },
  { id:"forest", nome:"Forest", top:"#052E16", bot:"#22C55E", desc:"Verde bosco" },
  { id:"sunset", nome:"Sunset", top:"#431407", bot:"#F97316", desc:"Caldo arancione" },
  { id:"ocean",  nome:"Ocean",  top:"#0C4A6E", bot:"#0EA5E9", desc:"Azzurro oceano" },
];

export function applyTheme(tema) {
  document.documentElement.setAttribute("data-theme", tema||"navy");
}

// ─── Selettore tema ────────────────────────────────────────────────────────
export function SelettoreTema({ value, onChange }) {
  return (
    <div>
      <div className="theme-grid">
        {TEMI.map(t=>(
          <div key={t.id} onClick={()=>onChange(t.id)}>
            <div className={"theme-swatch"+(value===t.id?" selected":"")}>
              <div className="theme-swatch-top" style={{background:t.top}} />
              <div className="theme-swatch-bot" style={{background:t.bot}} />
            </div>
            <div className="theme-swatch-label">{t.nome}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal Crea Accesso ────────────────────────────────────────────────────
export function ModalCreaAccesso({ operatore, onClose, onSuccess }) {
  const [email,  setEmail]  = useState(operatore.email||"");
  const [pass,   setPass]   = useState("");
  const [pass2,  setPass2]  = useState("");
  const [loading, setLoading] = useState(false);
  const [err,    setErr]    = useState(null);
  const [done,   setDone]   = useState(false);

  const ok = email.trim() && pass.length>=6 && pass===pass2;

  const crea = async () => {
    setLoading(true); setErr(null);
    try {
      // Usa un client separato per non toccare la sessione corrente
      const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
        },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || data.msg || "Errore registrazione");
      }

      const authUserId = data.user?.id || data.id;
      await onSuccess(operatore.id, email.trim(), authUserId);
      setDone(true);
    } catch(e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay>
      <div className="modal-box" style={{width:"min(460px,96vw)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div className="modal-title">🔑 Crea accesso</div>
            <div style={{fontSize:12,color:"var(--text-3)",marginTop:3}}>{operatore.nome}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:16,marginBottom:8}}>Accesso creato!</div>
            <div style={{fontSize:13,color:"var(--text-2)",marginBottom:16}}>
              <strong>{email}</strong> può ora accedere all'app.
            </div>
            <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"12px 16px",fontSize:12,color:"var(--text-2)",textAlign:"left"}}>
              <div style={{fontWeight:600,marginBottom:4}}>⚠ Comunica queste credenziali all'utente:</div>
              <div>Email: <strong>{email}</strong></div>
              <div>Password: <strong>{pass}</strong></div>
              <div style={{marginTop:8,fontSize:11,color:"var(--text-3)"}}>Suggerisci di cambiarla al primo accesso.</div>
            </div>
            <button className="btn-primary" onClick={onClose} style={{marginTop:16,width:"100%"}}>Chiudi</button>
          </div>
        ) : (
          <>
            <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:12,color:"var(--text-2)",marginBottom:16}}>
              ℹ Crea le credenziali per permettere a <strong>{operatore.nome}</strong> di accedere all'app con la propria email e password.
            </div>
            <div style={{display:"grid",gap:14}}>
              <Field label="Email *">
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@azienda.it" style={{width:"100%"}} />
              </Field>
              <Field label="Password temporanea * (min. 6 caratteri)">
                <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" style={{width:"100%"}} />
              </Field>
              <Field label="Conferma password *">
                <input type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••••" style={{width:"100%"}}
                  onKeyDown={e=>e.key==="Enter"&&ok&&!loading&&crea()} />
              </Field>
              {pass&&pass2&&pass!==pass2&&(
                <div style={{fontSize:12,color:"var(--red)",fontWeight:500}}>⚠ Le password non coincidono</div>
              )}
              {err&&<div style={{background:"var(--red-bg)",border:"1px solid var(--red-bd)",borderRadius:"var(--radius-sm)",padding:"10px 12px",fontSize:12,color:"var(--red)",fontWeight:500}}>❌ {err}</div>}
            </div>
            <div className="modal-footer">
              <button onClick={onClose}>Annulla</button>
              <button className="btn-primary" disabled={!ok||loading} onClick={crea}>
                {loading?"Creazione...":"🔑 Crea accesso"}
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}


// ─── Gestore Allegati ─────────────────────────────────────────────────────
export function fmtBytes(b) {
  if (!b) return "—";
  if (b < 1024) return b + " B";
  if (b < 1024*1024) return (b/1024).toFixed(1) + " KB";
  return (b/(1024*1024)).toFixed(1) + " MB";
}
export function iconaFile(mime) {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "📊";
  if (mime.includes("zip") || mime.includes("rar")) return "🗜";
  if (mime.startsWith("video/")) return "🎬";
  return "📄";
}

export function GestoreAllegati({ entitaTipo, entitaId, userId }) {
  const [allegati,   setAllegati]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [uploading,  setUploading] = useState(false);
  const [errore,     setErrore]    = useState(null);
  const [successo,   setSuccesso]  = useState(null);
  const [dragOver,   setDragOver]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const inputId = useMemo(() => `file-${entitaTipo}-${entitaId}`, [entitaTipo, entitaId]);

  const uid = userId || "";

  const carica = async () => {
    if (!entitaId) return;
    setLoading(true); setErrore(null);
    const { data, error } = await supabase
      .from("allegati")
      .select("*")
      .eq("entita_tipo", entitaTipo)
      .eq("entita_id", Number(entitaId))
      .order("created_at", { ascending: false });
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        setErrore("⚠ Tabella 'allegati' non trovata. Esegui lo SQL di setup su Supabase.");
      } else {
        setErrore("Errore caricamento: " + error.message);
      }
    } else {
      setAllegati((data||[]).map(mapAllegato));
    }
    setLoading(false);
  };

  useEffect(() => { carica(); }, [entitaId, entitaTipo]);

  const upload = async (files) => {
    if (!files?.length) return;
    if (!uid) { setErrore("Sessione scaduta — ricarica la pagina."); return; }

    setUploading(true); setErrore(null); setSuccesso(null);
    let ok = 0;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        setErrore(`"${file.name}" supera i 20 MB`);
        continue;
      }
      // Sanitizza nome: rimuovi caratteri problematici
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${uid}/${entitaTipo}/${entitaId}/${Date.now()}_${safeName}`;

      // Upload storage
      const { error: upErr } = await supabase.storage
        .from("allegati")
        .upload(path, file, { upsert: false });

      if (upErr) {
        if (upErr.message?.includes("Bucket") || upErr.message?.includes("bucket") || upErr.message?.includes("not found")) {
          setErrore("⚠ Bucket storage 'allegati' non trovato. Vai su Supabase → Storage → Crea bucket 'allegati'.");
        } else if (upErr.message?.includes("row-level") || upErr.message?.includes("policy")) {
          setErrore("⚠ Policy storage mancante. Esegui l'SQL della policy su Supabase.");
        } else {
          setErrore("Errore upload: " + upErr.message);
        }
        continue;
      }

      // Salva record DB
      const { data: row, error: dbErr } = await supabase
        .from("allegati")
        .insert({
          entita_tipo:  entitaTipo,
          entita_id:    Number(entitaId),
          nome:         file.name,
          storage_path: path,
          mime_type:    file.type || "",
          dimensione:   file.size,
          user_id:      uid,
        })
        .select()
        .single();

      if (dbErr) {
        await supabase.storage.from("allegati").remove([path]);
        setErrore("Errore salvataggio DB: " + dbErr.message);
        continue;
      }

      setAllegati(prev => [mapAllegato(row), ...prev]);
      ok++;
    }
    if (ok > 0) setSuccesso(`${ok} file caricato/i ✅`);
    setUploading(false);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files?.length) {
      upload(files);
      // Reset per permettere ricaricamento stesso file
      e.target.value = "";
    }
  };

  const apri = async (a) => {
    const { data, error } = await supabase.storage
      .from("allegati")
      .createSignedUrl(a.storagePath, 120);
    if (error) { setErrore("Impossibile aprire: " + error.message); return; }
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const elimina = async (id) => {
    const a = allegati.find(x => x.id === id);
    if (!a) return;
    setConfirmDel(null);
    const { error: stErr } = await supabase.storage.from("allegati").remove([a.storagePath]);
    const { error: dbErr } = await supabase.from("allegati").delete().eq("id", id);
    if (dbErr) { setErrore("Errore eliminazione: " + dbErr.message); return; }
    setAllegati(prev => prev.filter(x => x.id !== id));
  };

  if (!entitaId) return (
    <div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"8px 0",fontStyle:"italic"}}>
      Salva prima l'elemento per poter aggiungere allegati.
    </div>
  );

  return (
    <div style={{display:"grid",gap:8}} onClick={e=>e.stopPropagation()}>

      {/* Drop zone — usa <label> per max compatibilità mobile */}
      <div
        onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOver(true);}}
        onDragLeave={e=>{e.stopPropagation();setDragOver(false);}}
        onDrop={e=>{e.preventDefault();e.stopPropagation();setDragOver(false);upload(e.dataTransfer.files);}}
        style={{position:"relative"}}
      >
        {/* Input nascosto collegato alla label */}
        <input
          id={inputId}
          type="file"
          multiple
          accept="*/*"
          style={{
            position:"absolute",
            width:1,height:1,
            opacity:0,
            overflow:"hidden",
            zIndex:-1,
          }}
          onChange={handleInputChange}
          disabled={uploading}
        />
        <label
          htmlFor={inputId}
          style={{
            display:"block",
            border:`2px dashed ${dragOver?"var(--amber)":"var(--border-dim)"}`,
            borderRadius:"var(--radius)",
            padding:"18px 16px",
            textAlign:"center",
            cursor:uploading?"not-allowed":"pointer",
            background:dragOver?"rgba(245,158,11,.06)":"transparent",
            transition:"all .15s",
            userSelect:"none",
          }}
        >
          {uploading ? (
            <div style={{fontSize:13,color:"var(--amber)",fontWeight:600}}>⏳ Caricamento in corso...</div>
          ) : (
            <>
              <div style={{fontSize:22,marginBottom:4}}>📎</div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text-2)"}}>
                Tocca per selezionare un file
              </div>
              <div style={{fontSize:11,color:"var(--text-3)",marginTop:3}}>
                o trascina qui · max 20 MB
              </div>
            </>
          )}
        </label>
      </div>

      {/* Messaggi errore */}
      {errore&&(
        <div style={{fontSize:12,color:"#DC2626",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:6,padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{flexShrink:0}}>❌</span>
          <div style={{flex:1,lineHeight:1.5}}>{errore}</div>
          <button type="button" onClick={()=>setErrore(null)} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:14,color:"#DC2626",lineHeight:1,flexShrink:0}}>✕</button>
        </div>
      )}

      {/* Messaggio successo */}
      {successo&&(
        <div style={{fontSize:12,color:"#065F46",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:6,padding:"8px 12px",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{flex:1}}>{successo}</span>
          <button type="button" onClick={()=>setSuccesso(null)} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:14,color:"#065F46"}}>✕</button>
        </div>
      )}

      {/* Conferma eliminazione inline */}
      {confirmDel&&(
        <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:6,padding:"10px 12px",fontSize:12,color:"#C2410C",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{flex:1}}>Eliminare <strong>{allegati.find(a=>a.id===confirmDel)?.nome}</strong>?</span>
          <button type="button" onClick={()=>elimina(confirmDel)} style={{background:"#DC2626",color:"white",borderColor:"#DC2626",fontSize:11,padding:"4px 10px",borderRadius:4,border:"none",cursor:"pointer"}}>Sì, elimina</button>
          <button type="button" onClick={()=>setConfirmDel(null)} style={{fontSize:11,padding:"4px 10px",borderRadius:4,border:"1px solid var(--border)",cursor:"pointer",background:"white"}}>Annulla</button>
        </div>
      )}

      {/* Lista allegati */}
      {loading&&<div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"8px 0"}}>⏳ Caricamento...</div>}
      {!loading&&allegati.length===0&&!errore&&(
        <div style={{fontSize:12,color:"var(--text-3)",textAlign:"center",padding:"8px 0",fontStyle:"italic"}}>Nessun allegato</div>
      )}
      {allegati.map(a=>(
        <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:6,border:"1px solid var(--border)",background:"var(--surface)"}}>
          <span style={{fontSize:20,flexShrink:0}}>{iconaFile(a.mimeType)}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nome}</div>
            <div style={{fontSize:11,color:"var(--text-3)",marginTop:1}}>{fmtBytes(a.dimensione)} · {fmtData(a.createdAt)}</div>
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            <button type="button" onClick={e=>{e.stopPropagation();apri(a);}} style={{fontSize:11,padding:"4px 8px",background:"#EFF6FF",color:"#1D4ED8",borderColor:"#BFDBFE",borderRadius:4,border:"1px solid",cursor:"pointer"}}>⬇ Apri</button>
            <button type="button" onClick={e=>{e.stopPropagation();setConfirmDel(a.id);}} style={{fontSize:11,padding:"4px 8px",background:"#FEF2F2",color:"#DC2626",borderColor:"#FECACA",borderRadius:4,border:"1px solid",cursor:"pointer"}}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pannello allegati collassabile ──────────────────────────────────────
export function PannelloAllegati({ entitaTipo, entitaId, userId }) {
  const [aperto, setAperto] = useState(false);
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!entitaId || !aperto) return;
  }, [entitaId, aperto]);

  return (
    <div style={{borderTop:"1px solid var(--border)",marginTop:14,paddingTop:12}}>
      <button
        type="button"
        onClick={e=>{e.stopPropagation();setAperto(v=>!v);}}
        style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",padding:"4px 0",cursor:"pointer",color:"var(--text-2)",fontWeight:600,fontSize:13,width:"100%",textAlign:"left"}}
      >
        <span style={{fontSize:16}}>📎</span>
        <span>Allegati</span>
        {!aperto&&<span style={{fontSize:11,color:"var(--text-3)",fontWeight:400,marginLeft:4}}>— clicca per aprire</span>}
        <span style={{marginLeft:"auto",fontSize:12,color:"var(--text-3)"}}>{aperto?"▲":"▼"}</span>
      </button>
      {aperto&&(
        <div style={{marginTop:10}} onClick={e=>e.stopPropagation()}>
          <GestoreAllegati entitaTipo={entitaTipo} entitaId={entitaId} userId={userId} />
        </div>
      )}
    </div>
  );
}

