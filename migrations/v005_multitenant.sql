-- ═══════════════════════════════════════════════════════════
-- v005 — Multi-tenant
-- Esegui su Supabase SQL Editor (una volta sola)
-- ═══════════════════════════════════════════════════════════

-- 1. Tabella tenants (aziende)
create table if not exists tenants (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  slug       text unique,
  logo_url   text,
  created_at timestamptz default now()
);

-- 2. Associazione utente ↔ tenant  
create table if not exists tenant_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  tenant_id  uuid references tenants(id) on delete cascade,
  ruolo      text default 'admin', -- admin | membro
  created_at timestamptz default now(),
  unique(user_id, tenant_id)
);

-- 3. Codici invito (per far entrare altri utenti nella stessa azienda)
create table if not exists tenant_inviti (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references tenants(id) on delete cascade,
  codice     text unique not null default upper(substr(gen_random_uuid()::text, 1, 8)),
  usato      boolean default false,
  created_at timestamptz default now()
);

-- 4. Aggiungi tenant_id a tutte le tabelle esistenti
alter table clienti      add column if not exists tenant_id uuid references tenants(id);
alter table assets       add column if not exists tenant_id uuid references tenants(id);
alter table operatori    add column if not exists tenant_id uuid references tenants(id);
alter table piani        add column if not exists tenant_id uuid references tenants(id);
alter table manutenzioni add column if not exists tenant_id uuid references tenants(id);
alter table gruppi       add column if not exists tenant_id uuid references tenants(id);
alter table allegati     add column if not exists tenant_id uuid references tenants(id);
alter table log_attivita add column if not exists tenant_id uuid references tenants(id);

-- 5. Indici per performance
create index if not exists idx_clienti_tenant     on clienti(tenant_id);
create index if not exists idx_assets_tenant      on assets(tenant_id);
create index if not exists idx_operatori_tenant   on operatori(tenant_id);
create index if not exists idx_piani_tenant       on piani(tenant_id);
create index if not exists idx_manutenzioni_tenant on manutenzioni(tenant_id);
create index if not exists idx_gruppi_tenant      on gruppi(tenant_id);
create index if not exists idx_tu_user            on tenant_users(user_id);
create index if not exists idx_tu_tenant          on tenant_users(tenant_id);

-- 6. Funzione helper: tenant_id dell'utente corrente
create or replace function get_my_tenant_id()
returns uuid language sql security definer stable as $$
  select tenant_id from tenant_users where user_id = auth.uid() limit 1;
$$;

-- 7. Abilita RLS
alter table tenants       enable row level security;
alter table tenant_users  enable row level security;
alter table tenant_inviti enable row level security;
alter table clienti       enable row level security;
alter table assets        enable row level security;
alter table operatori     enable row level security;
alter table piani         enable row level security;
alter table manutenzioni  enable row level security;
alter table gruppi        enable row level security;
alter table allegati      enable row level security;
alter table log_attivita  enable row level security;

-- 8. Policy tenants
drop policy if exists "ten_sel"  on tenants;
create policy "ten_sel"  on tenants for select using (id = get_my_tenant_id());
drop policy if exists "ten_ins"  on tenants;
create policy "ten_ins"  on tenants for insert with check (true);
drop policy if exists "ten_upd"  on tenants;
create policy "ten_upd"  on tenants for update using (id = get_my_tenant_id());

-- 9. Policy tenant_users
drop policy if exists "tu_sel" on tenant_users;
create policy "tu_sel" on tenant_users
  for select using (tenant_id = get_my_tenant_id() or user_id = auth.uid());
drop policy if exists "tu_ins" on tenant_users;
create policy "tu_ins" on tenant_users for insert with check (true);

-- 10. Policy tenant_inviti
drop policy if exists "inv_sel" on tenant_inviti;
create policy "inv_sel" on tenant_inviti for select using (true);
drop policy if exists "inv_ins" on tenant_inviti;
create policy "inv_ins" on tenant_inviti
  for insert with check (tenant_id = get_my_tenant_id());
drop policy if exists "inv_upd" on tenant_inviti;
create policy "inv_upd" on tenant_inviti for update using (true);

-- 11. Policy tabelle dati (RLS filtra automaticamente per tenant)
do $$
declare t text;
begin
  foreach t in array array['clienti','assets','operatori','piani',
    'manutenzioni','gruppi','allegati','log_attivita']
  loop
    execute format('drop policy if exists "d_sel" on %I', t);
    execute format('create policy "d_sel" on %I for select
      using (tenant_id = get_my_tenant_id())', t);
    execute format('drop policy if exists "d_ins" on %I', t);
    execute format('create policy "d_ins" on %I for insert
      with check (tenant_id = get_my_tenant_id())', t);
    execute format('drop policy if exists "d_upd" on %I', t);
    execute format('create policy "d_upd" on %I for update
      using (tenant_id = get_my_tenant_id())', t);
    execute format('drop policy if exists "d_del" on %I', t);
    execute format('create policy "d_del" on %I for delete
      using (tenant_id = get_my_tenant_id())', t);
  end loop;
end $$;

-- 12. Migra dati esistenti: crea un tenant per ogni user_id già presente
-- (se hai già dati nel DB, questo li aggrega per utente)
do $$
declare uid uuid;
begin
  for uid in select distinct user_id from operatori where tenant_id is null and user_id is not null
  loop
    declare tid uuid;
    begin
      insert into tenants(nome) values('Azienda') returning id into tid;
      insert into tenant_users(user_id, tenant_id, ruolo) values(uid, tid, 'admin');
      update clienti      set tenant_id = tid where user_id = uid and tenant_id is null;
      update assets       set tenant_id = tid where user_id = uid and tenant_id is null;
      update operatori    set tenant_id = tid where user_id = uid and tenant_id is null;
      update piani        set tenant_id = tid where user_id = uid and tenant_id is null;
      update manutenzioni set tenant_id = tid where user_id = uid and tenant_id is null;
      update gruppi       set tenant_id = tid where user_id = uid and tenant_id is null;
    end;
  end loop;
end $$;

