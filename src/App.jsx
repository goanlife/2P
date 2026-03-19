import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";
import { DashboardFornitore } from "./components/DashboardFornitore";
import { ChiudiIntervento } from "./components/ChiudiIntervento";
import { ChecklistEditor, ChecklistIntervento } from "./components/PianoChecklist";
import { CampanellaNotifiche, useNotifiche } from "./components/Notifiche";
import { RicercaGlobale } from "./components/RicercaGlobale";
import { Statistiche } from "./components/Statistiche";
import { KanbanView } from "./components/KanbanView";
import { QRCodeAsset, stampaVerbale, exportCSV, logAction } from "./utils/features.jsx";
import Onboarding from "./components/Onboarding";
import Azienda from "./components/Azienda";
import { Field, Toast, ConflictiBanner, ConfirmDialog, Overlay, Modal, AvvisoConflitto } from "./components/ui/Atoms";
import { ModalRipianifica, PopupGiorno, Calendario } from "./components/CalendarioView";
import { ModalSitiCliente, VistaCliente, ModalUtente, GestioneUtenti, ModalGruppo, ModalAssegnaGruppo, GestioneGruppi, ModalCreaAccesso } from "./components/GestioneUtenti";
import { ModalAsset, GestioneAssets, ModalCliente, GestioneClienti } from "./components/GestioneClientiAsset";
import { ModalManut, ChecklistBadge, ListaManut } from "./components/ListaManutenzioni";
import { applyTheme, SelettoreTema, GestoreAllegati, PannelloAllegati, TEMI } from "./components/AllegatiTemi";
import { MobileNav } from "./components/MobileNav";
import { ALL_TABS } from "./components/ConfigurazioneMenu";
import { GestionePiani, ModalPiano, ModalAssegnazione } from "./components/GestionePiani";
import { Dashboard } from "./components/DashboardMain";


