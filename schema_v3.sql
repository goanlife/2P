-- ============================================================
-- ManuMan — Aggiornamento v3: Gruppi
-- Esegui nel SQL Editor di Supabase
-- ============================================================

-- Gruppi
create table if not exists gruppi (
  id          bigserial primary key,
  nome        text not null,
  descrizione text default '',
  col         text default '#378ADD',
  user_id     uuid references auth.users on delete cascade not null,
  created_at  timestamptz default now()
);
alter table gruppi enable row level security;
create policy "own gruppi" on gruppi
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Operatori in un gruppo
create table if not exists gruppo_operatori (
  id           bigserial primary key,
  gruppo_id    bigint references gruppi    on delete cascade not null,
  operatore_id bigint references operatori on delete cascade not null,
  user_id      uuid references auth.users  on delete cascade not null,
  created_at   timestamptz default now(),
  unique(gruppo_id, operatore_id)
);
alter table gruppo_operatori enable row level security;
create policy "own gruppo_operatori" on gruppo_operatori
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Siti (clienti) in un gruppo
create table if not exists gruppo_siti (
  id         bigserial primary key,
  gruppo_id  bigint references gruppi   on delete cascade not null,
  cliente_id bigint references clienti  on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique(gruppo_id, cliente_id)
);
alter table gruppo_siti enable row level security;
create policy "own gruppo_siti" on gruppo_siti
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
