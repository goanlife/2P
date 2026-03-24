-- ═══════════════════════════════════════════════════════════════════
-- PROPOSTA A: Asset Health Card + Template attività per tipo asset
-- ═══════════════════════════════════════════════════════════════════

-- 1. Colonne aggiuntive su assets (scheda tecnica estesa)
alter table assets add column if not exists ore_utilizzo   numeric(10,1) default 0;
alter table assets add column if not exists soglia_ore     numeric(10,1) default null; -- null = nessun trigger ore
alter table assets add column if not exists costo_acquisto numeric(12,2) default null;
alter table assets add column if not exists garanzia_al    date          default null;
alter table assets add column if not exists vita_utile_anni int          default null;
alter table assets add column if not exists specifiche_json jsonb        default null; -- es. {"potenza":"7.5kW","pressione":"10bar"}

-- 2. Template di manutenzione per tipo asset
create table if not exists asset_tipo_template (
  id            bigserial primary key,
  tenant_id     uuid references tenants(id) on delete cascade,
  tipo_asset    text not null,         -- deve corrispondere al campo assets.tipo
  nome          text not null,         -- nome del piano (es. "Revisione mensile pompa")
  descrizione   text,
  tipo_attivita text default 'ordinaria' check (tipo_attivita in ('ordinaria','straordinaria')),
  frequenza     text default 'mensile',
  durata        int  default 60,        -- minuti
  priorita      text default 'media',
  stima_costo   numeric(10,2) default null,
  attivo        boolean default true,
  created_at    timestamptz default now()
);
create index if not exists idx_template_tenant on asset_tipo_template(tenant_id);
create index if not exists idx_template_tipo   on asset_tipo_template(tipo_asset);
alter table asset_tipo_template disable row level security;

-- 3. Checklist passi specifici del template (riusa struttura piano_checklist_steps)
create table if not exists template_checklist_steps (
  id          bigserial primary key,
  template_id bigint references asset_tipo_template(id) on delete cascade,
  testo       text not null,
  obbligatorio boolean default false,
  ordine      int  default 0
);
alter table template_checklist_steps disable row level security;

-- 4. Ricambi previsti per template (cosa serve per questo tipo di intervento)
create table if not exists template_ricambi (
  id           bigserial primary key,
  template_id  bigint references asset_tipo_template(id) on delete cascade,
  ricambio_id  bigint references ricambi(id) on delete set null,
  nome_libero  text,                  -- se ricambio non è a catalogo
  quantita     numeric(10,2) default 1,
  note         text
);
alter table template_ricambi disable row level security;

-- 5. Collega piani ai template (opzionale: un piano può essere generato da un template)
alter table piani add column if not exists template_id bigint references asset_tipo_template(id) on delete set null;
alter table piani add column if not exists stima_costo numeric(10,2) default null;
-- trigger workflow Tue Mar 24 09:41:57 UTC 2026