const GIORNI = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const MESI   = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const FREQUENZE = [
  { v:"settimanale", l:"Settimanale", giorni:7   },
  { v:"mensile",     l:"Mensile",     giorni:30  },
  { v:"bimestrale",  l:"Bimestrale",  giorni:60  },
  { v:"trimestrale", l:"Trimestrale", giorni:90  },
  { v:"semestrale",  l:"Semestrale",  giorni:180 },
  { v:"annuale",     l:"Annuale",     giorni:365 },
];
const COLORI_OP = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6"];
const OP_DEFAULT = [
  { nome:"Marco Rossi",   spec:"Elettrico",  col:"#378ADD", tipo:"fornitore" },
  { nome:"Laura Bianchi", spec:"Meccanico",  col:"#1D9E75", tipo:"fornitore" },
  { nome:"Giorgio Ferri", spec:"Idraulico",  col:"#D85A30", tipo:"fornitore" },
  { nome:"Anna Conti",    spec:"Generico",   col:"#7F77DD", tipo:"interno"   },
];
const PRI_COLOR = { bassa:"#94A3B8", media:"#F59E0B", alta:"#3B82F6", urgente:"#EF4444" };
const STATO_LABEL = { pianificata:"Pianificata", inCorso:"In corso", completata:"Completata", scaduta:"Scaduta" };
const TIPO_OP = {
  fornitore: { label:"Fornitore", cls:"badge", style:{background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE"} },
  cliente:   { label:"Cliente",   cls:"badge", style:{background:"#EEEDFE",color:"#4F46E5",border:"1px solid #C4B5FD"} },
  interno:   { label:"Interno",   cls:"badge", style:{background:"#ECFDF5",color:"#065F46",border:"1px solid #A7F3D0"} },
};
const COLORI_GRUPPI = ["#378ADD","#1D9E75","#D85A30","#7F77DD","#E8A020","#C0395A","#2AADAD","#8B5CF6","#0EA5E9","#84CC16"];


// ─── Mappers ──────────────────────────────────────────────────────────────
const mapM  = r => ({ id:r.id, titolo:r.titolo, tipo:r.tipo, stato:r.stato, priorita:r.priorita, operatoreId:r.operatore_id, clienteId:r.cliente_id, assetId:r.asset_id, pianoId:r.piano_id, assegnazioneId:r.assegnazione_id||null, data:r.data, durata:r.durata, note:r.note||"", userId:r.user_id||"", noteChiusura:r.note_chiusura||"", oreEffettive:r.ore_effettive||null, partiUsate:r.parti_usate||"", firmaSvg:r.firma_svg||"", chiusoAt:r.chiuso_at||null, numeroIntervento:r.numero_intervento||1 });
const mapC  = r => ({ id:r.id, rs:r.rs, piva:r.piva||"", contatto:r.contatto||"", tel:r.tel||"", email:r.email||"", ind:r.ind||"", settore:r.settore||"", note:r.note||"", userId:r.user_id||"" });
const mapA  = r => ({ id:r.id, nome:r.nome, tipo:r.tipo||"", clienteId:r.cliente_id, ubicazione:r.ubicazione||"", matricola:r.matricola||"", marca:r.marca||"", modello:r.modello||"", dataInst:r.data_inst||"", stato:r.stato||"attivo", note:r.note||"", userId:r.user_id||"" });
const mapP  = r => ({ id:r.id, nome:r.nome, descrizione:r.descrizione||"", tipo:r.tipo||"ordinaria", frequenza:r.frequenza||"mensile", durata:r.durata||60, priorita:r.priorita||"media", attivo:r.attivo, userId:r.user_id||"" });
const mapAss = r => ({ id:r.id, pianoId:r.piano_id, assetId:r.asset_id, clienteId:r.cliente_id, operatoreId:r.operatore_id, dataInizio:r.data_inizio||"", dataFine:r.data_fine||"", attivo:r.attivo, userId:r.user_id||"" });
const mapOp = r => ({ id:r.id, nome:r.nome, spec:r.spec||"", col:r.col||"#378ADD", tipo:r.tipo||"fornitore", email:r.email||"", authUserId:r.auth_user_id||null, tema:r.tema||"navy" });
const mapSito   = r => ({ id:r.id, operatoreId:r.operatore_id, clienteId:r.cliente_id });
const mapGruppo = r => ({ id:r.id, nome:r.nome, descrizione:r.descrizione||'', col:r.col||'#378ADD' });
const mapGOp    = r => ({ id:r.id, gruppoId:r.gruppo_id, operatoreId:r.operatore_id });
const mapGSito  = r => ({ id:r.id, gruppoId:r.gruppo_id, clienteId:r.cliente_id });
const mapAllegato = r => ({ id:r.id, nome:r.nome, storagePath:r.storage_path, mimeType:r.mime_type||"", dimensione:r.dimensione||0, createdAt:r.created_at||"" });

const toDbM  = (f,uid,tid) => ({ titolo:f.titolo, tipo:f.tipo||"ordinaria", stato:f.stato||"pianificata", priorita:f.priorita||"media", operatore_id:f.operatoreId?Number(f.operatoreId):null, cliente_id:f.clienteId?Number(f.clienteId):null, asset_id:f.assetId?Number(f.assetId):null, piano_id:f.pianoId?Number(f.pianoId):null, data:f.data, durata:Number(f.durata)||60, note:f.note||"", user_id:uid, ...(tid&&{tenant_id:tid}) });
const toDbC  = (f,uid,tid) => ({ rs:f.rs, piva:f.piva||"", contatto:f.contatto||"", tel:f.tel||"", email:f.email||"", ind:f.ind||"", settore:f.settore||"", note:f.note||"", user_id:uid, ...(tid&&{tenant_id:tid}) });
const toDbA  = (f,uid,tid) => ({ nome:f.nome, tipo:f.tipo||"", cliente_id:f.clienteId?Number(f.clienteId):null, ubicazione:f.ubicazione||"", matricola:f.matricola||"", marca:f.marca||"", modello:f.modello||"", data_inst:f.dataInst||null, stato:f.stato||"attivo", note:f.note||"", user_id:uid, ...(tid&&{tenant_id:tid}) });
const toDbP  = (f,uid,tid) => ({ nome:f.nome, descrizione:f.descrizione||"", tipo:f.tipo||"ordinaria", frequenza:f.frequenza||"mensile", durata:Number(f.durata)||60, priorita:f.priorita||"media", attivo:f.attivo!==false, user_id:uid, ...(tid&&{tenant_id:tid}) });
const toDbAss = (f,uid,tid) => ({ piano_id:Number(f.pianoId), asset_id:f.assetId?Number(f.assetId):null, cliente_id:f.clienteId?Number(f.clienteId):null, operatore_id:f.operatoreId?Number(f.operatoreId):null, data_inizio:f.dataInizio||null, data_fine:f.dataFine||null, attivo:f.attivo!==false, user_id:uid, ...(tid&&{tenant_id:tid}) });
const toDbOp    = (f,uid) => ({ nome:f.nome, spec:f.spec||"", col:f.col||"#378ADD", tipo:f.tipo||"fornitore", user_id:uid });
const toDbGruppo = (f,uid) => ({ nome:f.nome, descrizione:f.descrizione||"", col:f.col||"#378ADD", user_id:uid });

// ─── Utils ────────────────────────────────────────────────────────────────
const fmtData  = d => d ? new Date(d+"T00:00:00").toLocaleDateString("it-IT") : "—";
const isoDate  = d => {
  if (typeof d === "string" && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
  const dt = new Date(d); 
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};
const addDays  = (iso,n) => { const d=new Date(iso); d.setDate(d.getDate()+n); return isoDate(d); };
const addMonths= (iso,n) => { const d=new Date(iso); d.setMonth(d.getMonth()+n); return isoDate(d); };

const LIVELLI_PIANO = [
  { v:"standard", l:"Standard",    col:"#378ADD", desc:"Piano normale senza livello" },
  { v:"L1",       l:"L1 — Base",   col:"#059669", desc:"Controllo rapido (es. settimanale)" },
  { v:"L2",       l:"L2 — Medio",  col:"#F59E0B", desc:"Controllo completo (es. mensile)" },
  { v:"L3",       l:"L3 — Completo", col:"#EF4444", desc:"Revisione totale (es. annuale)" },
];
function generaOccorrenze(piano, dataInizio, mesi=12, skipPassate=false) {
  if (!dataInizio) return [];
  const freq = FREQUENZE.find(f=>f.v===piano.frequenza); if (!freq) return [];
  const fine = (piano.dataFine&&piano.dataFine>dataInizio) ? piano.dataFine : addMonths(dataInizio, mesi);
  const occ=[]; let cur=dataInizio;
  const oggi = new Date().toISOString().split("T")[0];
  while (cur<=fine && occ.length<200) {
    if (!skipPassate || cur >= oggi) occ.push(cur);
    const mult={mensile:1,bimestrale:2,trimestrale:3,semestrale:6,annuale:12}[piano.frequenza];
    cur = mult ? addMonths(cur,mult) : addDays(cur,freq.giorni);
  }
  return occ;
}
function conflitti(manutenzioni,operatoreId,data,escludiId=null) {
  return manutenzioni.filter(m=>m.operatoreId===Number(operatoreId)&&m.data===data&&m.stato!=="completata"&&m.id!==escludiId);
}

// ─── App root ─────────────────────────────────────────────────────────────
export default function App() {
  const [session,  setSess] = useState(null);
  const [tenant,      setTenant]      = useState(null); // azienda corrente
  const [ruoloTenant, setRuoloTenant] = useState("membro"); // ruolo utente nel tenant
  const aggiornaTenant = t => setTenant(prev => ({...prev, ...t}));
  const [loading,  setLoad] = useState(true);
  const [dbErr,    setDbErr] = useState(null);
  const [man,      sMan]  = useState([]);
  const [clienti,  sCl]   = useState([]);
  const [assets,   sAs]   = useState([]);
  const [piani,    sPi]   = useState([]);
  const [operatori,sOp]   = useState([]);
  const [assegnazioni, sAss] = useState([]);
  const [siti,     sSiti] = useState([]);
  const [gruppi,   sGruppi]= useState([]);
  const [gOps,     sGOps]  = useState([]);
  const [gSiti,    sGSiti] = useState([]);
  const [vista,   sV]  = useState("dashboard");
  const [filtroMan, setFiltroMan] = useState({});
  const [manTotale, setManTotale] = useState(null); // null = non sappiamo ancora
  const [manCaricaTutto, setManCaricaTutto] = useState(false);
  const [modalM,  sMM] = useState(false);
  const [inModM,  siMM]= useState(null);
  const [dataDef, sDD] = useState("");
  const [temaModal, setTemaModal] = useState(false);
  const [temaCorrente, setTemaCorrente] = useState("navy");
  const [chiudiModal, setChiudiModal] = useState(null); // manutenzione da chiudere
  const [ricercaAperta, setRicercaAperta] = useState(false);
  const [qrAsset, setQrAsset] = useState(null);
  const [vistaLista, setVistaLista] = useState("lista"); // lista | kanban
  const [toast,   sToast] = useState(null);
  const notify = (msg,type="error") => sToast({msg,type});
  const [sidebarOpen, setSidebar] = useState(false);
  const [menuConfig, setMenuConfig] = useState({}); // gruppoId → Set<tabId>
  const [confirmDlg, setConfirmDlg] = useState(null); // {msg, onConfirm}
  const confirmDel = (msg, fn) => setConfirmDlg({ msg, onConfirm: () => { fn(); setConfirmDlg(null); } });

  // Wrapper per operazioni DB con gestione errori uniforme
  const safeDb = async (fn, successMsg=null) => {
    try {
      await fn();
      if(successMsg) notify(successMsg, "success");
    } catch(e) {
      console.error("DB error:", e);
      notify("Errore di rete. Riprova tra poco.", "error");
    }
  };

  // Apply default theme on mount - legge da localStorage per evitare flickering
  useEffect(() => {
    const saved = localStorage.getItem("manumanTema") || "navy";
    applyTheme(saved);
    setTemaCorrente(saved);
  }, []);

  // Aggiorna automaticamente stato → scaduta per attività passate non completate
  useEffect(() => {
    if (!tenant?.id || !man.length) return;
    const oggi = new Date().toISOString().split("T")[0];
    const daAggiornare = man.filter(m => m.stato === "pianificata" && m.data < oggi);
    if (!daAggiornare.length) return;
    // Aggiorna in batch nel DB
    supabase.from("manutenzioni")
      .update({ stato: "scaduta" })
      .eq("stato", "pianificata")
      .lt("data", oggi)
      .then(() => {
        sMan(prev => prev.map(m =>
          m.stato === "pianificata" && m.data < oggi ? { ...m, stato: "scaduta" } : m
        ));
      });
  }, [tenant?.id, man.length]);

  // Carica configurazione menu quando cambiano i gruppi dell'utente
  useEffect(() => {
    if (!tenant?.id) return;
    supabase.from("menu_config").select("*").eq("tenant_id", tenant.id)
      .then(({ data }) => {
        const mmap = {};
        (data || []).forEach(r => {
          if (!mmap[r.gruppo_id]) mmap[r.gruppo_id] = new Set();
          if (r.visibile) mmap[r.gruppo_id].add(r.tab_id);
        });
        setMenuConfig(mmap);
      });
  }, [tenant?.id, gOps.length]);

  // Calcola i tab visibili per l'utente corrente
  const tabsVisibili = (() => {
    // Admin vede sempre tutto
    if (ruoloTenant === "admin") return ALL_TABS;
    // Cliente: tab di default se nessun gruppo configurato
    if (ruolo === "cliente" && (!gOps.length || !Object.keys(menuConfig).length)) {
      return ALL_TABS.filter(t => ["dashboard","manutenzioni","calendario","assets","statistiche"].includes(t.id));
    }
    // Nessun gruppo configurato → tutto visibile
    if (!gOps.length || !Object.keys(menuConfig).length) return ALL_TABS;
    // Unione dei tab visibili in tutti i gruppi dell'utente
    const mieGruppi = gOps.filter(go => go.operatoreId === Number(operatori.find(o => o.userId === uid())?.id));
    if (!mieGruppi.length) return ALL_TABS;
    const visibili = new Set();
    mieGruppi.forEach(go => {
      const cfg = menuConfig[go.gruppoId];
      if (!cfg) { ALL_TABS.forEach(t => visibili.add(t.id)); }
      else cfg.forEach(id => visibili.add(id));
    });
    return ALL_TABS.filter(t => visibili.has(t.id));
  })();

  // Se la vista corrente non è più nei tab visibili, torna alla dashboard
  // NOTA: questo useEffect DEVE stare dopo la definizione di tabsVisibili
  // eslint-disable-next-line react-hooks/exhaustive-deps


  // Se la vista corrente non è più nei tab visibili, torna alla dashboard
  useEffect(() => {
    if (tabsVisibili.length && !tabsVisibili.find(t => t.id === vista)) {
      sV(tabsVisibili[0].id);
    }
  }, [tabsVisibili.length]);

  // Keyboard shortcut: Ctrl+K / Cmd+K per ricerca globale
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setRicercaAperta(v => !v);
      }
      if (e.key === "Escape") setRicercaAperta(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSess(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) { setLoad(true); setSess(s); }
      else { setSess(null); setTenant(null); setRuoloTenant("membro"); sMan([]); sCl([]); sAs([]); sPi([]); sAss([]); sOp([]); sSiti([]); sGruppi([]); sGOps([]); sGSiti([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setLoad(false); return; }
    // Se non abbiamo ancora il tenant, cercalo prima di caricare i dati
    if (!tenant) {
      setLoad(true);
      supabase.from("tenant_users")
        .select("tenant_id, ruolo, tenants(id, nome, logo_url, piva, indirizzo, citta, cap, tel, email, sito)")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) { console.error("Errore tenant:", error); setLoad(false); return; }
          if (data?.tenants) {
            setTenant(data.tenants);
            setRuoloTenant(data.ruolo || "membro");
          } else {
            setLoad(false); // nessun tenant → mostra onboarding
          }
        });
      return; // aspetta che setTenant scatti il prossimo useEffect
    }
    setLoad(true);
    Promise.all([
      supabase.from("operatori").select("*").order("created_at"),
      supabase.from("clienti").select("*").order("created_at"),
      supabase.from("assets").select("*").order("created_at"),
      supabase.from("piani").select("*").order("created_at"),
      supabase.from("manutenzioni").select("*")
        .gte("data", new Date(Date.now()-180*24*60*60*1000).toISOString().split("T")[0])
        .order("data", {ascending:false})
        .limit(500),
      supabase.from("operatore_siti").select("*").order("created_at"),
      supabase.from("gruppi").select("*").order("created_at"),
      supabase.from("gruppo_operatori").select("*").order("created_at"),
      supabase.from("gruppo_siti").select("*").order("created_at"),
    ]).then(async ([ro, rc, ra, rp, rm, rs, rg, rgo, rgs]) => {
      if (ro.error||rc.error||ra.error||rp.error||rm.error) {
        setDbErr("Errore caricamento dati. Esegui schema.sql (v3) su Supabase.");
        setLoad(false); return;
      }
      const mappedOps = (ro.data||[]).map(mapOp);
      sOp(mappedOps);
      // Applica tema dell'utente loggato se presente
      const meOp = mappedOps.find(o => o.email === session?.user?.email);
      if (meOp?.tema) { applyTheme(meOp.tema); setTemaCorrente(meOp.tema); }
      sCl((rc.data||[]).map(mapC)); sAs((ra.data||[]).map(mapA)); sPi((rp.data||[]).map(mapP)); sMan((rm.data||[]).map(mapM));
      // Carica assegnazioni separatamente (tabella nuova - non blocca se fallisce)
      supabase.from("piano_assegnazioni").select("*").order("created_at")
        .then(({data,error}) => { if(!error && data) sAss(data.map(mapAss)); });
      sSiti((rs.data||[]).map(mapSito));
      sGruppi((rg.data||[]).map(mapGruppo));
      sGOps((rgo.data||[]).map(mapGOp));
      sGSiti((rgs.data||[]).map(mapGSito));
      setLoad(false);
    }).catch(err => {
      console.error('Errore caricamento dati:', err);
      setDbErr('Errore di rete. Controlla la connessione e ricarica.');
      setLoad(false);
    });
  }, [session, tenant]);

  const uid = () => session?.user?.id;
  const caricaTutteLeManut = async () => {
    setManCaricaTutto(true);
    setManTotale(null); // nascondi banner
    const {data} = await supabase.from("manutenzioni").select("*").order("data",{ascending:false});
    if(data) sMan(data.map(mapM));
  };
  const UID = session?.user?.id || "";
  const BATCH = 50;
  const buildRowM = (piano, ass, data, nIntervento=1) => ({ titolo:piano.nome, tipo:piano.tipo||"ordinaria", stato:"pianificata", priorita:piano.priorita||"media", operatore_id:ass?.operatoreId||null, cliente_id:ass?.clienteId||null, asset_id:ass?.assetId||null, piano_id:piano.id, assegnazione_id:ass?.id||null, data, durata:Number(piano.durata)||60, note:piano.descrizione||"", user_id:uid(), numero_intervento:nIntervento, ...(tenant?.id&&{tenant_id:tenant.id}) });

  const aggM = async f => { const {data,error}=await supabase.from("manutenzioni").insert(toDbM(f,uid(),tenant?.id)).select().single(); if(error){notify("Errore creazione: "+error.message);return;} sMan(p=>[...p,mapM(data)]); };
  const modM = async f => { const {error}=await supabase.from("manutenzioni").update(toDbM(f,uid(),tenant?.id)).eq("id",f.id); if(error){notify("Errore modifica: "+error.message);return;} sMan(p=>p.map(m=>m.id===f.id?{...m,...f}:m)); };
  const delM = async id => { await supabase.from("manutenzioni").delete().eq("id",id); sMan(p=>p.filter(m=>m.id!==id)); };
  const statoM = async (id,stato) => { await supabase.from("manutenzioni").update({stato}).eq("id",id); sMan(p=>p.map(m=>m.id===id?{...m,stato}:m)); };
  const ripiM = async (id,data,operatoreId) => { const m=man.find(x=>x.id===id);const ns=m?.stato==="scaduta"?"pianificata":m?.stato; await supabase.from("manutenzioni").update({data,operatore_id:operatoreId||null,stato:ns}).eq("id",id); sMan(p=>p.map(x=>x.id===id?{...x,data,operatoreId,stato:ns}:x)); };
  const aggC = async f => { const {data,error}=await supabase.from("clienti").insert(toDbC(f,uid(),tenant?.id)).select().single(); if(error)notify("Errore: "+error.message); else sCl(p=>[...p,mapC(data)]); };
  const modC = async f => { await supabase.from("clienti").update(toDbC(f,uid(),tenant?.id)).eq("id",f.id); sCl(p=>p.map(c=>c.id===f.id?{...c,...f}:c)); };
  const delC = async id => { await supabase.from("clienti").delete().eq("id",id); sCl(p=>p.filter(c=>c.id!==id)); };
  const aggA = async f => { const {data,error}=await supabase.from("assets").insert(toDbA(f,uid(),tenant?.id)).select().single(); if(!error)sAs(p=>[...p,mapA(data)]); };
  const modA = async f => { await supabase.from("assets").update(toDbA(f,uid(),tenant?.id)).eq("id",f.id); sAs(p=>p.map(a=>a.id===f.id?{...a,...f}:a)); };
  const delA = async id => { await supabase.from("assets").delete().eq("id",id); sAs(p=>p.filter(a=>a.id!==id)); };
  const aggOp = async f => { const {data,error}=await supabase.from("operatori").insert(toDbOp(f,uid())).select().single(); if(!error)sOp(p=>[...p,mapOp(data)]); };
  const modOp = async f => {
    const {error}=await supabase.from("operatori").update(toDbOp(f,uid())).eq("id",f.id);
    if(!error) sOp(p=>p.map(o=>o.id===f.id?{...o,...f}:o));
  };
  const creaAccesso = async (opId, email, authUserId) => {
    await supabase.from("operatori").update({ email, auth_user_id: authUserId||null }).eq("id", opId);
    sOp(p=>p.map(o=>o.id===opId?{...o,email,authUserId:authUserId||null}:o));
    notify(`Accesso creato per ${email}`, "success");
  };
  const delOp = async id => { await supabase.from("operatori").delete().eq("id",id); sOp(p=>p.filter(o=>o.id!==id)); sSiti(p=>p.filter(s=>s.operatoreId!==id)); };

  // Salva associazioni siti per un operatore cliente
  const saveSiti = async (operatoreId, clienteIds) => {
    // Elimina le vecchie associazioni
    await supabase.from("operatore_siti").delete().eq("operatore_id", operatoreId);
    sSiti(p=>p.filter(s=>s.operatoreId!==operatoreId));
    if (!clienteIds.length) return;
    const rows = clienteIds.map(cliente_id=>({ operatore_id:operatoreId, cliente_id, user_id:uid() }));
    const {data,error} = await supabase.from("operatore_siti").insert(rows).select();
    if (!error&&data) sSiti(p=>[...p,...data.map(mapSito)]);
  };

  // ── Gruppi ───────────────────────────────────────────────────────────────
  const aggGruppo = async f => {
    const {data,error}=await supabase.from("gruppi").insert(toDbGruppo(f,uid())).select().single();
    if(error){ notify("Errore salvataggio gruppo: "+error.message+". Hai eseguito schema_v3.sql su Supabase?"); return; }
    sGruppi(p=>[...p,mapGruppo(data)]); notify("Gruppo creato con successo","success");
  };
  const modGruppo = async f => {
    const {error}=await supabase.from("gruppi").update(toDbGruppo(f,uid())).eq("id",f.id);
    if(error){ notify("Errore aggiornamento gruppo: "+error.message); return; }
    sGruppi(p=>p.map(g=>g.id===f.id?{...g,...f}:g)); notify("Gruppo aggiornato","success");
  };
  const delGruppo = async id => {
    await supabase.from("gruppi").delete().eq("id",id);
    sGruppi(p=>p.filter(g=>g.id!==id));
    sGOps(p=>p.filter(g=>g.gruppoId!==id));
    sGSiti(p=>p.filter(g=>g.gruppoId!==id));
  };
  const saveAssocGruppo = async (gruppoId, opIds, sitoIds) => {
    const {error:e1}=await supabase.from("gruppo_operatori").delete().eq("gruppo_id", gruppoId);
    const {error:e2}=await supabase.from("gruppo_siti").delete().eq("gruppo_id", gruppoId);
    if(e1||e2){ notify("Errore: "+(e1||e2).message+". Hai eseguito schema_v3.sql su Supabase?"); return; }
    sGOps(p=>p.filter(g=>g.gruppoId!==gruppoId));
    sGSiti(p=>p.filter(g=>g.gruppoId!==gruppoId));
    if (opIds.length) {
      const rows=opIds.map(operatore_id=>({gruppo_id:gruppoId,operatore_id,user_id:uid()}));
      const {data}=await supabase.from("gruppo_operatori").insert(rows).select();
      if(data)sGOps(p=>[...p,...data.map(mapGOp)]);
    }
    if (sitoIds.length) {
      const rows=sitoIds.map(cliente_id=>({gruppo_id:gruppoId,cliente_id,user_id:uid()}));
      const {data}=await supabase.from("gruppo_siti").insert(rows).select();
      if(data)sGSiti(p=>[...p,...data.map(mapGSito)]);
    }
  };

  // Crea piano template (senza asset/cliente/operatore)
  const aggPiano = async f => {
    const {data:pianoRow,error:pErr}=await supabase.from("piani").insert(toDbP(f,uid(),tenant?.id)).select().single();
    if(pErr){console.error(pErr);notify("Errore creazione piano: "+pErr.message);return;}
    const np=mapP(pianoRow); sPi(p=>[...p,np]);
    notify("Piano creato. Ora aggiungi un'assegnazione per generare le attività.", "success");
  };

  // Crea assegnazione piano → asset e genera occorrenze
  const aggAssegnazione = async f => {
    const ass={...f,pianoId:Number(f.pianoId),assetId:f.assetId?Number(f.assetId):null,clienteId:f.clienteId?Number(f.clienteId):null,operatoreId:f.operatoreId?Number(f.operatoreId):null};
    const {data:assRow,error:aErr}=await supabase.from("piano_assegnazioni").insert(toDbAss(ass,uid())).select().single();
    if(aErr){console.error(aErr);notify("Errore assegnazione: "+aErr.message);return;}
    const na=mapAss(assRow); sAss(p=>[...p,na]);
    // Genera occorrenze per questa assegnazione
    const piano=piani.find(p=>p.id===na.pianoId);
    if(!piano||!na.dataInizio)return;
    const occ=generaOccorrenze(piano,na.dataInizio,12); if(!occ.length)return;
    let saved=[];
    for(let i=0;i<occ.length;i+=BATCH){const {data:chunk,error:e}=await supabase.from("manutenzioni").insert(occ.slice(i,i+BATCH).map((d,j)=>buildRowM(piano,na,d,i+j+1))).select();if(e){console.error(e);break;}if(chunk)saved=[...saved,...(chunk||[]).map(mapM)];}
    if(saved.length){sMan(p=>[...p,...saved]);notify(`${saved.length} attività generate!`,"success");}
    // Avviso rinnovo: se dataFine entro 30 giorni
    if(na.dataFine) {
      const daysLeft = Math.ceil((new Date(na.dataFine)-new Date())/(1000*60*60*24));
      if(daysLeft <= 30 && daysLeft > 0) notify(`⏰ Assegnazione in scadenza tra ${daysLeft} giorni — ricordati di rinnovarla!`,"warning");
    }
  };

  const rinnovaAssegnazione = async (assId) => {
    const a = assegnazioni.find(x=>x.id===assId);
    if(!a) return;
    const piano = piani.find(p=>p.id===a.pianoId);
    if(!piano) return;
    // Nuova data inizio = giorno dopo la data fine attuale (o oggi)
    const nuovaInizio = a.dataFine || isoDate(new Date());
    const nuovaFine = addMonths(nuovaInizio, 12);
    const {data:assRow,error} = await supabase.from("piano_assegnazioni")
      .update({data_inizio:nuovaInizio, data_fine:nuovaFine, attivo:true}).eq("id",assId).select().single();
    if(error){notify("Errore rinnovo: "+error.message);return;}
    const na = mapAss(assRow); sAss(p=>p.map(x=>x.id===assId?na:x));
    const occ = generaOccorrenze(piano, nuovaInizio, 12);
    if(!occ.length) return;
    const completati = man.filter(m=>m.assegnazioneId===assId&&m.stato==="completata").length;
    let saved=[];
    for(let i=0;i<occ.length;i+=BATCH){const {data:chunk,error:e}=await supabase.from("manutenzioni").insert(occ.slice(i,i+BATCH).map((d,j)=>buildRowM(piano,na,d,completati+i+j+1))).select();if(e){console.error(e);break;}if(chunk)saved=[...saved,...(chunk||[]).map(mapM)];}
    if(saved.length){sMan(p=>[...p,...saved]);notify(`Piano rinnovato — ${saved.length} nuove attività generate!`,"success");}
  };

  // Modifica assegnazione
  const modAssegnazione = async f => {
    const upd={...f,operatoreId:f.operatoreId?Number(f.operatoreId):null,clienteId:f.clienteId?Number(f.clienteId):null,assetId:f.assetId?Number(f.assetId):null};
    const {error}=await supabase.from("piano_assegnazioni").update(toDbAss(upd,uid())).eq("id",upd.id);
    if(error){console.error(error);return;}
    sAss(p=>p.map(a=>a.id===upd.id?upd:a));
    // Rigenera attività future
    const piano=piani.find(p=>p.id===upd.pianoId);
    if(!piano)return;
    const oggi=isoDate(new Date());
    await supabase.from("manutenzioni").delete().eq("assegnazione_id",upd.id).eq("stato","pianificata");
    sMan(prev=>prev.filter(m=>m.assegnazioneId!==upd.id||m.stato==="completata"||m.stato==="inCorso"));
    const dp=upd.dataInizio>oggi?upd.dataInizio:oggi;
    const occ=generaOccorrenze(piano,dp,12); if(!occ.length)return;
    const completati=man.filter(m=>m.assegnazioneId===upd.id&&m.stato==="completata").length;
    let saved=[];
    for(let i=0;i<occ.length;i+=BATCH){const {data:chunk,error:e}=await supabase.from("manutenzioni").insert(occ.slice(i,i+BATCH).map((d,j)=>buildRowM(piano,upd,d,completati+i+j+1))).select();if(e){console.error(e);break;}if(chunk)saved=[...saved,...(chunk||[]).map(mapM)];}
    if(saved.length)sMan(p=>[...p,...saved]);
  };

  // Elimina assegnazione
  const delAssegnazione = async id => {
    await supabase.from("manutenzioni").delete().eq("assegnazione_id",id).eq("stato","pianificata");
    await supabase.from("piano_assegnazioni").delete().eq("id",id);
    sAss(p=>p.filter(a=>a.id!==id));
    sMan(p=>p.filter(m=>m.assegnazioneId!==id||m.stato==="completata"||m.stato==="inCorso"));
  };
  const modPiano = async f => {
    const {error}=await supabase.from("piani").update(toDbP(f,uid(),tenant?.id)).eq("id",f.id);
    if(error){console.error(error);return;}
    sPi(p=>p.map(pi=>pi.id===f.id?{...pi,...f}:pi));
  };
  const delPiano = async id => { await supabase.from("piano_assegnazioni").delete().eq("piano_id",id); await supabase.from("manutenzioni").delete().eq("piano_id",id); await supabase.from("piani").delete().eq("id",id); sPi(p=>p.filter(pi=>pi.id!==id)); sAss(p=>p.filter(a=>a.pianoId!==id)); sMan(p=>p.filter(m=>m.pianoId!==id)); };
  const attivaDisattiva = async (id,attivo) => { await supabase.from("piano_assegnazioni").update({attivo}).eq("id",id); sAss(p=>p.map(a=>a.id===id?{...a,attivo}:a)); };

  const apriConData = d => { sDD(d); siMM(null); sMM(true); };

  // Chiudi intervento con firma
  const salvaChiusura = async (dati) => {
    const { id, stato, note_chiusura, ore_effettive, parti_usate, firma_svg, chiuso_at } = dati;
    const { error } = await supabase.from("manutenzioni").update({
      stato, note_chiusura, ore_effettive, parti_usate, firma_svg, chiuso_at,
    }).eq("id", id);
    if (error) {
      notify("Errore salvataggio: " + error.message, "error");
      return;
    }
    sMan(p => p.map(m => m.id === id ? {
      ...m, stato, noteChiusura: note_chiusura,
      oreEffettive: ore_effettive, partiUsate: parti_usate,
      firmaSvg: firma_svg, chiusoAt: chiuso_at,
    } : m));
    const meOp = operatori.find(o => o.email === session?.user?.email);
    await logAction(supabase, "manutenzione", id, "completato", { ore_effettive }, meOp?.nome || "", uid());
    notify("Intervento chiuso con successo ✅", "success");
  };
  const navigateTo = (tab, filters={}) => {
    setFiltroMan(filters);
    sV(tab);
    window.scrollTo({top:0, behavior:"smooth"});
  };
  const apriModM   = m => { siMM({...m, userId:uid()}); sDD(""); sMM(true); };
  const logout     = () => supabase.auth.signOut();

  // Dichiarate prima delle guard per poterle usare nel useMemo (Rules of Hooks)
  // Notifiche - useMemo PRIMA di tutti i return condizionali (Rules of Hooks)
  const notifiche = useMemo(() => {
    if (!session || !man.length) return [];
    const oggi_ = isoDate(new Date());
    const result = [];
    const meOp = operatori.find(o => o.email === session?.user?.email);
    const mieM = meOp?.tipo === "fornitore" ? man.filter(m => m.operatoreId === meOp.id) : meOp?.tipo === "cliente" ? manView : man;
    mieM.filter(m => m.stato !== "completata").forEach(m => {
      if (m.data < oggi_) result.push({ id:`sc_${m.id}`, tipo:"scaduta", titolo:"Attività scaduta", testo:m.titolo, data:m.data, manId:m.id, icon:"🔴" });
      else if (m.data === oggi_) result.push({ id:`og_${m.id}`, tipo:"oggi", titolo:"Attività per oggi", testo:m.titolo, data:m.data, manId:m.id, icon:"📅" });
      if (m.priorita === "urgente") result.push({ id:`ur_${m.id}`, tipo:"urgente", titolo:"⚡ Urgente", testo:m.titolo, data:m.data, manId:m.id, icon:"⚡" });
    });
    const seen = new Set();
    return result.filter(n => { if(seen.has(n.manId)) return false; seen.add(n.manId); return true; }).slice(0, 20);
  }, [man, operatori, session]);

  if (!session) return <Auth />;
  if (!tenant && !loading) return <Onboarding session={session} onTenantReady={t => { setTenant(t); }} />;

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">🔧</div>
      <div style={{fontFamily:"var(--font-head)",fontSize:22,fontWeight:700,color:"white"}}>ManuMan</div>
      <div className="loading-text">Caricamento in corso…</div>
    </div>
  );

  if (dbErr) return (
    <div className="error-screen">
      <div className="error-box">
        <div style={{fontSize:28,marginBottom:12}}>⚠️</div>
        <div style={{fontFamily:"var(--font-head)",fontWeight:700,fontSize:18,marginBottom:8}}>Errore database</div>
        <div style={{fontSize:13,color:"var(--red)",marginBottom:8}}>{dbErr}</div>
        <div style={{fontSize:12,color:"var(--text-3)"}}>Esegui <strong>schema.sql</strong> (v2) nel SQL Editor di Supabase, poi ricarica.</div>
        <button className="btn-primary" onClick={logout} style={{marginTop:16}}>Logout</button>
      </div>
    </div>
  );

  const fornitori = operatori.filter(o=>o.tipo==="fornitore");
  const meOperatore = operatori.find(o => o.email === session?.user?.email);
  const ruolo = meOperatore?.tipo || "admin";
  const isCliente = ruolo === "cliente";

  // Clienti associati a questo utente (se tipo=cliente)
  const mySiti = isCliente
    ? siti.filter(s => s.operatoreId === meOperatore?.id).map(s => s.clienteId)
    : null;

  // Dati filtrati per il ruolo cliente (vede solo i suoi clienti/asset/attività)
  const manView      = isCliente && mySiti
    ? man.filter(m => mySiti.includes(m.clienteId))
    : man;
  const clientiView  = isCliente && mySiti
    ? clienti.filter(c => mySiti.includes(c.id))
    : clienti;
  const assetsView   = isCliente && mySiti
    ? assets.filter(a => mySiti.includes(a.clienteId))
    : assets;

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebar(false)} />}
      <aside className={"sidebar"+(sidebarOpen?" open":"")}>

        {/* ── Logo ── */}
        <div className="sb-logo">
          {tenant?.logo_url
            ? <img src={tenant.logo_url} className="sb-logo-img" alt={tenant.nome} />
            : <div className="sb-logo-icon">🔧</div>
          }
          <div className="sb-logo-text">
            <span className="sb-brand">{tenant?.nome || "ManuMan"}</span>
            {tenant?.nome && <span className="sb-tenant">Gestione Manutenzioni</span>}
          </div>
          <button className="sb-close" onClick={()=>setSidebar(false)}>✕</button>
        </div>

        {/* ── Nuova attività ── */}
        <div className="sb-new-wrap">
          {!isCliente && (
            <button className="sb-new-btn" onClick={()=>{siMM(null);sDD("");sMM(true);setSidebar(false);}}>
              <span>＋</span> Nuova attività
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">
          {tabsVisibili.map(t=>(
            <button key={t.id} className={"sb-item"+(vista===t.id?" active":"")}
              onClick={()=>{ sV(t.id); setSidebar(false); }}>
              <span className="sb-icon">{t.icon}</span>
              <span className="sb-label">{t.l}</span>
            </button>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sb-footer">
          {(() => {
            const me = operatori.find(o=>o.email===session?.user?.email);
            const email = session?.user?.email || "";
            const initials = me ? me.nome.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase() : email.slice(0,2).toUpperCase();
            const col = me?.col || "#8BA3B8";
            return (
              <div className="sb-user">
                <div className="sb-avatar" style={{background:col+"25",border:`1.5px solid ${col}`,color:col}}>{initials}</div>
                <div className="sb-user-info">
                  <span className="sb-user-name">{me?.nome || email.split("@")[0]}</span>
                  <span className="sb-user-role">{me?.tipo==="fornitore"?"Fornitore":me?.tipo==="cliente"?"Cliente":"Admin"}</span>
                </div>
              </div>
            );
          })()}
          <div className="sb-footer-actions">
            <button className="sb-action" onClick={()=>setRicercaAperta(true)} title="Ricerca">🔍</button>
            <CampanellaNotifiche notifiche={notifiche} onNavigate={navigateTo} />
            <button className="sb-action" onClick={()=>setTemaModal(true)} title="Tema">🎨</button>
            <button className="sb-action sb-logout" onClick={logout} title="Esci">↩</button>
          </div>
        </div>

      </aside>

      <div className="sidebar-body">
        <header className="mini-topbar">
          <button className="hamburger-btn" onClick={()=>setSidebar(v=>!v)}>
            <span>☰</span>
          </button>
          <div className="mini-topbar-center">
            {tenant?.logo_url && <img src={tenant.logo_url} alt="" style={{height:24,maxWidth:64,objectFit:"contain",borderRadius:3,opacity:.9}} />}
            <span className="mini-topbar-title">{tabsVisibili.find(t=>t.id===vista)?.icon} {tabsVisibili.find(t=>t.id===vista)?.l}</span>
          </div>
          <div className="mini-topbar-right">
            <CampanellaNotifiche notifiche={notifiche} onNavigate={navigateTo} />
            {!isCliente && <button className="btn-new" onClick={()=>{siMM(null);sDD("");sMM(true);}}>+ Nuova</button>}
          </div>
        </header>
        <main className="page-content">
        {vista==="dashboard"    && (
          ruolo === "fornitore" && meOperatore
            ? <DashboardFornitore me={meOperatore} man={man} clienti={clienti} assets={assets} onStato={statoM} onApriChiudi={m=>setChiudiModal(m)} />
            : <Dashboard man={manView} clienti={clientiView} assets={assetsView} piani={piani} operatori={operatori} onNavigate={navigateTo} />
        )}
        {manTotale && man.length < manTotale && !manCaricaTutto && (
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:"var(--radius-sm)",padding:"10px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <span style={{fontSize:13,color:"#1D4ED8",flex:1}}>📊 Stai vedendo {man.length} manutenzioni (ultimi 6 mesi). Totale nel DB: {manTotale}.</span>
            <button onClick={caricaTutteLeManut} style={{padding:"6px 14px",background:"#1D4ED8",color:"white",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>Carica tutto</button>
          </div>
        )}
        {vista==="manutenzioni" && <ListaManut   man={manView} clienti={clientiView} assets={assetsView} operatori={operatori} onStato={statoM} onDel={(id)=>confirmDel("Eliminare questa attività? L'operazione non è reversibile.",()=>delM(id))} onMod={apriModM} initialFilters={filtroMan} key={JSON.stringify(filtroMan)}
          readOnly={isCliente}
          onChiudi={m=>setChiudiModal(m)}
          onVerbale={m=>stampaVerbale(m, clienti.find(c=>c.id===m.clienteId), assets.find(a=>a.id===m.assetId), operatori.find(o=>o.id===m.operatoreId))}
        />}
        {vista==="piani"        && <GestionePiani piani={piani} assegnazioni={assegnazioni} clienti={clientiView} assets={assetsView} manutenzioni={manView} operatori={operatori} onAgg={aggPiano} onMod={modPiano} onDel={(id)=>confirmDel("Eliminare questo piano? Verranno eliminate anche tutte le assegnazioni e le attività pianificate.",()=>delPiano(id))} onAggAss={aggAssegnazione} onModAss={modAssegnazione} onDelAss={(id)=>confirmDel("Eliminare questa assegnazione? Verranno eliminate le attività pianificate future.",()=>delAssegnazione(id))} onAttivaDisattiva={attivaDisattiva} onRinnova={rinnovaAssegnazione} />}
        {vista==="calendario"   && <Calendario   man={manView} clienti={clientiView} assets={assetsView} operatori={operatori} onRipianifica={ripiM} onNuovaData={apriConData} onStato={statoM} onMod={apriModM} onChiudi={m=>setChiudiModal(m)} />}
        {vista==="assets"       && <GestioneAssets assets={assetsView} clienti={clientiView} manutenzioni={man} onAgg={aggA} onMod={modA} onDel={(id)=>confirmDel("Eliminare questo asset? L'operazione non è reversibile.",()=>delA(id))} onQR={a=>setQrAsset(a)} />}
        {vista==="utenti"       && <GestioneUtenti operatori={operatori} man={man} clienti={clienti} siti={siti} onAgg={aggOp} onMod={modOp} onDel={(id)=>confirmDel("Eliminare questo operatore? L'operazione non è reversibile.",()=>delOp(id))} onSaveSiti={saveSiti} onCreaAccesso={creaAccesso} />}
        {vista==="gruppi"       && <GestioneGruppi gruppi={gruppi} operatori={operatori} clienti={clienti} man={man} gOps={gOps} gSiti={gSiti} onAgg={aggGruppo} onMod={modGruppo} onDel={(id)=>confirmDel("Eliminare questo gruppo? L'operazione non è reversibile.",()=>delGruppo(id))} onSaveAssoc={saveAssocGruppo} />}
        {vista==="clienti"      && <GestioneClienti clienti={clientiView} manutenzioni={manView} assets={assetsView} onAgg={aggC} onMod={modC} onDel={(id)=>confirmDel("Eliminare questo cliente? L'operazione non è reversibile.",()=>delC(id))} tenantId={tenant?.id} userId={uid()} onImportDone={async()=>{const{data}=await supabase.from("clienti").select("*").order("created_at");if(data)sCl(data.map(mapC));}} />}
        {vista==="statistiche"  && <Statistiche man={manView} clienti={clientiView} assets={assetsView} piani={piani} operatori={operatori} />}
        {vista==="kanban"       && <KanbanView man={manView} clienti={clientiView} assets={assetsView} operatori={operatori} onStato={statoM} onMod={apriModM} />}
        {vista==="azienda"      && <Azienda tenant={tenant} session={session} operatori={operatori} ruoloTenant={ruoloTenant} onTenantUpdate={aggiornaTenant} gruppi={gruppi} />}
      </main>

      {chiudiModal && (
        <ChiudiIntervento
          manutenzione={chiudiModal}
          cliente={clienti.find(c=>c.id===chiudiModal.clienteId)}
          asset={assets.find(a=>a.id===chiudiModal.assetId)}
          onClose={()=>setChiudiModal(null)}
          onSalva={salvaChiusura}
        />
      )}
      {ricercaAperta && (
        <RicercaGlobale
          man={man} clienti={clienti} assets={assets} piani={piani} operatori={operatori}
          onNavigate={navigateTo}
          onClose={()=>setRicercaAperta(false)}
        />
      )}
      {qrAsset && <QRCodeAsset asset={qrAsset} onClose={()=>setQrAsset(null)} />}
      {temaModal&&(
        <Overlay>
          <div className="modal-box" style={{width:"min(420px,94vw)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div className="modal-title">🎨 Tema colore</div>
              <button className="modal-close" onClick={()=>setTemaModal(false)}>✕</button>
            </div>
            <div style={{display:"grid",gap:14}}>
              <SelettoreTema value={temaCorrente} onChange={async t=>{
  setTemaCorrente(t);
  applyTheme(t);
  localStorage.setItem("manumanTema", t);
  const meOp = operatori.find(o=>o.email===session?.user?.email);
  if(meOp) await supabase.from("operatori").update({tema:t}).eq("id",meOp.id);
}} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                {TEMI.map(t=>(
                  <div key={t.id} onClick={async()=>{
  setTemaCorrente(t.id);
  applyTheme(t.id);
  localStorage.setItem("manumanTema", t.id);
  const meOp2 = operatori.find(o=>o.email===session?.user?.email);
  if(meOp2) await supabase.from("operatori").update({tema:t.id}).eq("id",meOp2.id);
}}
                    style={{padding:"10px 12px",borderRadius:"var(--radius-sm)",border:`2px solid ${temaCorrente===t.id?"var(--text-1)":"var(--border)"}`,cursor:"pointer",transition:"all .15s",background:temaCorrente===t.id?"var(--surface-2)":"var(--surface)"}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                      <div style={{width:14,height:14,borderRadius:3,background:t.top}} />
                      <div style={{width:8,height:14,borderRadius:2,background:t.bot}} />
                      <span style={{fontWeight:700,fontSize:13}}>{t.nome}</span>
                      {temaCorrente===t.id&&<span style={{marginLeft:"auto",fontSize:11,color:"var(--green)",fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{fontSize:11,color:"var(--text-3)"}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={()=>setTemaModal(false)}>Chiudi</button>
            </div>
          </div>
        </Overlay>
      )}
      {toast&&<Toast msg={toast.msg} type={toast.type} onDismiss={()=>sToast(null)} />}
      {confirmDlg&&<ConfirmDialog msg={confirmDlg.msg} onConfirm={confirmDlg.onConfirm} onCancel={()=>setConfirmDlg(null)} />}
      <MobileNav vista={vista} sV={sV} tabs={tabsVisibili} />
      {modalM && !isCliente && <ModalManut
        ini={inModM?{...inModM}:dataDef?{titolo:"",tipo:"ordinaria",priorita:"media",operatoreId:fornitori[0]?.id||"",clienteId:null,assetId:null,data:dataDef,durata:60,note:"",stato:"pianificata",pianoId:null}:null}
        clienti={clientiView} assets={assetsView} manutenzioni={manView} operatori={operatori}
        userId={UID}
        onClose={()=>{sMM(false);siMM(null);}}
        onSalva={f=>inModM?modM({...f,id:inModM.id}):aggM(f)}
      />}
      </div>{/* sidebar-body */}
    </div>
  );
}
