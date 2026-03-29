import React, { useState, useEffect } from "react";
import { useI18n } from "../i18n/index.jsx";
import { supabase } from "../supabase";

// Definizione completa di tutti i tab con etichette e descrizioni
export const ALL_TABS = [
  { id: "dashboard",    l: "Dashboard",    icon: "◈", desc: "KPI e panoramica generale" },
  { id: "manutenzioni", l: "Manutenzioni", icon: "⚡", desc: "Lista e gestione attività" },
  { id: "calendario",   l: "Calendario",   icon: "📅", desc: "Vista calendario mensile" },
  { id: "kanban",       l: "Kanban",       icon: "🗂", desc: "Vista Kanban per stato" },
  { id: "piani",        l: "Piani",        icon: "🔄", desc: "Piani di manutenzione ricorrenti" },
  { id: "assets",       l: "Asset",        icon: "⚙", desc: "Macchine e impianti" },
  { id: "clienti",      l: "Clienti",      icon: "🏢", desc: "Anagrafica clienti" },
  { id: "utenti",       l: "Utenti",       icon: "👥", desc: "Operatori e fornitori" },
  { id: "gruppi",       l: "Gruppi",       icon: "🗂", desc: "Gruppi e permessi" },
  { id: "statistiche",  l: "Statistiche",  icon: "📊", desc: "Report e analisi" },
  { id: "azienda",      l: "Azienda",      icon: "🏛", desc: "Impostazioni azienda" },
  { id: "ordini",       l: "Ordini",       icon: "📦", desc: "Ordini di acquisto ricambi" },
  { id: "odl",          l: "Ord. Lavoro",  icon: "📋", desc: "Ordini di lavoro generati dai piani" },
  { id: "scadenzario",  l: "Scadenzario",  icon: "📅", desc: "Adempimenti normativi obbligatori" },
  { id: "ticket",       l: "Ticket",        icon: "🎫", desc: "Interventi straordinari e richieste" },
  { id: "richieste",    l: "Richieste",    icon: "📋", desc: "Richiedi un intervento (portale cliente)" },
  { id: "template",     l: "Template",     icon: "🔧", desc: "Template attività per tipo asset" },
  { id: "report",       l: "Report",        icon: "📄", desc: "Reportistica per clienti, costi e amministrazione" },
];

// Tab sempre visibili per admin (non modificabili)
const ADMIN_ONLY = ["azienda", "gruppi", "utenti"];

