// ── Helper invio email tramite Supabase Edge Function ─────────────────────
import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Invia una singola email (o lista) con supporto oggetto/corpo custom
async function inviaEmail(tipo, destinatari, dati) {
  const toList = Array.isArray(destinatari)
    ? destinatari.filter(Boolean)
    : [destinatari].filter(Boolean);
  if (!toList.length) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || ANON_KEY;
    await fetch(`${BASE_URL}/functions/v1/notifica-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo, destinatari: toList, dati }),
    });
  } catch(e) {
    console.warn("Email non inviata:", e.message);
  }
}

// ── Risolve i destinatari da una configurazione di notifica ───────────────
// cfg = { abilitato, dest_operatore, dest_email_sito, extra_emails, emails_aggiuntive }
// ctx = { operatore, emailSito, clienteEmail }
export function risolviDestinatari(cfg, ctx = {}) {
  if (!cfg?.abilitato) return [];
  const lista = [];
  if (cfg.dest_operatore     && ctx.operatore?.email)  lista.push(ctx.operatore.email);
  if (cfg.dest_email_sito    && ctx.emailSito)          lista.push(ctx.emailSito);
  if (cfg.dest_cliente       && ctx.clienteEmail)       lista.push(ctx.clienteEmail);
  if (cfg.extra_emails) {
    cfg.extra_emails.split(/[,;\s]+/).map(e=>e.trim()).filter(Boolean).forEach(e=>lista.push(e));
  }
  return [...new Set(lista)];
}

// ── Interpolazione variabili nel testo ────────────────────────────────────
function interp(tpl, vars) {
  if (!tpl) return tpl;
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

// ════════════════════════════════════════════════════════════════════════════
// FUNZIONI PUBBLICHE
// ════════════════════════════════════════════════════════════════════════════

// ── OdL assegnato → tecnico ───────────────────────────────────────────────
export async function emailOdlAssegnato(operatore, odl, cliente, cfg, tenantNome) {
  const dest = risolviDestinatari(cfg, { operatore });
  if (!dest.length) return;
  const vars = {
    nome_tecnico: operatore?.nome||"—", numero_odl: odl.numero,
    titolo: odl.titolo, cliente: cliente?.rs||"—",
    data: odl.data_inizio, n_attivita: String(odl.n_attivita||0),
  };
  await inviaEmail("odl_assegnato", dest, {
    numero: odl.numero, titolo: odl.titolo,
    cliente: cliente?.rs||"—", data_inizio: odl.data_inizio,
    n_attivita: odl.n_attivita, durata_ore: odl.durata_stimata ? Math.round(odl.durata_stimata/60*10)/10 : null,
    url: `${window.location.origin}/#odl`,
    oggetto_custom: cfg?.oggetto ? interp(cfg.oggetto, vars) : null,
    corpo_custom:   cfg?.corpo   ? interp(cfg.corpo,   vars) : null,
    mittente_custom: cfg?.mittente || null,
    tenant_nome: tenantNome,
  });
}

// ── Intervento completato → cliente ──────────────────────────────────────
export async function emailInterventoCompletato(cliente, manutenzione, tecnico, cfg, tenantNome) {
  const dest = risolviDestinatari(cfg, { clienteEmail: cliente?.email, emailSito: cliente?.email });
  if (!dest.length) return;
  const chiuso = manutenzione.chiusoAt
    ? new Date(manutenzione.chiusoAt).toLocaleDateString("it-IT")
    : new Date().toLocaleDateString("it-IT");
  const vars = {
    titolo: manutenzione.titolo, tecnico: tecnico?.nome||"—",
    chiuso_at: chiuso, cliente: cliente?.rs||"—",
    ore_effettive: String(manutenzione.oreEffettive||"—"),
  };
  await inviaEmail("intervento_completato", dest, {
    titolo: manutenzione.titolo, tecnico: tecnico?.nome||"—",
    chiuso_at: chiuso, ore_effettive: manutenzione.oreEffettive,
    note_chiusura: manutenzione.noteChiusura,
    url: `${window.location.origin}/#manutenzioni`,
    oggetto_custom: cfg?.oggetto ? interp(cfg.oggetto, vars) : null,
    corpo_custom:   cfg?.corpo   ? interp(cfg.corpo,   vars) : null,
    tenant_nome: tenantNome,
  });
}

