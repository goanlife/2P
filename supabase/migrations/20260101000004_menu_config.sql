-- Migration: Configurazione menu dinamico per gruppo
create table if not exists menu_config (
  id          bigserial primary key,
  tenant_id   uuid references tenants(id) on delete cascade,
  gruppo_id   bigint references gruppi(id) on delete cascade,
  tab_id      text not null,
  visibile    boolean default true,
  ruolo       text,
  ordine      int default 0,
  created_at  timestamptz default now(),
  unique(tenant_id, gruppo_id, tab_id)
);

create index if not exists idx_menu_config_tenant on menu_config(tenant_id);
create index if not exists idx_menu_config_gruppo on menu_config(gruppo_id);
alter table menu_config disable row level security;
