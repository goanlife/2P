-- Migration: Schema iniziale (già applicato manualmente)
-- Questo file documenta lo stato iniziale del DB
-- NON verrà rieseguito se già applicato

-- piani
alter table if exists piani add column if not exists attivo boolean default true;

-- piano_assegnazioni
create table if not exists piano_assegnazioni (
  id          bigserial primary key,
  tenant_id   uuid references tenants(id) on delete cascade,
  piano_id    bigint references piani(id) on delete cascade,
  asset_id    bigint references assets(id) on delete set null,
  cliente_id  bigint references clienti(id) on delete set null,
  operatore_id bigint references operatori(id) on delete set null,
  data_inizio date,
  data_fine   date,
  attivo      boolean default true,
  user_id     uuid,
  created_at  timestamptz default now()
);
alter table piano_assegnazioni disable row level security;
