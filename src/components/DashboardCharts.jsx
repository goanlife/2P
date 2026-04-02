/**
 * DashboardCharts — Grafici animati recharts per la dashboard
 * - Trend attività ultimi 30 giorni (Area chart)
 * - Distribuzione stati (Donut chart)
 * - Carico operatori (Bar chart orizzontale)
 */
import React, { useMemo } from "react";
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";

const card = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ── Tooltip custom ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,.97)", border: "1px solid rgba(14,165,233,.2)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 20px rgba(14,165,233,.12)",
    }}>
      {label && <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 4, fontFamily: "Oxanium, sans-serif" }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || p.fill, display: "inline-block" }} />
          <span style={{ color: "#475569" }}>{p.name}: </span>
          <span style={{ fontWeight: 700, color: "#0F172A", fontFamily: "Share Tech Mono, monospace" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Trend ultimi 30 giorni ────────────────────────────────────────────────
export function TrendChart({ man = [] }) {
  const data = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
      days.push({
        date: key, label,
        completate: man.filter(m => m.chiusoAt?.startsWith(key)).length,
        pianificate: man.filter(m => m.data === key && m.stato === "pianificata").length,
      });
    }
    return days;
  }, [man]);

  // Mostra solo ogni 5 giorni sull'asse X
  const tickFormatter = (_, i) => i % 5 === 0 ? data[i]?.label || "" : "";

  return (
    <motion.div variants={card} initial="initial" animate="animate" transition={{ delay: 0.1, duration: 0.5 }}
      style={{ background: "#fff", border: "1px solid rgba(14,165,233,.15)", borderRadius: 14, padding: "20px 16px 10px", boxShadow: "0 2px 12px rgba(14,165,233,.06)" }}>
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Oxanium, sans-serif", fontWeight: 700, fontSize: 13, color: "#0F172A", letterSpacing: ".05em", textTransform: "uppercase" }}>
          Trend attività — 30 giorni
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
            <span style={{ width: 10, height: 3, background: "#0EA5E9", borderRadius: 99, display: "inline-block" }} />Pianificate
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
            <span style={{ width: 10, height: 3, background: "#059669", borderRadius: 99, display: "inline-block" }} />Completate
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 5, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="colorPian" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0EA5E9" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#059669" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Share Tech Mono" }} tickFormatter={tickFormatter} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="pianificate" name="Pianificate" stroke="#0EA5E9" strokeWidth={2} fill="url(#colorPian)" dot={false} activeDot={{ r: 4, fill: "#0EA5E9" }} />
          <Area type="monotone" dataKey="completate"  name="Completate"  stroke="#059669" strokeWidth={2} fill="url(#colorComp)" dot={false} activeDot={{ r: 4, fill: "#059669" }} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ── Donut distribuzione stati ─────────────────────────────────────────────
const STATI_COLORS = {
  pianificata: "#3B82F6", inCorso: "#F59E0B",
  completata:  "#059669", scaduta: "#DC2626",
  richiesta:   "#8B5CF6",
};
const STATI_LABELS = { pianificata:"Pianificate", inCorso:"In corso", completata:"Completate", scaduta:"Scadute", richiesta:"Richieste" };

export function StatoDonut({ man = [] }) {
  const data = useMemo(() => {
    const counts = {};
    man.forEach(m => { counts[m.stato] = (counts[m.stato]||0)+1; });
    return Object.entries(counts)
      .filter(([,v]) => v > 0)
      .map(([stato, value]) => ({ name: STATI_LABELS[stato] || stato, value, color: STATI_COLORS[stato] || "#94A3B8" }))
      .sort((a,b) => b.value - a.value);
  }, [man]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div variants={card} initial="initial" animate="animate" transition={{ delay: 0.2, duration: 0.5 }}
      style={{ background: "#fff", border: "1px solid rgba(14,165,233,.15)", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(14,165,233,.06)", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontFamily: "Oxanium, sans-serif", fontWeight: 700, fontSize: 13, color: "#0F172A", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>
        Distribuzione stati
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={data} cx={55} cy={55} innerRadius={36} outerRadius={52}
                dataKey="value" stroke="none" paddingAngle={2}
                startAngle={90} endAngle={-270}
                animationBegin={300} animationDuration={800}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Centro donut */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: 18, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 9, color: "#94A3B8", letterSpacing: ".08em", fontFamily: "Oxanium, sans-serif" }}>TOTALE</div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
          {data.slice(0, 5).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
              <div style={{ fontSize: 11, fontFamily: "Share Tech Mono, monospace", color: "#0F172A", fontWeight: 700 }}>{d.value}</div>
              {/* Mini barra */}
              <div style={{ width: 32, height: 4, background: "#F1F5F9", borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ height: "100%", width: `${Math.round(d.value/total*100)}%`, background: d.color, borderRadius: 99, transition: "width .6s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Carico operatori ──────────────────────────────────────────────────────
export function CaricoChart({ operatori = [], man = [] }) {
  const data = useMemo(() => {
    return operatori
      .filter(o => o.tipo === "fornitore" || o.tipo === "interno")
      .map(op => ({
        nome: op.nome.split(" ")[0], // Solo il nome
        nomeCompleto: op.nome,
        aperte: man.filter(m => m.operatoreId === op.id && ["pianificata","inCorso"].includes(m.stato)).length,
        completate: man.filter(m => m.operatoreId === op.id && m.stato === "completata").length,
      }))
      .filter(d => d.aperte + d.completate > 0)
      .sort((a,b) => b.aperte - a.aperte)
      .slice(0, 6);
  }, [operatori, man]);

  if (!data.length) return null;

  return (
    <motion.div variants={card} initial="initial" animate="animate" transition={{ delay: 0.3, duration: 0.5 }}
      style={{ background: "#fff", border: "1px solid rgba(14,165,233,.15)", borderRadius: 14, padding: "20px 16px 10px", boxShadow: "0 2px 12px rgba(14,165,233,.06)" }}>
      <div style={{ fontFamily: "Oxanium, sans-serif", fontWeight: 700, fontSize: 13, color: "#0F172A", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 14 }}>
        Carico operatori
      </div>
      <ResponsiveContainer width="100%" height={Math.max(100, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 4 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "#475569", fontFamily: "Exo 2, sans-serif" }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(14,165,233,.04)" }} />
          <Bar dataKey="aperte"     name="In corso"   fill="#0EA5E9" radius={[0,4,4,0]} maxBarSize={16} animationDuration={800} animationBegin={400} />
          <Bar dataKey="completate" name="Completate" fill="#059669" radius={[0,4,4,0]} maxBarSize={16} animationDuration={800} animationBegin={600} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
