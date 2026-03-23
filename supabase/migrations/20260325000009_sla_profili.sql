-- ═══════════════════════════════════════════════════════════════════
-- SLA Profili: contenitori SLA associabili ai clienti
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tabella profili SLA (contenitore con nome)
create table if not exists sla_profili (
  id          bigserial primary key,
  tenant_id   uuid references tenants(id) on delete cascade,
  nome        text not null,
  descrizione text,
  colore      text default '#3B82F6',
  is_default  boolean default false,  -- profilo usato se il cliente non ne ha uno
  created_at  timestamptz default now()
);
create index if not exists idx_sla_profili_tenant on sla_profili(tenant_id);
alter table sla_profili disable row level security;

-- 2. Configurazione SLA per profilo (per priorità)
create table if not exists sla_profilo_config (
  id              bigserial primary key,
  profilo_id      bigint references sla_profili(id) on delete cascade,
  priorita        text not null check (priorita in ('bassa','media','alta','urgente')),
  ore_risposta    int default 24,
  ore_risoluzione int default 72,
  unique(profilo_id, priorita)
);
alter table sla_profilo_config disable row level security;

-- 3. Collega cliente a un profilo SLA
alter table clienti add column if not exists sla_profilo_id bigint
  references sla_profili(id) on delete set null;

-- 4. Migra i dati esistenti da sla_config → profilo default "Standard"
-- (eseguito solo se esistono record in sla_config)
-- Ogni tenant ottiene un profilo "Standard" con le sue config attuali
insert into sla_profili (tenant_id, nome, descrizione, is_default)
  select distinct tenant_id, 'Standard', 'Profilo SLA predefinito', true
  from sla_config
  where tenant_id is not null
  on conflict do nothing;

insert into sla_profilo_config (profilo_id, priorita, ore_risposta, ore_risoluzione)
  select p.id, s.priorita, s.ore_risposta, s.ore_risoluzione
  from sla_config s
  join sla_profili p on p.tenant_id = s.tenant_id and p.is_default = true
  on conflict (profilo_id, priorita) do nothing;
