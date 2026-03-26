import React, { createContext, useContext, useState, useCallback } from "react";
import it from "./it.js";
import en from "./en.js";
import es from "./es.js";

// ─── Lingue disponibili ───────────────────────────────────────────────────
const LOCALES = { it, en, es };

export const LANGS = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
];

// ─── Lettura lingua salvata ────────────────────────────────────────────────
function getInitialLang() {
  try {
    const saved = localStorage.getItem("manuMan_lang");
    if (saved && LOCALES[saved]) return saved;
    // Rileva lingua browser
    const browser = navigator.language?.slice(0,2);
    if (browser && LOCALES[browser]) return browser;
  } catch {}
  return "it";
}

// ─── Context ──────────────────────────────────────────────────────────────
const I18nContext = createContext({ t: k => k, lang: "it", setLang: ()=>{} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback(code => {
    if (!LOCALES[code]) return;
    setLangState(code);
    try { localStorage.setItem("manuMan_lang", code); } catch {}
  }, []);

  // Funzione di traduzione con fallback IT → chiave
  const t = useCallback((path, vars={}) => {
    const locale  = LOCALES[lang]  || LOCALES.it;
    const fallback = LOCALES.it;

    // Naviga nel nested object: "nav.dashboard" → locale.nav.dashboard
    const get = (obj, keys) =>
      keys.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);

    const parts = path.split(".");
    let str = get(locale, parts) ?? get(fallback, parts) ?? path;

    // Interpolazione: t("messages.hello", { name: "Mario" }) con "Ciao {{name}}"
    if (typeof str === "string") {
      str = str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
    }
    return str;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook principale ──────────────────────────────────────────────────────
export function useI18n() {
  return useContext(I18nContext);
}

// Alias breve
export const useT = () => useContext(I18nContext).t;
