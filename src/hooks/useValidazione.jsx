/**
 * useValidazione — validazione form riutilizzabile
 * Uso: const { errori, valida, reset } = useValidazione(regole)
 */
import { useState, useCallback } from "react";

/**
 * @param {Object} regole - { nomeCampo: [{ test: fn, msg: string }] }
 */
export function useValidazione(regole = {}) {
  const [errori, setErrori] = useState({});

  const valida = useCallback((dati) => {
    const nuoviErrori = {};
    for (const [campo, rules] of Object.entries(regole)) {
      for (const { test, msg } of rules) {
        if (!test(dati[campo], dati)) {
          nuoviErrori[campo] = msg;
          break;
        }
      }
    }
    setErrori(nuoviErrori);
    return Object.keys(nuoviErrori).length === 0;
  }, [regole]);

  const validaCampo = useCallback((campo, valore, tuttiDati = {}) => {
    if (!regole[campo]) return;
    for (const { test, msg } of regole[campo]) {
      if (!test(valore, tuttiDati)) {
        setErrori(prev => ({ ...prev, [campo]: msg }));
        return;
      }
    }
    setErrori(prev => { const n = { ...prev }; delete n[campo]; return n; });
  }, [regole]);

  const reset = useCallback(() => setErrori({}), []);

  return { errori, valida, validaCampo, reset };
}

// ── Regole comuni riutilizzabili ──────────────────────────────────
export const REGOLE = {
  required: (msg = "Campo obbligatorio") => ({
    test: v => v !== null && v !== undefined && String(v).trim() !== "",
    msg,
  }),
  minLen: (n, msg) => ({
    test: v => !v || String(v).trim().length >= n,
    msg: msg || `Minimo ${n} caratteri`,
  }),
  maxLen: (n, msg) => ({
    test: v => !v || String(v).trim().length <= n,
    msg: msg || `Massimo ${n} caratteri`,
  }),
  email: (msg = "Email non valida") => ({
    test: v => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    msg,
  }),
  piva: (msg = "P.IVA non valida (11 cifre)") => ({
    test: v => !v || /^\d{11}$/.test(v.replace(/\s/g, "")),
    msg,
  }),
  positivo: (msg = "Deve essere un numero positivo") => ({
    test: v => !v || (Number(v) > 0 && !isNaN(Number(v))),
    msg,
  }),
  dateValid: (msg = "Data non valida") => ({
    test: v => !v || !isNaN(new Date(v).getTime()),
    msg,
  }),
  dateMin: (minDate, msg) => ({
    test: v => !v || new Date(v) >= new Date(minDate),
    msg: msg || `Data non può essere prima del ${minDate}`,
  }),
};

// ── Componente ErrorField per mostrare errori sotto i campi ───────
export function ErrorField({ errori, campo, style = {} }) {
  const err = errori?.[campo];
  if (!err) return null;
  return (
    <div style={{
      fontSize: 11, color: "var(--red, #EF4444)", marginTop: 4,
      fontFamily: "var(--font-mono)", letterSpacing: ".02em", ...style
    }}>
      ⚠ {err}
    </div>
  );
}
