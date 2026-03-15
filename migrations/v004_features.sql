-- ============================================================
-- ManuMan Migration v4 — Features 1-12
-- Esegui nel SQL Editor di Supabase
-- ============================================================

-- Feature 3: Firma e note chiusura intervento
alter table manutenzioni add column if not exists note_chiusura text default '';
alter table manutenzioni add column if not exists ore_effettive numeric(5,2);
alter table manutenzioni add column if not exists parti_usate text default '';
alter table manutenzioni add column if not exists firma_svg text default '';
alter table manutenzioni add column if not exists chiuso_at timestamptz;

-- Feature 6: Eccezioni piano (salta date specifiche)
create table if not exists piano_eccezioni (
  id         bigserial primary key,
  piano_id   bigint references piani on delete cascade not null,
  data_skip  date not null,
  motivo     text default '',
  user_id    uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique(piano_id, data_skip)
);
alter table piano_eccezioni enable row level security;
do $$ begin
  create policy "own piano_eccezioni" on piano_eccezioni
    for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;

-- Feature 7: Log attività / storico modifiche
create table if not exists log_attivita (
  id             bigserial primary key,
  entita_tipo    text not null,
  entita_id      bigint not null,
  azione         text not null,
  dettagli       jsonb default '{}',
  operatore_nome text default '',
  user_id        uuid references auth.users on delete cascade not null,
  created_at     timestamptz default now()
);
alter table log_attivita enable row level security;
do $$ begin
  create policy "own log_attivita" on log_attivita
    for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
exception when duplicate_object then null; end $$;