// ── Nuova richiesta ricevuta → admin/responsabile ─────────────────────────
export async function emailRichiestaRicevuta(manutenzione, cliente, asset, cfg, emailSito, tenantNome) {
  const dest = risolviDestinatari(cfg, { emailSito });
  if (!dest.length) return;
  const vars = {
    titolo: manutenzione.titolo, cliente: cliente?.rs||"—",
    asset: asset?.nome||"—", priorita: manutenzione.priorita,
    sottotipo: manutenzione.sottotipo||"straordinaria",
    causa: manutenzione.causaGuasto||"—",
    fermo: manutenzione.fermoImpianto ? "SÌ" : "No",
  };
  await inviaEmail("richiesta_ricevuta", dest, {
    titolo: manutenzione.titolo,
    sottotipo: manutenzione.sottotipo||"straordinaria",
    cliente: cliente?.rs||"—",
    asset: asset?.nome||"—",
    priorita: manutenzione.priorita,
    causa_guasto: manutenzione.causaGuasto,
    fermo_impianto: String(!!manutenzione.fermoImpianto),
    note: manutenzione.note||"",
    url: `${window.location.origin}/#richieste`,
    oggetto_custom: cfg?.oggetto ? interp(cfg.oggetto, vars) : null,
    corpo_custom:   cfg?.corpo   ? interp(cfg.corpo,   vars) : null,
    tenant_nome: tenantNome,
  });
}

// ── Richiesta approvata → cliente/richiedente ─────────────────────────────
export async function emailRichiestaApprovata(manutenzione, cliente, operatore, cfg, tenantNome) {
  const dest = risolviDestinatari(cfg, { clienteEmail: cliente?.email, operatore });
  if (!dest.length) return;
  const vars = {
    titolo: manutenzione.titolo, cliente: cliente?.rs||"—",
    operatore: operatore?.nome||"Da definire",
    data: manutenzione.data||"Da definire",
    durata: manutenzione.durata ? Math.round(manutenzione.durata/60*10)/10+"h" : "—",
  };
  await inviaEmail("richiesta_approvata", dest, {
    titolo: manutenzione.titolo,
    operatore: operatore?.nome||"—",
    data: manutenzione.data,
    durata: manutenzione.durata ? Math.round(manutenzione.durata/60*10)/10+"h" : null,
    nota_interna: manutenzione.note||"",
    url: `${window.location.origin}/#manutenzioni`,
    oggetto_custom: cfg?.oggetto ? interp(cfg.oggetto, vars) : null,
    corpo_custom:   cfg?.corpo   ? interp(cfg.corpo,   vars) : null,
    tenant_nome: tenantNome,
  });
}

// ── Richiesta rifiutata → cliente/richiedente ─────────────────────────────
export async function emailRichiestaRifiutata(manutenzione, cliente, motivo, cfg, tenantNome) {
  const dest = risolviDestinatari(cfg, { clienteEmail: cliente?.email });
  if (!dest.length) return;
  const vars = { titolo: manutenzione.titolo, motivo, cliente: cliente?.rs||"—" };
  await inviaEmail("richiesta_rifiutata", dest, {
    titolo: manutenzione.titolo,
    motivo,
    url: `${window.location.origin}/#richieste`,
    oggetto_custom: cfg?.oggetto ? interp(cfg.oggetto, vars) : null,
    corpo_custom:   cfg?.corpo   ? interp(cfg.corpo,   vars) : null,
    tenant_nome: tenantNome,
  });
}

// ── SLA in scadenza ───────────────────────────────────────────────────────
export async function emailSlaScadenza(destinatario, manutenzione, cliente, oreRimanenti, cfg, tenantNome) {
  if (!destinatario) return;
  await inviaEmail("sla_scadenza", [destinatario], {
    titolo: manutenzione.titolo, cliente: cliente?.rs||"—",
    ore_rimanenti: oreRimanenti, priorita: manutenzione.priorita,
    url: `${window.location.origin}/#manutenzioni`,
    tenant_nome: tenantNome,
  });
}

// ── Scadenza normativa ────────────────────────────────────────────────────
export async function emailScadenzaNormativa(destinatario, scadenza, cliente, cfg, tenantNome) {
  if (!destinatario) return;
  await inviaEmail("scadenza_normativa", [destinatario], {
    titolo: scadenza.titolo, cliente: cliente?.rs||"—",
    scadenza: scadenza.scadenza, giorni_rimanenti: scadenza.giorni_rimanenti,
    norma: scadenza.riferimento_normativo,
    tenant_nome: tenantNome,
  });
}
