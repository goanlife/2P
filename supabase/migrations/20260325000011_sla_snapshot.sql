-- ═══════════════════════════════════════════════════════════════════
-- C: Snapshot SLA alla chiusura intervento
-- D: campo per propagazione controllata alle attività attive
-- ═══════════════════════════════════════════════════════════════════

-- Snapshot del profilo SLA attivo al momento della chiusura
alter table manutenzioni
  add column if not exists sla_profilo_id bigint
  references sla_profili(id) on delete set null;

create index if not exists idx_man_sla_profilo on manutenzioni(sla_profilo_id)
  where sla_profilo_id is not null;
-- ═══════════════════════════════════════════════════════════════════
-- SLA snapshot su manutenzioni (opzione C)
-- Al momento della chiusura si congela il profilo SLA attivo
-- ═══════════════════════════════════════════════════════════════════
alter table manutenzioni
  add column if not exists sla_profilo_id bigint
  references sla_profili(id) on delete set null;
