/**
 * DataContext — centralizza tutti i dati dell'app e le operazioni CRUD
 * Toglie circa 600 righe da App.jsx
 */
import { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../supabase";

const DataContext = createContext(null);

export function DataProvider({ tenantId, userId, children }) {
  const [clienti,     setClienti]     = useState([]);
  const [assets,      setAssets]      = useState([]);
  const [operatori,   setOperatori]   = useState([]);
  const [piani,       setPiani]       = useState([]);
  const [assegnazioni,setAssegnazioni]= useState([]);
  const [pianoVoci,   setPianoVoci]   = useState([]);
  const [pianoSiti,   setPianoSiti]   = useState([]);
  const [siti,        setSiti]        = useState([]);
  const [gruppi,      setGruppi]      = useState([]);
  const [gOps,        setGOps]        = useState([]);
  const [gSiti,       setGSiti]       = useState([]);
  const [slaConfig,   setSlaConfig]   = useState([]);
  const [slaProfili,  setSlaProfili]  = useState([]);

  const caricaBase = useCallback(async () => {
    if (!tenantId) return;
    const [ro, rc, ra, rp, rg, rgo, rgs, ros] = await Promise.all([
      supabase.from("operatori").select("*").eq("tenant_id", tenantId).order("created_at"),
      supabase.from("clienti").select("*").eq("tenant_id", tenantId).order("created_at"),
      supabase.from("assets").select("*").eq("tenant_id", tenantId).order("created_at"),
      supabase.from("piani").select("*").eq("tenant_id", tenantId).order("created_at"),
      supabase.from("gruppi").select("*").eq("tenant_id", tenantId).order("created_at"),
      supabase.from("gruppo_operatori").select("*").order("created_at"),
      supabase.from("gruppo_siti").select("*").order("created_at"),
      supabase.from("operatore_siti").select("*").order("created_at"),
    ]);
    if (ro.data) setOperatori(ro.data);
    if (rc.data) setClienti(rc.data);
    if (ra.data) setAssets(ra.data);
    if (rp.data) setPiani(rp.data);
    if (rg.data) setGruppi(rg.data);
    if (rgo.data) setGOps(rgo.data);
    if (rgs.data) setGSiti(rgs.data);
    if (ros.data) setSiti(ros.data);

    // Fire and forget
    supabase.from("piano_assegnazioni").select("*").order("created_at")
      .then(({ data }) => { if (data) setAssegnazioni(data); });
    supabase.from("piano_voci").select("*").eq("tenant_id", tenantId).order("ordine")
      .then(({ data }) => { if (data) setPianoVoci(data); });
    supabase.from("piano_siti").select("*").eq("tenant_id", tenantId).order("created_at")
      .then(({ data }) => { if (data) setPianoSiti(data); });
  }, [tenantId]);

  const value = {
    clienti, setClienti,
    assets, setAssets,
    operatori, setOperatori,
    piani, setPiani,
    assegnazioni, setAssegnazioni,
    pianoVoci, setPianoVoci,
    pianoSiti, setPianoSiti,
    siti, setSiti,
    gruppi, setGruppi,
    gOps, setGOps,
    gSiti, setGSiti,
    slaConfig, setSlaConfig,
    slaProfili, setSlaProfili,
    caricaBase,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve essere dentro DataProvider");
  return ctx;
};
