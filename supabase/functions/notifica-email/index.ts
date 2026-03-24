// Supabase Edge Function — invio email tramite Resend
// Deploy: supabase functions deploy notifica-email
// Env required: RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tipo, destinatario, dati } = await req.json();
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY non configurata" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Genera il contenuto email in base al tipo
    let subject = "";
    let html = "";

    if (tipo === "odl_assegnato") {
      subject = `📋 Nuovo Ordine di Lavoro — ${dati.numero}`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0D1B2A;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="color:#F59E0B;margin:0;font-size:20px;">ManuMan</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <h2 style="color:#111827;font-size:18px;">Ti è stato assegnato un Ordine di Lavoro</h2>
            <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>OdL:</strong> ${dati.numero}</p>
              <p style="margin:4px 0;"><strong>Titolo:</strong> ${dati.titolo}</p>
              <p style="margin:4px 0;"><strong>Cliente:</strong> ${dati.cliente || "—"}</p>
              <p style="margin:4px 0;"><strong>Data:</strong> ${dati.data_inizio}</p>
              <p style="margin:4px 0;"><strong>Attività:</strong> ${dati.n_attivita || 0}</p>
              <p style="margin:4px 0;"><strong>Durata stimata:</strong> ${dati.durata_ore || "—"}h</p>
            </div>
            ${dati.url ? `<a href="${dati.url}" style="display:inline-block;background:#F59E0B;color:#0D1B2A;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Apri ManuMan →</a>` : ""}
          </div>
        </div>`;
    }

    else if (tipo === "intervento_completato") {
      subject = `✅ Intervento completato — ${dati.titolo}`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0D1B2A;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="color:#F59E0B;margin:0;font-size:20px;">ManuMan</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <h2 style="color:#059669;font-size:18px;">✅ Intervento completato</h2>
            <div style="background:#F0FDF4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669;">
              <p style="margin:4px 0;"><strong>Attività:</strong> ${dati.titolo}</p>
              <p style="margin:4px 0;"><strong>Tecnico:</strong> ${dati.tecnico || "—"}</p>
              <p style="margin:4px 0;"><strong>Chiuso il:</strong> ${dati.chiuso_at}</p>
              ${dati.ore_effettive ? `<p style="margin:4px 0;"><strong>Ore effettive:</strong> ${dati.ore_effettive}h</p>` : ""}
              ${dati.note_chiusura ? `<p style="margin:8px 0 4px;"><strong>Note:</strong></p><p style="margin:0;color:#374151;">${dati.note_chiusura}</p>` : ""}
            </div>
          </div>
        </div>`;
    }

    else if (tipo === "sla_scadenza") {
      subject = `⚠️ SLA in scadenza — ${dati.titolo}`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0D1B2A;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="color:#F59E0B;margin:0;font-size:20px;">ManuMan</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <h2 style="color:#DC2626;font-size:18px;">⚠️ SLA in scadenza</h2>
            <div style="background:#FEF2F2;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #DC2626;">
              <p style="margin:4px 0;"><strong>Attività:</strong> ${dati.titolo}</p>
              <p style="margin:4px 0;"><strong>Cliente:</strong> ${dati.cliente || "—"}</p>
              <p style="margin:4px 0;"><strong>Ore rimanenti:</strong> ${dati.ore_rimanenti}h</p>
              <p style="margin:4px 0;"><strong>Priorità:</strong> ${dati.priorita}</p>
            </div>
            ${dati.url ? `<a href="${dati.url}" style="display:inline-block;background:#DC2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Gestisci ora →</a>` : ""}
          </div>
        </div>`;
    }

    else if (tipo === "scadenza_normativa") {
      subject = `📅 Scadenza normativa — ${dati.titolo}`;
      html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0D1B2A;padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="color:#F59E0B;margin:0;font-size:20px;">ManuMan</h1>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <h2 style="color:#92400E;font-size:18px;">📅 Scadenza normativa in avvicinarsi</h2>
            <div style="background:#FEF3C7;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #F59E0B;">
              <p style="margin:4px 0;"><strong>Adempimento:</strong> ${dati.titolo}</p>
              <p style="margin:4px 0;"><strong>Cliente:</strong> ${dati.cliente || "—"}</p>
              <p style="margin:4px 0;"><strong>Scadenza:</strong> ${dati.scadenza}</p>
              <p style="margin:4px 0;"><strong>Giorni rimanenti:</strong> ${dati.giorni_rimanenti}</p>
              ${dati.norma ? `<p style="margin:4px 0;"><strong>Riferimento:</strong> ${dati.norma}</p>` : ""}
            </div>
          </div>
        </div>`;
    }

    if (!subject) {
      return new Response(JSON.stringify({ error: "Tipo email non riconosciuto: " + tipo }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invia via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "ManuMan <noreply@manutenzioni.app>",
        to: [destinatario],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Errore Resend");

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
