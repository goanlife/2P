-- Migration: Gestione ricambi
create table if not exists ricambi (
  id          bigserial primary key,
  tenant_id   uuid references tenants(id) on delete cascade,
  nome        text not null,
  codice      text,
  unita       text default 'pz',
  prezzo      numeric(10,2),
  categoria   text,
  note        text,
  created_at  timestamptz default now()
);

create table if not exists intervento_ricambi (
  id               bigserial primary key,
  manutenzione_id  bigint references manutenzioni(id) on delete cascade,
  ricambio_id      bigint references ricambi(id) on delete set null,
  nome_libero      text,
  quantita         numeric(10,2) default 1,
  prezzo_unitario  numeric(10,2),
  note             text,
  created_at       timestamptz default now()
);

create index if not exists idx_ricambi_tenant on ricambi(tenant_id);
create index if not exists idx_int_ricambi_man on intervento_ricambi(manutenzione_id);
alter table ricambi disable row level security;
alter table intervento_ricambi disable row level security;
