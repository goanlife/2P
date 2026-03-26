// Supabase Edge Function — invio email tramite Resend
// Deploy: supabase functions deploy notifica-email
// Env required: RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Template base ─────────────────────────────────────────────────────────
function baseLayout(content: string, tenantNome = "ManuMan"): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:#0D1B2A;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="color:#F59E0B;margin:0;font-size:20px;">${tenantNome}</h1>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      ${content}
    </div>
    <div style="padding:12px 0;text-align:center;font-size:11px;color:#9ca3af;">
      Email automatica — non rispondere a questo indirizzo
    </div>
  </div>`;
}

function infoBox(items: {label:string, value:string}[]): string {
  return `<div style="background:#F9FAFB;border-radius:8px;padding:16px;margin:16px 0;">
    ${items.map(i=>`<p style="margin:4px 0;font-size:13px;"><strong>${i.label}:</strong> ${i.value}</p>`).join("")}
  </div>`;
}

function btn(text: string, url: string, color = "#F59E0B", textColor = "#0D1B2A"): string {
  return url ? `<a href="${url}" style="display:inline-block;background:${color};color:${textColor};padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">${text}</a>` : "";
}

// ── Interpolazione variabili nel testo custom ──────────────────────────────
function interpolate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_,k) => vars[k] ?? `{{${k}}}`);
}

// ── Costruttori email per tipo ─────────────────────────────────────────────
function buildEmail(tipo: string, dati: Record<string, unknown>, tenantNome: string): {subject:string, html:string} | null {
  const t = dati as Record<string, string>;
  const url = t.url || "";

  switch(tipo) {

    // ── OdL assegnato → tecnico ────────────────────────────────────────────
    case "odl_assegnato":
      return {
        subject: t.oggetto_custom || `📋 Nuovo Ordine di Lavoro — ${t.numero}`,
        html: baseLayout(`
          <h2 style="color:#111827;font-size:17px;">${t.titolo_custom||"Ti è stato assegnato un Ordine di Lavoro"}</h2>
          ${infoBox([
            {label:"OdL", value:t.numero},
            {label:"Intervento", value:t.titolo},
            {label:"Cliente", value:t.cliente||"—"},
            {label:"Data", value:t.data_inizio},
            {label:"Attività", value:String(t.n_attivita||0)},
            {label:"Durata stimata", value:t.durata_ore?t.durata_ore+"h":"—"},
          ])}
          ${t.corpo_custom ? `<p style="font-size:13px;color:#374151;">${t.corpo_custom}</p>` : ""}
          <p style="margin-top:16px;">${btn("Apri ManuMan →", url)}</p>
        `, tenantNome),
      };

    // ── Intervento completato → cliente ────────────────────────────────────
    case "intervento_completato":
      return {
        subject: t.oggetto_custom || `✅ Intervento completato — ${t.titolo}`,
        html: baseLayout(`
          <h2 style="color:#059669;font-size:17px;">✅ Intervento completato</h2>
          <div style="background:#F0FDF4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
            ${infoBox([
              {label:"Intervento", value:t.titolo},
              {label:"Tecnico", value:t.tecnico||"—"},
              {label:"Chiuso il", value:t.chiuso_at},
              ...(t.ore_effettive?[{label:"Ore effettive", value:t.ore_effettive+"h"}]:[]),
            ])}
            ${t.note_chiusura ? `<p style="margin:8px 0;font-size:13px;"><strong>Note:</strong> ${t.note_chiusura}</p>` : ""}
          </div>
          ${t.corpo_custom ? `<p style="font-size:13px;color:#374151;">${t.corpo_custom}</p>` : ""}
          <p style="margin-top:16px;">${btn("Apri ManuMan →", url)}</p>
        `, tenantNome),
      };

    // ── Nuova richiesta ricevuta → admin/responsabile ──────────────────────
    case "richiesta_ricevuta": {
      const urgenteBorder = t.priorita==="urgente"?"border-left:4px solid #EF4444;":"border-left:4px solid #F59E0B;";
      return {
        subject: t.oggetto_custom || `🔔 Nuova richiesta${t.priorita==="urgente"?" URGENTE":""} — ${t.titolo}`,
        html: baseLayout(`
          <h2 style="color:#111827;font-size:17px;">🔔 Nuova richiesta di intervento</h2>
          <div style="background:#FEF3C7;border-radius:8px;padding:16px;margin:16px 0;${urgenteBorder}">
            ${infoBox([
              {label:"Descrizione", value:t.titolo},
              {label:"Tipo", value:t.sottotipo||"Straordinaria"},
              {label:"Cliente", value:t.cliente||"—"},
              {label:"Asset", value:t.asset||"—"},
              {label:"Priorità", value:t.priorita||"media"},
              ...(t.causa_guasto?[{label:"Causa", value:t.causa_guasto}]:[]),
              ...(t.fermo_impianto==="true"?[{label:"Impianto", value:"⛔ FERMO"}]:[]),
            ])}
            ${t.note ? `<p style="font-size:13px;color:#374151;"><strong>Note:</strong> ${t.note}</p>` : ""}
          </div>
          ${t.corpo_custom ? `<p style="font-size:13px;color:#374151;">${t.corpo_custom}</p>` : ""}
          <p style="margin-top:16px;">${btn("Gestisci richiesta →", url, "#F59E0B", "#0D1B2A")}</p>
        `, tenantNome),
      };
    }

    // ── Richiesta approvata → cliente/richiedente ──────────────────────────
    case "richiesta_approvata":
      return {
        subject: t.oggetto_custom || `✅ Richiesta approvata — ${t.titolo}`,
        html: baseLayout(`
          <h2 style="color:#059669;font-size:17px;">✅ La tua richiesta è stata approvata</h2>
          <div style="background:#F0FDF4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
            ${infoBox([
              {label:"Intervento", value:t.titolo},
              {label:"Tecnico assegnato", value:t.operatore||"Da definire"},
              {label:"Data pianificata", value:t.data||"Da definire"},
              ...(t.durata?[{label:"Durata stimata", value:t.durata}]:[]),
            ])}
            ${t.nota_interna ? `<p style="font-size:13px;color:#374151;"><strong>Nota:</strong> ${t.nota_interna}</p>` : ""}
          </div>
          ${t.corpo_custom ? `<p style="font-size:13px;color:#374151;">${t.corpo_custom}</p>` : ""}
          <p style="margin-top:16px;">${btn("Visualizza →", url)}</p>
        `, tenantNome),
      };

    // ── Richiesta rifiutata → cliente/richiedente ──────────────────────────
    case "richiesta_rifiutata":
      return {
        subject: t.oggetto_custom || `❌ Richiesta non approvata — ${t.titolo}`,
        html: baseLayout(`
          <h2 style="color:#DC2626;font-size:17px;">La tua richiesta non è stata approvata</h2>
          <div style="background:#FEF2F2;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #DC2626;">
            ${infoBox([{label:"Richiesta", value:t.titolo}])}
            ${t.motivo ? `<p style="font-size:13px;color:#374151;"><strong>Motivo:</strong> ${t.motivo}</p>` : ""}
          </div>
          ${t.corpo_custom ? `<p style="font-size:13px;color:#374151;">${t.corpo_custom}</p>` : ""}
          <p style="font-size:12px;color:#6B7280;">Per chiarimenti contatta il team di manutenzione.</p>
        `, tenantNome),
      };

    // ── SLA in scadenza ────────────────────────────────────────────────────
    case "sla_scadenza":
      return {
        subject: t.oggetto_custom || `⚠️ SLA in scadenza — ${t.titolo}`,
        html: baseLayout(`
          <h2 style="color:#DC2626;font-size:17px;">⚠️ SLA in scadenza</h2>
          <div style="background:#FEF2F2;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #DC2626;">
            ${infoBox([
              {label:"Attività", value:t.titolo},
              {label:"Cliente", value:t.cliente||"—"},
              {label:"Ore rimanenti", value:t.ore_rimanenti+"h"},
              {label:"Priorità", value:t.priorita},
            ])}
          </div>
          ${t.corpo_custom ? `<p style="font-size:13px;">${t.corpo_custom}</p>` : ""}
          <p style="margin-top:16px;">${btn("Gestisci ora →", url, "#DC2626", "white")}</p>
        `, tenantNome),
      };

    // ── Scadenza normativa ─────────────────────────────────────────────────
    case "scadenza_normativa":
      return {
        subject: t.oggetto_custom || `📅 Scadenza normativa — ${t.titolo}`,
        html: baseLayout(`
          <h2 style="color:#92400E;font-size:17px;">📅 Scadenza normativa in avvicinamento</h2>
          <div style="background:#FEF3C7;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #F59E0B;">
            ${infoBox([
              {label:"Adempimento", value:t.titolo},
              {label:"Cliente", value:t.cliente||"—"},
              {label:"Scadenza", value:t.scadenza},
              {label:"Giorni rimanenti", value:t.giorni_rimanenti},
              ...(t.norma?[{label:"Riferimento", value:t.norma}]:[]),
            ])}
          </div>
          ${t.corpo_custom ? `<p style="font-size:13px;">${t.corpo_custom}</p>` : ""}
        `, tenantNome),
      };

    // ── Email custom generica ──────────────────────────────────────────────
    case "custom":
      if (!t.oggetto_custom || !t.corpo_custom) return null;
      return {
        subject: t.oggetto_custom,
        html: baseLayout(`<div style="font-size:13px;color:#374151;line-height:1.6;">${t.corpo_custom}</div>`, tenantNome),
      };

    default:
      return null;
  }
}

// ── Handler principale ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { tipo, destinatario, destinatari, dati, tenant_nome } = body;
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY non configurata" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = buildEmail(tipo, dati || {}, tenant_nome || "ManuMan");
    if (!email) {
      return new Response(JSON.stringify({ error: "Tipo email non riconosciuto: " + tipo }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supporta sia singolo destinatario che lista
    const toList: string[] = destinatari
      ? (Array.isArray(destinatari) ? destinatari : [destinatari])
      : (destinatario ? [destinatario] : []);

    if (!toList.length) {
      return new Response(JSON.stringify({ error: "Nessun destinatario" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mittente: usa quello custom se fornito, altrimenti default
    const from = (dati as Record<string,string>)?.mittente_custom
      ? `ManuMan <${(dati as Record<string,string>).mittente_custom}>`
      : "ManuMan <noreply@manutenzioni.app>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: toList, subject: email.subject, html: email.html }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Errore Resend");

    return new Response(JSON.stringify({ ok: true, id: data.id, to: toList }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
