-- Migration: Checklist e cadenza
alter table if exists manutenzioni add column if not exists assegnazione_id bigint references piano_assegnazioni(id) on delete set null;
alter table if exists manutenzioni add column if not exists numero_intervento int default 1;

create table if not exists piano_checklist (
  id                bigserial primary key,
  piano_id          bigint references piani(id) on delete cascade,
  ordine            int default 0,
  testo             text not null,
  obbligatorio      boolean default false,
  ogni_n_interventi int default 1,
  created_at        timestamptz default now()
);

create table if not exists manutenzione_checklist (
  id               bigserial primary key,
  manutenzione_id  bigint references manutenzioni(id) on delete cascade,
  step_id          bigint references piano_checklist(id) on delete cascade,
  completato       boolean default false,
  note             text,
  completato_at    timestamptz,
  created_at       timestamptz default now(),
  unique(manutenzione_id, step_id)
);

alter table piano_checklist disable row level security;
alter table manutenzione_checklist disable row level security;
