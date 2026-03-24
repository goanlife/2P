// Helper per inviare email tramite Edge Function Supabase
import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

async function inviaEmail(tipo, destinatario, dati) {
  if (!destinatario) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || ANON_KEY;
    await fetch(`${BASE_URL}/functions/v1/notifica-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo, destinatario, dati }),
    });
  } catch(e) {
    console.warn("Email non inviata:", e.message);
  }
}

export async function emailOdlAssegnato(operatore, odl, cliente) {
  if (!operatore?.email) return;
  await inviaEmail("odl_assegnato", operatore.email, {
    numero:      odl.numero,
    titolo:      odl.titolo,
    cliente:     cliente?.rs || "—",
    data_inizio: odl.data_inizio,
    n_attivita:  odl.n_attivita,
    durata_ore:  odl.durata_stimata ? Math.round(odl.durata_stimata / 60 * 10) / 10 : null,
    url:         `${window.location.origin}/#odl`,
  });
}

export async function emailInterventoCompletato(cliente, manutenzione, tecnico) {
  if (!cliente?.email) return;
  const chiuso = manutenzione.chiusoAt
    ? new Date(manutenzione.chiusoAt).toLocaleDateString("it-IT")
    : new Date().toLocaleDateString("it-IT");
  await inviaEmail("intervento_completato", cliente.email, {
    titolo:        manutenzione.titolo,
    tecnico:       tecnico?.nome || "—",
    chiuso_at:     chiuso,
    ore_effettive: manutenzione.oreEffettive,
    note_chiusura: manutenzione.noteChiusura,
  });
}

export async function emailSlaScadenza(destinatario, manutenzione, cliente, oreRimanenti) {
  if (!destinatario) return;
  await inviaEmail("sla_scadenza", destinatario, {
    titolo:          manutenzione.titolo,
    cliente:         cliente?.rs || "—",
    ore_rimanenti:   oreRimanenti,
    priorita:        manutenzione.priorita,
    url:             `${window.location.origin}/#manutenzioni`,
  });
}

export async function emailScadenzaNormativa(destinatario, scadenza, cliente) {
  if (!destinatario) return;
  await inviaEmail("scadenza_normativa", destinatario, {
    titolo:           scadenza.titolo,
    cliente:          cliente?.rs || "—",
    scadenza:         scadenza.scadenza,
    giorni_rimanenti: scadenza.giorni_rimanenti,
    norma:            scadenza.riferimento_normativo,
  });
}
