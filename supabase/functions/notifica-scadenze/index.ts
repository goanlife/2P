// Edge Function: notifica-scadenze
// Invocata ogni giorno via Supabase Cron (o webhook esterno)
// Manda email per: attività scadute, attività di domani, piani in scadenza

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.log("RESEND_API_KEY non configurata"); return; }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "ManuMan <noreply@tuodominio.it>", to, subject, html }),
  });
}

Deno.serve(async () => {
  const oggi = new Date().toISOString().split("T")[0];
  const domani = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const tra30gg = new Date(Date.now() + 30*86400000).toISOString().split("T")[0];

  // 1. Attività scadute (stato=pianificata, data < oggi)
  const { data: scadute } = await sb.from("manutenzioni")
    .select("*, operatori(nome,email), clienti(rs), assets(nome)")
    .eq("stato", "pianificata")
    .lt("data", oggi);

  // 2. Attività di domani
  const { data: domaniAtt } = await sb.from("manutenzioni")
    .select("*, operatori(nome,email), clienti(rs), assets(nome)")
    .eq("stato", "pianificata")
    .eq("data", domani);

  // 3. Assegnazioni piani in scadenza entro 30gg
  const { data: inScadenza } = await sb.from("piano_assegnazioni")
    .select("*, piani(nome), assets(nome), operatori(nome,email)")
    .lte("data_fine", tra30gg)
    .gte("data_fine", oggi)
    .eq("attivo", true);

  let emailCount = 0;

  // Raggruppa per operatore e manda un'unica email riassuntiva
  const byOperatore: Record<string, { email: string; nome: string; scadute: any[]; domani: any[]; pianisScadenza: any[] }> = {};

  const addToOp = (op: any, bucket: string, item: any) => {
    if (!op?.email) return;
    if (!byOperatore[op.email]) byOperatore[op.email] = { email: op.email, nome: op.nome, scadute: [], domani: [], pianisScadenza: [] };
    (byOperatore[op.email] as any)[bucket].push(item);
  };

  (scadute   || []).forEach(m => addToOp(m.operatori, "scadute",        m));
  (domaniAtt || []).forEach(m => addToOp(m.operatori, "domani",         m));
  (inScadenza|| []).forEach(a => addToOp(a.operatori, "pianisScadenza", a));

  for (const op of Object.values(byOperatore)) {
    if (!op.scadute.length && !op.domani.length && !op.pianisScadenza.length) continue;

    let html = `<h2>Ciao ${op.nome}! 👋</h2>`;

    if (op.scadute.length) {
      html += `<h3 style="color:#EF4444">⚠️ ${op.scadute.length} attività scadute</h3><ul>`;
      op.scadute.forEach((m:any) => html += `<li><b>${m.titolo}</b> — ${m.clienti?.rs||""} · ${m.assets?.nome||""} · scaduta il ${m.data}</li>`);
      html += "</ul>";
    }
    if (op.domani.length) {
      html += `<h3 style="color:#F59E0B">📅 ${op.domani.length} attività domani</h3><ul>`;
      op.domani.forEach((m:any) => html += `<li><b>${m.titolo}</b> — ${m.clienti?.rs||""} · ${m.assets?.nome||""} · ${m.durata}min</li>`);
      html += "</ul>";
    }
    if (op.pianisScadenza.length) {
      html += `<h3 style="color:#3B82F6">🔄 Piani in scadenza entro 30 giorni</h3><ul>`;
      op.pianisScadenza.forEach((a:any) => html += `<li><b>${a.piani?.nome||""}</b> — ${a.assets?.nome||""} · scade il ${a.data_fine}</li>`);
      html += "</ul>";
    }

    html += `<p style="color:#888;font-size:12px">— ManuMan · <a href="#">Vai all'app</a></p>`;

    await sendEmail(op.email, `ManuMan: ${op.scadute.length > 0 ? `⚠️ ${op.scadute.length} scadute` : `📅 Promemoria attività`}`, html);
    emailCount++;
  }

  return new Response(JSON.stringify({ ok: true, emailInviati: emailCount }), {
    headers: { "Content-Type": "application/json" },
  });
});
