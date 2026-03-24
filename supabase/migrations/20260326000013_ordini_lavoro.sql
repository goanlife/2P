-- ═══════════════════════════════════════════════════════════════════
-- Ordini di Lavoro (OdL) — contenitore di attività
-- Alternativa B: aggregazione per visita (operatore+giorno)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists ordini_lavoro (
  id            bigserial primary key,
  tenant_id     uuid references tenants(id) on delete cascade,
  piano_id      bigint references piani(id) on delete set null,
  cliente_id    bigint references clienti(id) on delete set null,
  operatore_id  bigint references operatori(id) on delete set null,
  numero        text,                            -- es. OdL-2025-001
  titolo        text not null,
  descrizione   text,
  stato         text default 'bozza'
    check (stato in ('bozza','confermato','in_corso','completato','annullato')),
  data_inizio   date not null,
  data_fine     date,                            -- supporto multi-giorno
  durata_stimata int,                            -- minuti totali (somma attività)
  note          text,
  created_by    uuid,
  created_at    timestamptz default now()
);

create index if not exists idx_odl_tenant   on ordini_lavoro(tenant_id);
create index if not exists idx_odl_piano    on ordini_lavoro(piano_id);
create index if not exists idx_odl_cliente  on ordini_lavoro(cliente_id);
create index if not exists idx_odl_data     on ordini_lavoro(data_inizio);
alter table ordini_lavoro disable row level security;

-- Collega le attività all'OdL (nullable: attività standalone non hanno OdL)
alter table manutenzioni add column if not exists odl_id bigint
  references ordini_lavoro(id) on delete set null;

create index if not exists idx_man_odl on manutenzioni(odl_id);
