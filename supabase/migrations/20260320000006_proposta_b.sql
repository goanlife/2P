-- ═══════════════════════════════════════════════════
-- PROPOSTA B: Gestione ordini strutturata
-- ═══════════════════════════════════════════════════

-- 1. Stato "richiesta" e "approvata" su manutenzioni
--    (già gestito dal campo stato - aggiungiamo solo i nuovi valori via applicazione)

-- 2. Commenti/note interne per attività
create table if not exists attivita_commenti (
  id              bigserial primary key,
  manutenzione_id bigint references manutenzioni(id) on delete cascade,
  tenant_id       uuid references tenants(id) on delete cascade,
  autore_id       bigint references operatori(id) on delete set null,
  autore_nome     text not null,
  testo           text not null,
  tipo            text default 'nota' check (tipo in ('nota','approvazione','rifiuto','richiesta')),
  created_at      timestamptz default now()
);
create index if not exists idx_commenti_man on attivita_commenti(manutenzione_id);
alter table attivita_commenti disable row level security;

-- 3. SLA configurazione per tenant
create table if not exists sla_config (
  id              bigserial primary key,
  tenant_id       uuid references tenants(id) on delete cascade,
  priorita        text not null check (priorita in ('bassa','media','alta','urgente')),
  ore_risposta    int default 24,   -- entro quando deve essere presa in carico
  ore_risoluzione int default 72,   -- entro quando deve essere completata
  created_at      timestamptz default now(),
  unique(tenant_id, priorita)
);
alter table sla_config disable row level security;

-- SLA default
create or replace function init_sla_defaults(p_tenant_id uuid)
returns void language plpgsql as $$
begin
  insert into sla_config (tenant_id, priorita, ore_risposta, ore_risoluzione) values
    (p_tenant_id, 'bassa',    72,  168),
    (p_tenant_id, 'media',    24,  72),
    (p_tenant_id, 'alta',     8,   24),
    (p_tenant_id, 'urgente',  2,   8)
  on conflict (tenant_id, priorita) do nothing;
end;
$$;

-- 4. Ordini di acquisto ricambi
create table if not exists ordini_acquisto (
  id              bigserial primary key,
  tenant_id       uuid references tenants(id) on delete cascade,
  numero          text,             -- numero ordine progressivo
  fornitore       text,
  stato           text default 'bozza' check (stato in ('bozza','inviato','confermato','ricevuto','annullato')),
  note            text,
  data_ordine     date,
  data_attesa     date,
  totale          numeric(10,2),
  created_by      bigint references operatori(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists ordini_acquisto_righe (
  id              bigserial primary key,
  ordine_id       bigint references ordini_acquisto(id) on delete cascade,
  ricambio_id     bigint references ricambi(id) on delete set null,
  nome_libero     text,
  quantita        numeric(10,2) default 1,
  prezzo_unitario numeric(10,2),
  note            text
);

create index if not exists idx_ordini_tenant on ordini_acquisto(tenant_id);
alter table ordini_acquisto disable row level security;
alter table ordini_acquisto_righe disable row level security;

-- 5. Soglia minima ricambi (per trigger riordino)
alter table ricambi add column if not exists soglia_minima int default 0;
alter table ricambi add column if not exists quantita_stock int default 0;

-- 6. Tariffa oraria operatori (per calcolo costo intervento)
alter table operatori add column if not exists tariffa_ora numeric(10,2) default 0;
