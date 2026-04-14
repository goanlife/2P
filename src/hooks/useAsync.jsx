/**
 * useAsync — gestione loading/error/data per chiamate async
 * Uso: const { loading, error, run } = useAsync()
 *      await run(() => supabase.from(...))
 */
import { useState, useCallback, useRef } from "react";

export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  const run = useCallback(async (asyncFn, opts = {}) => {
    const { onSuccess, onError, successMsg } = opts;
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (!mountedRef.current) return result;
      if (onSuccess) onSuccess(result);
      return result;
    } catch (e) {
      if (!mountedRef.current) return;
      const msg = e?.message || "Errore imprevisto";
      setError(msg);
      if (onError) onError(msg);
      throw e;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, run, clearError };
}

/**
 * Spinner inline leggero
 */
export function Spinner({ size = 16, color = "var(--amber)", style = {} }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}22`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
      ...style
    }} />
  );
}

/**
 * LoadingOverlay — sovrappone un velo di loading su qualsiasi elemento
 */
export function LoadingOverlay({ show, children, message = "Caricamento..." }) {
  return (
    <div style={{ position: "relative" }}>
      {children}
      {show && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "var(--surface, #fff)cc", zIndex: 10,
          borderRadius: "inherit", gap: 10,
          fontFamily: "var(--font-mono)", fontSize: 12,
          color: "var(--text-3)",
        }}>
          <Spinner /> {message}
        </div>
      )}
    </div>
  );
}
