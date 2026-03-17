import React, { useState } from "react";

export function MobileNav({ vista, sV, tabs=[] }) {
  const [drawer, setDrawer] = useState(false);
  // Prime 4 tab vanno nel bottom bar, le altre nel drawer
  const primary = tabs.slice(0, 4);
  const drawer_tabs = tabs.slice(4);
  const inDrawer = drawer_tabs.some(t=>t.id===vista);

  return (
    <>
      <nav className="bottom-nav">
        {primary.map(t=>(
          <button key={t.id} className={"bottom-nav-btn"+(vista===t.id?" active":"")}
            onClick={()=>{ sV(t.id); setDrawer(false); }}>
            <span className="bottom-nav-icon">{t.icon}</span>
            <span className="bottom-nav-label">{t.l}</span>
          </button>
        ))}
        {drawer_tabs.length > 0 && (
          <button className={"bottom-nav-btn"+(inDrawer||drawer?" active":"")}
            onClick={()=>setDrawer(d=>!d)}>
            <span className="bottom-nav-icon">{inDrawer?"✓":"≡"}</span>
            <span className="bottom-nav-label">{inDrawer?drawer_tabs.find(t=>t.id===vista)?.l:"Altro"}</span>
          </button>
        )}
      </nav>

      {drawer&&(
        <>
          <div className="mobile-drawer-overlay" onClick={()=>setDrawer(false)} />
          <div className="mobile-drawer">
            <div className="mobile-drawer-handle" />
            {drawer_tabs.map(t=>(
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
