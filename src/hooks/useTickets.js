import { usePushNotification } from "./usePushNotification.js";
/**
 * useTickets — hook per tickets con real-time Supabase
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

export function useTickets(tenantId) {
  const [tickets, setTickets] = useState([]);
  const { notificaTicket } = usePushNotification();
  const [loading, setLoading] = useState(false);
  const channelRef = useRef(null);

  const carica = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("tickets").select("*")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (e) {
      console.error("useTickets.carica:", e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const aggiungi = useCallback(async (payload) => {
    const { data, error } = await supabase.from("tickets")
      .insert(payload).select().single();
    if (error) throw error;
    setTickets(prev => {
      if (prev.some(t => t.id === data.id)) return prev;
      return [data, ...prev];
    });
    return data;
  }, []);

  const aggiorna = useCallback(async (id, updates) => {
    const { data, error } = await supabase.from("tickets")
      .update(updates).eq("id", id).eq("tenant_id", tenantId)
      .select().single();
    if (error) throw error;
    setTickets(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, [tenantId]);

  const elimina = useCallback(async (id) => {
    await supabase.from("tickets").delete().eq("id", id);
    setTickets(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Real-time ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    carica();

    const channel = supabase.channel(`tickets:${tenantId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "tickets",
        filter: `tenant_id=eq.${tenantId}`,
      }, ({ eventType, new: row, old }) => {
        if (eventType === "INSERT") {
          setTickets(prev => prev.some(t => t.id === row.id) ? prev : [row, ...prev]);
          // Notifica browser per ticket urgenti/alti
          if (row.priorita === "urgente" || row.priorita === "alta") notificaTicket(row);
        }
        else if (eventType === "UPDATE")
          setTickets(prev => prev.map(t => t.id === row.id ? row : t));
        else if (eventType === "DELETE")
          setTickets(prev => prev.filter(t => t.id !== old.id));
      })
      .subscribe();

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [tenantId, carica]);

  return { tickets, setTickets, loading, carica, aggiungi, aggiorna, elimina };
}
