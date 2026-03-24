-- ═══════════════════════════════════════════════════════════════════
-- Piano voci flessibili: scope asset | area | generale
-- Ogni voce ha frequenza/durata/tipo/priorita proprie
-- ═══════════════════════════════════════════════════════════════════

-- Nuove colonne su piano_assegnazioni
alter table piano_assegnazioni add column if not exists titolo      text;        -- nome attività (es. "Taglio erba giardino Nord")
alter table piano_assegnazioni add column if not exists scope       text default 'asset' check (scope in ('asset','area','generale'));
alter table piano_assegnazioni add column if not exists area_nome   text;        -- solo se scope='area'
alter table piano_assegnazioni add column if not exists frequenza   text;        -- override rispetto al piano
alter table piano_assegnazioni add column if not exists durata      int;         -- override rispetto al piano
alter table piano_assegnazioni add column if not exists tipo        text;        -- override rispetto al piano
alter table piano_assegnazioni add column if not exists priorita    text;        -- override rispetto al piano
alter table piano_assegnazioni add column if not exists note        text;        -- istruzioni specifiche per la voce

-- Retrocompatibilità: le voci esistenti senza titolo usano il nome del piano (gestito nel frontend)

-- Aggiungi cliente_id e date al piano stesso (il piano appartiene a un cliente/sito)
alter table piani add column if not exists cliente_id  bigint references clienti(id) on delete set null;
alter table piani add column if not exists data_inizio date;
alter table piani add column if not exists data_fine   date;
