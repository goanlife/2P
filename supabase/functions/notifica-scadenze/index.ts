// Edge Function: notifica-scadenze (v2 — con SLA)
// Invocata ogni giorno via Supabase Cron
// Manda email per: attività scadute, domani, SLA in scadenza, piani in scadenza

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL        = Deno.env.get("APP_URL") ?? "https://2-p.vercel.app";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.log("RESEND_API_KEY non configurata — skip email"); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "ManuMan <noreply@manumanapp.it>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
  return res.ok;
}

function emailLayout(content: string, title: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;background:#F8FAFC;margin:0;padding:20px;}
  .card{background:white;border-radius:12px;padding:24px 28px;max-width:600px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.08);}
  h1{font-size:20px;margin:0 0 4px;color:#0D1B2A;}
  .sub{font-size:13px;color:#64748B;margin:0 0 20px;}
  h3{font-size:14px;margin:16px 0 8px;}
  ul{margin:0;padding-left:18px;}li{margin:4px 0;font-size:13px;line-height:1.5;}
  .btn{display:inline-block;background:#F59E0B;color:#0D1B2A;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;margin-top:16px;}
  .footer{font-size:11px;color:#94A3B8;margin-top:20px;border-top:1px solid #E2E8F0;padding-top:12px;}
</style></head><body>
<div class="card">
  <h1>🔧 ManuMan</h1>
  <p class="sub">${title}</p>
  ${content}
  <a href="${APP_URL}" class="btn">Apri ManuMan →</a>
  <div class="footer">Ricevi questa email perché sei un operatore attivo su ManuMan.<br>Per disattivare le notifiche contatta il tuo amministratore.</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  const oggi = new Date().toISOString().split("T")[0];
  const domani = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const tra7gg = new Date(Date.now() + 7*86400000).toISOString().split("T")[0];
  const tra30gg = new Date(Date.now() + 30*86400000).toISOString().split("T")[0];

  // Carica configurazioni SLA per tutti i tenant
  const { data: slaConfigs } = await sb.from("sla_config").select("*");
  const SLA_DEFAULT: Record<string, number> = { bassa:168, media:72, alta:24, urgente:8 };

  const getSlaOre = (tenantId: string, priorita: string) => {
    const cfg = slaConfigs?.find(s => s.tenant_id === tenantId && s.priorita === priorita);
    return cfg?.ore_risoluzione ?? SLA_DEFAULT[priorita] ?? 72;
  };

  // 1. Attività scadute
  const { data: scadute } = await sb.from("manutenzioni")
    .select("*, operatori(nome,email), clienti(rs), assets(nome), tenant_id")
    .eq("stato", "pianificata").lt("data", oggi);

  // 2. Attività di domani
  const { data: domaniAtt } = await sb.from("manutenzioni")
    .select("*, operatori(nome,email), clienti(rs), assets(nome)")
    .eq("stato", "pianificata").eq("data", domani);

  // 3. SLA in scadenza nelle prossime 4 ore (attività inCorso o pianificate urgenti)
  const { data: attive } = await sb.from("manutenzioni")
    .select("*, operatori(nome,email), clienti(rs), assets(nome), tenant_id")
    .in("stato", ["pianificata", "inCorso"])
    .not("created_at", "is", null);

  const slaInScadenza: any[] = [];
  const now = Date.now();
  (attive || []).forEach(m => {
    const oreMax = getSlaOre(m.tenant_id, m.priorita);
    const creato = new Date(m.created_at).getTime();
    const scadeSla = creato + oreMax * 3600000;
    const oreRimaste = (scadeSla - now) / 3600000;
    // Notifica se SLA scade nelle prossime 4 ore
    if (oreRimaste > 0 && oreRimaste <= 4) {
      slaInScadenza.push({ ...m, oreRimaste: Math.round(oreRimaste * 10) / 10 });
    }
  });

  // 4. Piani in scadenza entro 30gg
  const { data: inScadenza } = await sb.from("piano_assegnazioni")
    .select("*, piani(nome), assets(nome), operatori(nome,email)")
    .lte("data_fine", tra30gg).gte("data_fine", oggi).eq("attivo", true);

  let emailCount = 0;
  type OpBucket = { email: string; nome: string; scadute: any[]; domani: any[]; sla: any[]; piani: any[] };
  const byOp: Record<string, OpBucket> = {};

  const add = (op: any, bucket: keyof Omit<OpBucket,"email"|"nome">, item: any) => {
    if (!op?.email) return;
    if (!byOp[op.email]) byOp[op.email] = { email:op.email, nome:op.nome, scadute:[], domani:[], sla:[], piani:[] };
    byOp[op.email][bucket].push(item);
  };

  (scadute      || []).forEach(m => add(m.operatori, "scadute", m));
  (domaniAtt    || []).forEach(m => add(m.operatori, "domani",  m));
  (slaInScadenza|| []).forEach(m => add(m.operatori, "sla",     m));
  (inScadenza   || []).forEach(a => add(a.operatori, "piani",   a));

  for (const op of Object.values(byOp)) {
    if (!op.scadute.length && !op.domani.length && !op.sla.length && !op.piani.length) continue;

    let content = `<p style="font-size:14px">Ciao <strong>${op.nome}</strong>, ecco il riepilogo delle tue attività:</p>`;

    if (op.sla.length) {
      content += `<h3 style="color:#DC2626">🔴 ${op.sla.length} SLA in scadenza entro 4 ore</h3><ul>`;
      op.sla.forEach((m:any) => content += `<li><b>${m.titolo}</b> (${m.priorita}) — ${m.clienti?.rs||""} · ${m.oreRimaste}h rimaste</li>`);
      content += "</ul>";
    }
    if (op.scadute.length) {
      content += `<h3 style="color:#EF4444">⚠️ ${op.scadute.length} attività scadute</h3><ul>`;
      op.scadute.forEach((m:any) => content += `<li><b>${m.titolo}</b> — ${m.clienti?.rs||""} · ${m.assets?.nome||""} · ${m.data}</li>`);
      content += "</ul>";
    }
    if (op.domani.length) {
      content += `<h3 style="color:#F59E0B">📅 ${op.domani.length} attività per domani</h3><ul>`;
      op.domani.forEach((m:any) => content += `<li><b>${m.titolo}</b> — ${m.clienti?.rs||""} · ${m.assets?.nome||""} · ${m.durata}min</li>`);
      content += "</ul>";
    }
    if (op.piani.length) {
      content += `<h3 style="color:#3B82F6">🔄 Piani in scadenza entro 30 giorni</h3><ul>`;
      op.piani.forEach((a:any) => content += `<li><b>${a.piani?.nome||""}</b> — ${a.assets?.nome||""} · scade il ${a.data_fine}</li>`);
      content += "</ul>";
    }

    const subjectPrefix = op.sla.length > 0 ? `🔴 SLA in scadenza!` :
                          op.scadute.length > 0 ? `⚠️ ${op.scadute.length} attività scadute` :
                          `📅 Promemoria: ${op.domani.length} attività domani`;

    const ok = await sendEmail(op.email, `ManuMan — ${subjectPrefix}`, emailLayout(content, "Riepilogo attività"));
    if (ok) emailCount++;
  }

  return new Response(JSON.stringify({
    ok: true,
    emailInviati: emailCount,
    stats: {
      scadute: scadute?.length ?? 0,
      domani: domaniAtt?.length ?? 0,
      slaInScadenza: slaInScadenza.length,
      pianisScadenza: inScadenza?.length ?? 0,
    }
  }), { headers: { "Content-Type": "application/json" } });
});
