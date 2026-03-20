import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

const SLA_DEFAULT = {
  bassa:    { ore_risposta: 72,  ore_risoluzione: 168 },
  media:    { ore_risposta: 24,  ore_risoluzione: 72  },
  alta:     { ore_risposta: 8,   ore_risoluzione: 24  },
  urgente:  { ore_risposta: 2,   ore_risoluzione: 8   },
};

function oreRimaste(dataStr, oreMax) {
  if (!dataStr) return null;
  const creata = new Date(dataStr);
  const scadenza = new Date(creata.getTime() + oreMax * 3600000);
  const diff = scadenza - new Date();
  return Math.round(diff / 3600000); // ore rimanenti (negativo = scaduto)
}

function fmtOre(ore) {
  if (ore < 0) return `${Math.abs(ore)}h in ritardo`;
  if (ore < 1) return "< 1h";
  if (ore < 24) return `${ore}h`;
  return `${Math.round(ore/24)}gg`;
}

// ── Badge SLA inline nella card attività ──────────────────────────────────
export function SLABadge({ manutenzione, slaConfig=[] }) {
  const cfg = slaConfig.find(s => s.priorita === manutenzione.priorita) || SLA_DEFAULT[manutenzione.priorita] || SLA_DEFAULT.media;
  if (manutenzione.stato === "completata") return null;

  const oreRis = oreRimaste(manutenzione.data + "T08:00:00", cfg.ore_risoluzione);
  if (oreRis === null) return null;

  const scaduto = oreRis < 0;
  const urgente = oreRis >= 0 && oreRis < (cfg.ore_risoluzione * 0.2); // ultimo 20%

  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      background: scaduto ? "#FEF2F2" : urgente ? "#FEF3C7" : "#F0FDF4",
      color: scaduto ? "#DC2626" : urgente ? "#92400E" : "#166534",
      border: `1px solid ${scaduto ? "#FECACA" : urgente ? "#FDE68A" : "#BBF7D0"}`,
      display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap",
    }}>
      {scaduto ? "🔴" : urgente ? "🟡" : "🟢"} SLA: {fmtOre(oreRis)}
    </span>
  );
}

// ── Configurazione SLA per tenant (in Azienda) ────────────────────────────
export function ConfigSLA({ tenantId }) {
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const PRIORITA = ['urgente','alta','media','bassa'];
  const PRI_COLORS = { urgente:"#EF4444", alta:"#3B82F6", media:"#F59E0B", bassa:"#94A3B8" };

  useEffect(() => { carica(); }, [tenantId]);

  const carica = async () => {
    if (!tenantId) {
      // Mostra default anche senza tenantId
      setConfig(PRIORITA.map(p => ({ priorita: p, ore_risposta: SLA_DEFAULT[p].ore_risposta, ore_risoluzione: SLA_DEFAULT[p].ore_risoluzione })));
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("sla_config").select("*").eq("tenant_id", tenantId).order("priorita");
    if (data && data.length) {
      setConfig(data);
    } else {
      // Nessun record → mostra default
      setConfig(PRIORITA.map(p => ({ priorita: p, ore_risposta: SLA_DEFAULT[p].ore_risposta, ore_risoluzione: SLA_DEFAULT[p].ore_risoluzione })));
    }
    setLoading(false);
  };

  const aggiorna = (priorita, field, val) => {
    setConfig(prev => prev.map(c => c.priorita === priorita ? { ...c, [field]: Number(val) } : c));
    setSaved(false);
  };

  const salva = async () => {
    if (!tenantId) return;
    setSaving(true);
    for (const c of config) {
      await supabase.from("sla_config").upsert({ tenant_id: tenantId, priorita: c.priorita, ore_risposta: c.ore_risposta, ore_risoluzione: c.ore_risoluzione }, { onConflict: "tenant_id,priorita" });
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const st = {
    inp: { padding: "6px 8px", border: "1px solid var(--border-dim)", borderRadius: 5, fontSize: 12, width: 70, textAlign: "center", background: "var(--surface)", color: "var(--text-1)" },
  };

  if (loading) return <div style={{ fontSize: 13, color: "var(--text-3)" }}>Caricamento SLA...</div>;

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>⏱ Configurazione SLA</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>Definisci i tempi massimi di risposta e risoluzione per priorità.</div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 0 }}>
          {["Priorità","Risposta (ore)","Risoluzione (ore)"].map(h => (
            <div key={h} style={{ padding: "8px 14px", background: "var(--surface-2)", fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", borderBottom: "2px solid var(--border)" }}>{h}</div>
          ))}
          {PRIORITA.map(p => {
            const c = config.find(x => x.priorita === p) || SLA_DEFAULT[p];
            return (
              <React.Fragment key={p}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: PRI_COLORS[p], display: "inline-block" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{p}</span>
                </div>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
                  <input type="number" min={1} value={c.ore_risposta} onChange={e => aggiorna(p,"ore_risposta",e.target.value)} style={st.inp} />
                  <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>ore</span>
                </div>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
                  <input type="number" min={1} value={c.ore_risoluzione} onChange={e => aggiorna(p,"ore_risoluzione",e.target.value)} style={st.inp} />
                  <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>ore</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
        <button onClick={salva} disabled={saving} style={{ padding: "8px 20px", background: "var(--amber)", color: "#0D1B2A", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {saving ? "Salvataggio..." : "💾 Salva SLA"}
        </button>
        {saved && <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>✓ Salvato!</span>}
      </div>
    </div>
  );
}
