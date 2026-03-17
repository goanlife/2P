-- Migration di test: aggiunge colonna priorita_cliente su manutenzioni
-- e indice per performance sulle query per data

-- Colonna per note visibili al cliente nel portale
alter table manutenzioni add column if not exists note_cliente text;

-- Indice su data per query calendario più veloci
create index if not exists idx_manutenzioni_data 
  on manutenzioni(data) 
  where stato != 'completata';

-- Indice su tenant_id + data per query multi-tenant
create index if not exists idx_manutenzioni_tenant_data 
  on manutenzioni(tenant_id, data);