export function ConfigurazioneMenu({ gruppi=[], tenantId }) {
  const { t } = useI18n();
  const [configs, setConfigs]     = useState({}); // gruppoId → Set<tabId> visibili
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [selGruppo, setSelGruppo] = useState(gruppi[0]?.id || null);

  useEffect(() => { carica(); }, [tenantId]);

  const carica = async () => {
    try {
    setLoading(true);
    const { data } = await supabase
      .from("menu_config")
      .select("*")
      .eq("tenant_id", tenantId);
    
    // Costruisci mappa gruppoId → Set<tabId>
    const map = {};
    (data || []).forEach(r => {
      if (!map[r.gruppo_id]) map[r.gruppo_id] = new Set();
      if (r.visibile) map[r.gruppo_id].add(r.tab_id);
    });
    setConfigs(map);
    setLoading(false);
      } catch(e) { console.error("DB error:", e.message); }
  };

  const toggleTab = (gruppoId, tabId) => {
    setConfigs(prev => {
      const next = { ...prev };
      if (!next[gruppoId]) next[gruppoId] = new Set(ALL_TABS.map(t => t.id)); // default: tutti visibili
      const s = new Set(next[gruppoId]);
      if (s.has(tabId)) s.delete(tabId); else s.add(tabId);
      next[gruppoId] = s;
      return next;
    });
    setSaved(false);
  };

  const salva = async () => {
    try {
    setSaving(true);
    // Cancella e riscrive per il gruppo selezionato
    await supabase.from("menu_config")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("gruppo_id", selGruppo);

    const rows = ALL_TABS.map(t => ({
      tenant_id: tenantId,
      gruppo_id: selGruppo,
      tab_id:    t.id,
      visibile:  (configs[selGruppo] ?? new Set(ALL_TABS.map(t => t.id))).has(t.id),
    }));
    const { error } = await supabase.from("menu_config").insert(rows);

    setSaving(false);
    if (error) {
      console.warn("Errore salvataggio: " + error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
      } catch(e) { console.error("DB error:", e.message); }
  };

  const attivaTabGruppo = (gruppoId) => configs[gruppoId] ?? new Set(ALL_TABS.map(t => t.id));

  const g = gruppi.find(g => g.id === selGruppo);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🎛 Configurazione menu per gruppo</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
        Scegli un gruppo e configura quali sezioni sono visibili ai suoi membri.
        Gli admin vedono sempre tutto.
      </div>

      {/* Selettore gruppo */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {gruppi.map(g => {
          const vis = attivaTabGruppo(g.id);
          const n = ALL_TABS.filter(t => vis.has(t.id)).length;
          return (
            <button key={g.id} onClick={() => setSelGruppo(g.id)}
              style={{
                padding: "8px 16px", borderRadius: 20, border: "2px solid",
                borderColor: selGruppo === g.id ? (g.col || "var(--amber)") : "var(--border)",
                background: selGruppo === g.id ? (g.col || "var(--amber)") + "22" : "var(--surface)",
                color: selGruppo === g.id ? "var(--text-1)" : "var(--text-2)",
                fontWeight: selGruppo === g.id ? 700 : 400,
                cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", gap: 6,
              }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: g.col || "#888", flexShrink: 0 }} />
              {g.nome}
              <span style={{ fontSize: 10, color: "var(--text-3)" }}>{n}/{ALL_TABS.length}</span>
            </button>
          );
        })}
      </div>

      {!selGruppo && (
        <div style={{ color: "var(--text-3)", fontSize: 13, padding: "20px 0" }}>Nessun gruppo disponibile. Crea prima un gruppo.</div>
      )}

      {selGruppo && !loading && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Sezioni visibili per: {g?.nome}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {ALL_TABS.map(tab => {
              const vis = attivaTabGruppo(selGruppo).has(tab.id);
              const isAdminOnly = ADMIN_ONLY.includes(tab.id);
              return (
                <div key={tab.id}
                  onClick={() => !isAdminOnly && toggleTab(selGruppo, tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 8,
                    border: `1px solid ${vis ? "var(--border)" : "var(--border-dim)"}`,
                    background: vis ? "var(--surface)" : "var(--surface-2)",
                    cursor: isAdminOnly ? "default" : "pointer",
                    opacity: isAdminOnly ? 0.5 : 1,
                    transition: "all .15s",
                  }}>
                  {/* Toggle */}
                  <div style={{
                    width: 38, height: 20, borderRadius: 99, flexShrink: 0,
                    background: (vis && !isAdminOnly) ? "#059669" : isAdminOnly ? "#059669" : "var(--border)",
                    position: "relative", transition: "background .2s",
                  }}>
                    <div style={{
                      position: "absolute", top: 2, left: (vis || isAdminOnly) ? 20 : 2,
                      width: 16, height: 16, borderRadius: "50%", background: "white",
                      transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                    }} />
                  </div>

                  {/* Icona + nome */}
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: vis ? "var(--text-1)" : "var(--text-3)" }}>
                      {tab.l}
                      {isAdminOnly && <span style={{ fontSize: 10, color: "#B45309", marginLeft: 6, fontWeight: 400 }}>solo admin</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{tab.desc}</div>
                  </div>

                  {/* Stato */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: (vis || isAdminOnly) ? "#ECFDF5" : "#F3F4F6",
                    color: (vis || isAdminOnly) ? "#065F46" : "var(--text-3)",
                  }}>
                    {(vis || isAdminOnly) ? "Visibile" : "Nascosta"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pulsanti azione */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
            <button onClick={salva} disabled={saving}
              style={{ padding: "9px 24px", background: "var(--amber)", color: "#0D1B2A", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {saving ? "Salvataggio..." : "💾 Salva configurazione"}
            </button>
            <button onClick={() => {
              setConfigs(prev => ({ ...prev, [selGruppo]: new Set(ALL_TABS.map(t => t.id)) }));
              setSaved(false);
            }} style={{ padding: "9px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
              Abilita tutto
            </button>
            <button onClick={() => {
              const onlyAdmin = new Set(ADMIN_ONLY);
              setConfigs(prev => ({ ...prev, [selGruppo]: onlyAdmin }));
              setSaved(false);
            }} style={{ padding: "9px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
              Solo admin
            </button>
            {saved && <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>✓ Salvato!</span>}
          </div>
        </>
      )}
    </div>
  );
}
