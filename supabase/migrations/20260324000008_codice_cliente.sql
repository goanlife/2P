-- ═══════════════════════════════════════════════════════════════════
-- Aggiunge codice cliente per composizione numero attività
-- Formato numero: [COD]-[ANNO]-[NNN]  es. CLI1-2025-003
-- ═══════════════════════════════════════════════════════════════════
alter table clienti add column if not exists codice text default null;

-- Genera codici automatici per clienti esistenti (prime 4 lettere RS + id)
update clienti
set codice = upper(regexp_replace(left(rs, 4), '[^A-Za-z0-9]', '', 'g')) || id::text
where codice is null;
