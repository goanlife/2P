// migrate.js — esegui con: node migrate.js
// Applica tutte le migrazioni ManuMan al tuo progetto Supabase

const SUPABASE_URL = "https://nnsylkjahuhttwajuxls.supabase.co";
const SERVICE_KEY  = "INCOLLA_QUI_LA_SERVICE_ROLE_KEY"; // vedi istruzioni sotto

const migrations = [
  {
    name: "v2 — campo tipo su operatori",
    sql: `alter table operatori add column if not exists tipo text default 'fornitore';`
  },
  {
    name: "v2 — tabella operatore_siti",
    sql: `
      create table if not exists operatore_siti (
        id           bigserial primary key,
        operatore_id bigint references operatori on delete cascade not null,
        cliente_id   bigint references clienti   on delete cascade not null,
        user_id      uuid references auth.users  on delete cascade not null,
        created_at   timestamptz default now(),
        unique(operatore_id, cliente_id)
      );
      alter table operatore_siti enable row level security;
      create policy if not exists "own operatore_siti" on operatore_siti
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    `
  },
  {
    name: "v3 — tabella gruppi",
    sql: `
      create table if not exists gruppi (
        id          bigserial primary key,
        nome        text not null,
        descrizione text default '',
        col         text default '#378ADD',
        user_id     uuid references auth.users on delete cascade not null,
        created_at  timestamptz default now()
      );
      alter table gruppi enable row level security;
      create policy if not exists "own gruppi" on gruppi
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    `
  },
  {
    name: "v3 — tabella gruppo_operatori",
    sql: `
      create table if not exists gruppo_operatori (
        id           bigserial primary key,
        gruppo_id    bigint references gruppi    on delete cascade not null,
        operatore_id bigint references operatori on delete cascade not null,
        user_id      uuid references auth.users  on delete cascade not null,
        created_at   timestamptz default now(),
        unique(gruppo_id, operatore_id)
      );
      alter table gruppo_operatori enable row level security;
      create policy if not exists "own gruppo_operatori" on gruppo_operatori
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    `
  },
  {
    name: "v3 — tabella gruppo_siti",
    sql: `
      create table if not exists gruppo_siti (
        id         bigserial primary key,
        gruppo_id  bigint references gruppi   on delete cascade not null,
        cliente_id bigint references clienti  on delete cascade not null,
        user_id    uuid references auth.users on delete cascade not null,
        created_at timestamptz default now(),
        unique(gruppo_id, cliente_id)
      );
      alter table gruppo_siti enable row level security;
      create policy if not exists "own gruppo_siti" on gruppo_siti
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    `
  },
];

async function runMigrations() {
  console.log("🔧 ManuMan — Migrazione database\n");

  for (const m of migrations) {
    process.stdout.write(`  ⏳ ${m.name}... `);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql: m.sql }),
      });

      // Prova endpoint alternativo se il primo fallisce
      if (!res.ok) {
        const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ query: m.sql }),
        });
        if (!res2.ok) {
          const err = await res2.text();
          console.log(`❌ ERRORE: ${err}`);
          continue;
        }
      }
      console.log("✅ OK");
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  console.log("\n✅ Migrazione completata! Ricarica l'app.");
}

runMigrations();
