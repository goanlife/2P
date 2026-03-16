import React, { useState } from "react";

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────
const PRIMARY_TABS = [
  {id:"dashboard",    l:"Dashboard",  icon:"◈"},
  {id:"manutenzioni", l:"Attività",   icon:"⚡"},
  {id:"calendario",   l:"Calendario", icon:"📅"},
  {id:"clienti",      l:"Clienti",    icon:"🏢"},
];
const DRAWER_TABS = [
  {id:"piani",       l:"Piani",       icon:"🔄"},
  {id:"assets",      l:"Asset",       icon:"⚙"},
  {id:"utenti",      l:"Utenti",      icon:"👥"},
  {id:"gruppi",      l:"Gruppi",      icon:"🗂"},
  {id:"statistiche", l:"Statistiche", icon:"📊"},
  {id:"kanban",      l:"Kanban",      icon:"🗂"},
  {id:"azienda",     l:"Azienda",     icon:"🏛"},
];

export function MobileNav({ vista, sV }) {
  const [drawer, setDrawer] = useState(false);
  const inDrawer = DRAWER_TABS.some(t=>t.id===vista);

  return (
    <>
      <nav className="bottom-nav">
        {PRIMARY_TABS.map(t=>(
          <button key={t.id} className={"bottom-nav-btn"+(vista===t.id?" active":"")}
            onClick={()=>{ sV(t.id); setDrawer(false); }}>
            <span className="bottom-nav-icon">{t.icon}</span>
            <span className="bottom-nav-label">{t.l}</span>
          </button>
        ))}
        <button className={"bottom-nav-btn"+(inDrawer||drawer?" active":"")}
          onClick={()=>setDrawer(d=>!d)}>
          <span className="bottom-nav-icon">{inDrawer?"✓":"≡"}</span>
          <span className="bottom-nav-label">{inDrawer?DRAWER_TABS.find(t=>t.id===vista)?.l:"Altro"}</span>
        </button>
      </nav>

      {drawer&&(
        <>
          <div className="mobile-drawer-overlay" onClick={()=>setDrawer(false)} />
          <div className="mobile-drawer">
            <div className="mobile-drawer-handle" />
            {DRAWER_TABS.map(t=>(
              <button key={t.id} className={"mobile-drawer-item"+(vista===t.id?" active":"")}
                onClick={()=>{ sV(t.id); setDrawer(false); }}>
                <span className="mobile-drawer-icon">{t.icon}</span>
                {t.l}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

