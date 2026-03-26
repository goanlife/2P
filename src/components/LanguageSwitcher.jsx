import React, { useState, useRef, useEffect } from "react";
import { useI18n, LANGS } from "../i18n/index.jsx";

export function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen]   = useState(false);
  const ref               = useRef();
  const current           = LANGS.find(l => l.code === lang) || LANGS[0];

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Change language"
        style={{
          display: "flex", alignItems: "center", gap: compact ? 0 : 6,
          padding: compact ? "6px 8px" : "6px 10px",
          borderRadius: 7, border: "1px solid var(--border)",
          background: "var(--surface)", cursor: "pointer", fontSize: 13,
          color: "var(--text-2)", fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        {!compact && <span style={{ fontSize: 12 }}>{current.code.toUpperCase()}</span>}
        <span style={{ fontSize: 9, opacity: .5 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", right: 0, zIndex: 500,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          minWidth: 150, overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px 6px", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-3)",
            borderBottom: "1px solid var(--border)" }}>
            Language / Lingua
          </div>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                width: "100%", padding: "10px 14px", textAlign: "left",
                border: "none", cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", gap: 10,
                background: lang === l.code ? "var(--surface-2)" : "var(--surface)",
                fontWeight: lang === l.code ? 700 : 400,
                color: lang === l.code ? "var(--navy)" : "var(--text-2)",
                borderBottom: "1px solid var(--border-dim)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
              onMouseLeave={e => e.currentTarget.style.background = lang === l.code ? "var(--surface-2)" : "var(--surface)"}
            >
              <span style={{ fontSize: 20 }}>{l.flag}</span>
              <div>
                <div>{l.label}</div>
                {l.code !== "it" && l.code !== "en" && (
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                    Traduzione parziale
                  </div>
                )}
              </div>
              {lang === l.code && <span style={{ marginLeft: "auto", color: "var(--amber)" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
