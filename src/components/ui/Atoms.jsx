import React, { useState, useRef } from "react";

// ─── Atoms ───────────────────────────────────────────────────────────────
export function AvatarComp({ nome, col, size=36 }) {
  const initials = (nome||"?").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
  return <div className="av" style={{width:size,height:size,background:(col||"#888")+"22",color:col||"#888",fontSize:Math.round(size*.34)}}>{initials}</div>;
}
export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export function Toast({ msg, type="error", onDismiss }) {
  const bg = type==="success"?"#ECFDF5":type==="warning"?"#FFFBEB":"#FEF2F2";
  const border = type==="success"?"#A7F3D0":type==="warning"?"#FDE68A":"#FECACA";
  const color = type==="success"?"#065F46":type==="warning"?"#92400E":"#991B1B";
  const icon = type==="success"?"✅":type==="warning"?"⚠":"❌";
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:bg,border:`1px solid ${border}`,borderRadius:"var(--radius-sm)",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,.15)",maxWidth:360}}>
      <span style={{fontSize:16}}>{icon}</span>
      <span style={{flex:1,fontSize:13,fontWeight:500,color}}>{msg}</span>
      <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",color,fontSize:16,padding:"0 4px"}}>✕</button>
    </div>
  );
}

export function ConflictiBanner({ conf }) {
  const [open, setOpen] = React.useState(false);
  if (!conf?.length) return null;
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:20,fontSize:12,fontWeight:700,color:"#92400E",cursor:"pointer",lineHeight:1}}
      >
        ⚠ {conf.length} sovrapposizione{conf.length>1?"i":""}
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:1998}} />
          <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:1999,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",minWidth:260,boxShadow:"0 4px 20px rgba(0,0,0,.18)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400E",marginBottom:8}}>⚠ Attività già pianificate in questa data:</div>
            {conf.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid var(--border-dim)"}}>
                <span style={{fontSize:11,fontWeight:600,flex:1}}>{m.titolo}</span>
                <span style={{fontSize:10,color:"var(--text-3)",whiteSpace:"nowrap"}}>{m.durata} min</span>
              </div>
            ))}
            <div style={{fontSize:10,color:"var(--text-3)",marginTop:6}}>Puoi procedere comunque se necessario.</div>
          </div>
        </>
      )}
    </div>
  );
}

export function Overlay({ children, zIndex=1000 }) {
  return <div className="overlay" style={{zIndex}}>{children}</div>;
}

export function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <Overlay zIndex={2000}>
      <div style={{background:"var(--surface)",borderRadius:"var(--radius-xl)",padding:"28px 32px",width:"min(380px,94vw)",boxShadow:"0 8px 40px rgba(0,0,0,.25)"}}>
        <div style={{fontSize:20,marginBottom:12,textAlign:"center"}}>⚠️</div>
        <div style={{fontWeight:700,fontSize:15,marginBottom:8,textAlign:"center"}}>Conferma eliminazione</div>
        <div style={{fontSize:13,color:"var(--text-2)",marginBottom:20,textAlign:"center",lineHeight:1.5}}>{msg}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={onCancel} style={{padding:"9px 24px",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",background:"var(--surface)",cursor:"pointer",fontSize:13,fontWeight:600}}>Annulla</button>
          <button onClick={onConfirm} style={{padding:"9px 24px",border:"none",borderRadius:"var(--radius-sm)",background:"#EF4444",color:"white",cursor:"pointer",fontSize:13,fontWeight:700}}>Elimina</button>
        </div>
      </div>
    </Overlay>
  );
}

export function Modal({ title, onClose, onSave, saveLabel="Salva", saveColor, saveOk=true, children }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <Overlay>
      <div className="modal-box">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{display:"grid",gap:14}}>{children}</div>
        <div className="modal-footer">
          <button onClick={onClose}>Annulla</button>
          <button disabled={!saveOk} onClick={()=>{onSave();onClose();}}
            style={saveOk&&saveColor?{background:saveColor,color:"white",borderColor:saveColor}:{}}
            className={saveOk&&!saveColor?"btn-primary":""}
          >{saveLabel}</button>
        </div>
      </div>
    </Overlay>
  );
}
export function AvvisoConflitto({ conflitti: conf }) {
  const [open, setOpen] = React.useState(false);
  if (!conf||!conf.length) return null;
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:20,fontSize:12,fontWeight:700,color:"#92400E",cursor:"pointer",lineHeight:1}}
      >
        ⚠ {conf.length} sovrapposizione{conf.length>1?"i":""}
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:1998}} />
          <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:1999,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",minWidth:260,boxShadow:"0 4px 20px rgba(0,0,0,.18)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400E",marginBottom:8}}>⚠ Attività già pianificate in questa data:</div>
            {conf.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid var(--border-dim)"}}>
                <span style={{fontSize:11,fontWeight:600,flex:1}}>{m.titolo}</span>
                <span style={{fontSize:10,color:"var(--text-3)",whiteSpace:"nowrap"}}>{m.durata} min</span>
              </div>
            ))}
            <div style={{fontSize:10,color:"var(--text-3)",marginTop:6}}>Puoi procedere comunque se necessario.</div>
          </div>
        </>
      )}
    </div>
  );
}

