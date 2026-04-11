/**
 * useManutenzioni — hook per manutenzioni con real-time Supabase
 * Carica, aggiorna, cancella + subscription live per collaborazione multi-utente
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

// ── Mapper ─────────────────────────────────────────────────────────────────
const map = r => ({
  id: r.id, titolo: r.titolo, tipo: r.tipo, stato: r.stato, priorita: r.priorita,
  operatoreId: r.operatore_id, clienteId: r.cliente_id, assetId: r.asset_id,
  pianoId: r.piano_id, assegnazioneId: r.assegnazione_id || null,
  data: r.data, durata: r.durata, note: r.note || "",
  userId: r.user_id || "", noteChiusura: r.note_chiusura || "",
  oreEffettive: r.ore_effettive || null, partiUsate: r.parti_usate || "",
  firmaSvg: r.firma_svg || "", chiusoAt: r.chiuso_at || null,
  numeroIntervento: r.numero_intervento || 1, createdAt: r.created_at || null,
  slaProfiloSnapshot: r.sla_profilo_id || null, odlId: r.odl_id || null,
  sottotipo: r.sottotipo || null, causaGuasto: r.causa_guasto || "",
  fermoImpianto: r.fermo_impianto || false, downtimeOre: r.downtime_ore || null,
});

export function useManutenzioni(tenantId) {
  const [man,           setMan]      = useState([]);
  const [manTotale,     setTotale]   = useState(null);
  const [manCaricaTutto,setTutto]    = useState(false);
  const [loading,       setLoading]  = useState(false);
  const channelRef = useRef(null);

  // ── Caricamento iniziale ────────────────────────────────────────────────
  const carica = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [{ data, error }, { count }] = await Promise.all([
        supabase.from("manutenzioni").select("*")
          .eq("tenant_id", tenantId)
          .gte("data", new Date(Date.now() - 180*24*60*60*1000).toISOString().split("T")[0])
          .order("data", { ascending: false })
          .limit(500),
        supabase.from("manutenzioni").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
      ]);
      if (error) throw error;
      const mapped = (data || []).map(map);
      setMan(mapped);
      if (count != null) {
        setTotale(count);
        setTutto(count <= mapped.length);
      }
    } catch (e) {
      console.error("useManutenzioni.carica:", e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const caricaTutte = useCallback(async () => {
    if (!tenantId) return;
    setTutto(true); setTotale(null);
    const { data } = await supabase.from("manutenzioni").select("*")
      .eq("tenant_id", tenantId).order("data", { ascending: false });
    if (data) setMan(data.map(map));
  }, [tenantId]);

  // ── CRUD ────────────────────────────────────────────────────────────────
  const aggiungi = useCallback(async (payload) => {
    const { data, error } = await supabase.from("manutenzioni")
      .insert(payload).select().single();
    if (error) throw error;
    setMan(prev => [...prev, map(data)]);
    return map(data);
  }, []);

  const modifica = useCallback(async (payload) => {
    const { error } = await supabase.from("manutenzioni")
      .update(payload).eq("id", payload.id);
    if (error) throw error;
    setMan(prev => prev.map(m => m.id === payload.id ? { ...m, ...map({ ...m, ...payload }) } : m));
  }, []);

  const aggiornaStat = useCallback(async (id, stato, extra = {}) => {
    const { data, error } = await supabase.from("manutenzioni")
      .update({ stato, ...extra })
      .eq("id", id).eq("tenant_id", tenantId)
      .select().single();
    if (error) throw error;
    setMan(prev => prev.map(m => m.id === id ? map(data) : m));
    return map(data);
  }, [tenantId]);

  const elimina = useCallback(async (id) => {
    await supabase.from("manutenzioni").delete()
      .eq("id", id).eq("tenant_id", tenantId);
    setMan(prev => prev.filter(m => m.id !== id));
  }, [tenantId]);

  // ── Real-time subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    carica();

    // Subscribe alle modifiche di questo tenant
    const channel = supabase.channel(`manutenzioni:${tenantId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "manutenzioni",
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        const { eventType, new: row, old } = payload;
        if (eventType === "INSERT") {
          setMan(prev => {
            // Evita duplicati (inserimento locale già aggiornato)
            if (prev.some(m => m.id === row.id)) return prev;
            return [map(row), ...prev];
          });
        } else if (eventType === "UPDATE") {
          setMan(prev => prev.map(m => m.id === row.id ? map(row) : m));
        } else if (eventType === "DELETE") {
          setMan(prev => prev.filter(m => m.id !== old.id));
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, carica]);

  return { man, setMan, manTotale, manCaricaTutto, loading, carica, caricaTutte, aggiungi, modifica, aggiornaStat, elimina };
}
