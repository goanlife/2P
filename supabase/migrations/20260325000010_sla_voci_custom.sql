-- ═══════════════════════════════════════════════════════════════════
-- SLA: voci custom libere nel contenitore
-- Estende sla_profilo_config con nome libero e priorità opzionale
-- ═══════════════════════════════════════════════════════════════════

-- 1. Aggiungi nome libero a ogni voce SLA
alter table sla_profilo_config add column if not exists nome text;

-- 2. Aggiungi ore_risposta_label e ore_risoluzione_label (per display)
alter table sla_profilo_config add column if not exists note text;

-- 3. Rendi priorita opzionale (una voce SLA può non legarsi a una priorità)
alter table sla_profilo_config alter column priorita drop not null;
alter table sla_profilo_config alter column priorita drop default;

-- 4. Rimuovi il vincolo unique (priorita, profilo_id) per permettere N voci
--    e ricrealo come partial index solo quando priorita non è null
alter table sla_profilo_config drop constraint if exists sla_profilo_config_profilo_id_priorita_key;
create unique index if not exists idx_sla_config_priorita_unica
  on sla_profilo_config(profilo_id, priorita)
  where priorita is not null;

-- 5. Aggiungi ordine per visualizzazione
alter table sla_profilo_config add column if not exists ordine int default 0;

-- 6. Popola nome per le voci esistenti (retrocompatibilità)
update sla_profilo_config
set nome = case priorita
  when 'urgente' then 'Urgente'
  when 'alta'    then 'Alta priorità'
  when 'media'   then 'Media priorità'
  when 'bassa'   then 'Bassa priorità'
  else 'SLA generico'
end
where nome is null;
