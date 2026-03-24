-- ═══════════════════════════════════════════════════════════════════
-- Scadenzario normativo — adempimenti obbligatori per legge
-- Separati dalla manutenzione ordinaria
-- ═══════════════════════════════════════════════════════════════════
create table if not exists scadenze_normative (
  id                      bigserial primary key,
  tenant_id               uuid references tenants(id) on delete cascade,
  cliente_id              bigint references clienti(id) on delete cascade,
  asset_id                bigint references assets(id) on delete set null,
  titolo                  text not null,
  descrizione             text,
  riferimento_normativo   text,       -- es. "D.Lgs 81/2008", "DPR 462/01"
  categoria               text default 'altro'
    check (categoria in ('antincendio','impianti_elettrici','ascensori',
                         'pressione','sicurezza_lavoro','ambientale','altro')),
  scadenza                date not null,
  ultimo_adempimento      date,
  periodicita_mesi        int,        -- se ricorrente, ogni N mesi
  stato                   text default 'da_fare'
    check (stato in ('da_fare','in_corso','completato','scaduto')),
  responsabile_id         bigint references operatori(id) on delete set null,
  alert_giorni            int default 30,  -- avvisa N giorni prima
  note                    text,
  created_at              timestamptz default now()
);
create index if not exists idx_scad_tenant  on scadenze_normative(tenant_id);
create index if not exists idx_scad_cliente on scadenze_normative(cliente_id);
create index if not exists idx_scad_data    on scadenze_normative(scadenza);
alter table scadenze_normative disable row level security;
