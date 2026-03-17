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
  if (!conf?.length) return null;
  return (
    <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:13,color:"#92400E"}}>
      <strong>⚠ Attenzione:</strong> {conf.length} attività già pianificata/e in questa data:
      <ul style={{margin:"6px 0 0",paddingLeft:18}}>{conf.map(m=><li key={m.id}>{m.titolo} ({m.durata} min)</li>)}</ul>
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
  if (!conf||!conf.length) return null;
  return (
    <div className="conflict-banner">
      <strong>⚠ Conflitto:</strong> {conf.length} attività già pianificata/e in questa data:
      <ul style={{margin:"6px 0 0",paddingLeft:18}}>{conf.map(m=><li key={m.id}>{m.titolo} ({m.durata} min)</li>)}</ul>
    </div>
  );
}

