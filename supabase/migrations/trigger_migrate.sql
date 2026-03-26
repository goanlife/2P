-- Migration trigger: 2026-03-26T17:23:13.533349
-- Questo file forza il workflow migrate a girare su ogni push
-- Le migration sono idempotenti (IF NOT EXISTS) quindi sicuro ri-eseguirle
SELECT 1;
