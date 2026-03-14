-- ManuMan Migration v001 — Schema completo
-- Tutte le tabelle dalla v1 alla v3

-- Clienti
create table if not exists clienti (
  id        bigserial primary key,
  rs        text not null,
  piva      text default '',
  contatto  text default '',
  tel       text default '',
  email     text default '',
  ind       text default '',
  settore   text default '',
  note      text default '',
  user_id   uuid references auth.users on delete cascade not null,
  created_at timestamptz default now()
);

-- Asset
create table if not exists assets (
  id         bigserial primary key,
  nome       text not null,
  tipo       text default '',
  cliente_id bigint references clienti on delete set null,
  ubicazione text default '',
  matricola  text default '',
  marca      text default '',
  modello    text default '',
  data_inst  date,
  stato      text default 'attivo',
  note       text default '',
  user_id    uuid references auth.users on delete cascade not null,
  created_at timestamptz default now()
);

-- Operatori (con tipo)
create table if not exists operatori (
  id      bigserial primary key,
  nome    text not null,
  spec    text default '',
  col     text default '#378ADD',
  tipo    text default 'fornitore',
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now()
);
alter table operatori add column if not exists tipo text default 'fornitore';

-- Associazione operatore ↔ siti visibili
create table if not exists operatore_siti (
  id           bigserial primary key,
  operatore_id bigint references operatori on delete cascade not null,
  cliente_id   bigint references clienti   on delete cascade not null,
  user_id      uuid references auth.users  on delete cascade not null,
  created_at   timestamptz default now(),
  unique(operatore_id, cliente_id)
);

-- Piani di manutenzione
create table if not exists piani (
  id           bigserial primary key,
  nome         text not null,
  descrizione  text default '',
  asset_id     bigint references assets    on delete set null,
  cliente_id   bigint references clienti   on delete set null,
  operatore_id bigint references operatori on delete set null,
  tipo         text default 'ordinaria',
  frequenza    text default 'mensile',
  durata       integer default 60,
  priorita     text default 'media',
  data_inizio  date,
  data_fine    date,
  attivo       boolean default true,
  user_id      uuid references auth.users on delete cascade not null,
  created_at   timestamptz default now()
);

-- Manutenzioni
create table if not exists manutenzioni (
  id           bigserial primary key,
  titolo       text not null,
  tipo         text default 'ordinaria',
  stato        text default 'pianificata',
  priorita     text default 'media',
  operatore_id bigint references operatori on delete set null,
  cliente_id   bigint references clienti   on delete set null,
  asset_id     bigint references assets    on delete set null,
  piano_id     bigint references piani     on delete set null,
  data         date,
  durata       integer default 60,
  note         text default '',
  user_id      uuid references auth.users on delete cascade not null,
  created_at   timestamptz default now()
);

-- Gruppi
create table if not exists gruppi (
  id          bigserial primary key,
  nome        text not null,
  descrizione text default '',
  col         text default '#378ADD',
  user_id     uuid references auth.users on delete cascade not null,
  created_at  timestamptz default now()
);

-- Utenti in un gruppo
create table if not exists gruppo_operatori (
  id           bigserial primary key,
  gruppo_id    bigint references gruppi    on delete cascade not null,
  operatore_id bigint references operatori on delete cascade not null,
  user_id      uuid references auth.users  on delete cascade not null,
  created_at   timestamptz default now(),
  unique(gruppo_id, operatore_id)
);

-- Siti in un gruppo
create table if not exists gruppo_siti (
  id         bigserial primary key,
  gruppo_id  bigint references gruppi   on delete cascade not null,
  cliente_id bigint references clienti  on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique(gruppo_id, cliente_id)
);

-- ── Row Level Security ──────────────────────────────────────────────────────
do $$ begin
  -- Abilita RLS su tutte le tabelle
  alter table if exists clienti          enable row level security;
  alter table if exists assets           enable row level security;
  alter table if exists operatori        enable row level security;
  alter table if exists operatore_siti   enable row level security;
  alter table if exists piani            enable row level security;
  alter table if exists manutenzioni     enable row level security;
  alter table if exists gruppi           enable row level security;
  alter table if exists gruppo_operatori enable row level security;
  alter table if exists gruppo_siti      enable row level security;
end $$;

-- Policy (ignora errore se già esistono)
do $$ begin
  create policy "own clienti"          on clienti          for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own assets"           on assets           for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own operatori"        on operatori        for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own operatore_siti"   on operatore_siti   for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own piani"            on piani            for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own manutenzioni"     on manutenzioni     for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own gruppi"           on gruppi           for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own gruppo_operatori" on gruppo_operatori for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own gruppo_siti"      on gruppo_siti      for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
