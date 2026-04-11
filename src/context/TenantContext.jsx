/**
 * TenantContext — sessione, tenant, ruolo utente
 * Gestisce auth Supabase e risoluzione tenant
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { applyTheme } from "../theme-utils.js";

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [session,     setSession]     = useState(null);
  const [tenant,      setTenant]      = useState(null);
  const [ruoloTenant, setRuoloTenant] = useState("membro");
  const [loading,     setLoading]     = useState(true);
  const [dbErr,       setDbErr]       = useState(null);
  const [temaCorrente, setTemaCorrente] = useState("navy");

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) { setLoading(true); setSession(s); }
      else { setSession(null); setTenant(null); setRuoloTenant("membro"); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Risolvi tenant da sessione ─────────────────────────────────────────
  useEffect(() => {
    if (!session) { setLoading(false); return; }
    if (tenant) return; // già caricato
    setLoading(true);
    supabase.from("tenant_users")
      .select("tenant_id, ruolo, tenants(id, nome, logo_url, piva, indirizzo, citta, cap, tel, email, sito)")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error("Errore tenant:", error); setLoading(false); return; }
        if (data?.tenants) {
          setTenant(data.tenants);
          setRuoloTenant(data.ruolo || "membro");
        } else {
          setLoading(false); // nessun tenant → onboarding
        }
      });
  }, [session, tenant]);

  const aggiornaTenant = useCallback((updates) => {
    setTenant(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const uid = () => session?.user?.id || null;

  const logout = () => supabase.auth.signOut();

  const value = {
    session, tenant, setTenant, ruoloTenant, setRuoloTenant,
    loading, setLoading, dbErr, setDbErr,
    temaCorrente, setTemaCorrente,
    aggiornaTenant, uid, logout,
    isAdmin: ruoloTenant === "admin" || ruoloTenant === "membro",
    isCliente: false, // calcolato in base al ruolo operatore
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant deve essere dentro TenantProvider");
  return ctx;
};
