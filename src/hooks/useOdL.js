/**
 * useOdL — Ordini di Lavoro con real-time
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

export function useOdL(tenantId) {
  const [odl, setOdl] = useState([]);
  const channelRef = useRef(null);

  const carica = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("ordini_lavoro").select("*")
      .eq("tenant_id", tenantId).order("data_inizio", { ascending: false });
    if (data) setOdl(data);
  }, [tenantId]);

  const aggiungi = useCallback(async (payload) => {
    const { data, error } = await supabase.from("ordini_lavoro")
      .insert(payload).select().single();
    if (error) throw error;
    setOdl(prev => prev.some(o => o.id === data.id) ? prev : [data, ...prev]);
    return data;
  }, []);

  const aggiorna = useCallback(async (id, updates) => {
    const { data, error } = await supabase.from("ordini_lavoro")
      .update(updates).eq("id", id).select().single();
    if (error) throw error;
    setOdl(prev => prev.map(o => o.id === id ? data : o));
    return data;
  }, []);

  const elimina = useCallback(async (id) => {
    await supabase.from("ordini_lavoro").delete().eq("id", id);
    setOdl(prev => prev.filter(o => o.id !== id));
  }, []);

  // ── Real-time ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    carica();

    const channel = supabase.channel(`odl:${tenantId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "ordini_lavoro",
        filter: `tenant_id=eq.${tenantId}`,
      }, ({ eventType, new: row, old }) => {
        if (eventType === "INSERT")
          setOdl(prev => prev.some(o => o.id === row.id) ? prev : [row, ...prev]);
        else if (eventType === "UPDATE")
          setOdl(prev => prev.map(o => o.id === row.id ? row : o));
        else if (eventType === "DELETE")
          setOdl(prev => prev.filter(o => o.id !== old.id));
      })
      .subscribe();

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [tenantId, carica]);

  return { odl, setOdl, carica, aggiungi, aggiorna, elimina };
}
