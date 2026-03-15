-- Riesegui la funzione helper con il nome tabella corretto
create or replace function get_my_tenant_id()
returns uuid language sql security definer stable as $$
  select tenant_id from utenti_tenant where user_id = auth.uid() limit 1;
$$;

-- Fix RLS policies che usano get_my_tenant_id (già corrette se la funzione è aggiornata)
-- Le policy su inquilini, utenti_tenant, inquilino_invito sono già ok
-- Verifica le policy sulle tabelle dati (usano get_my_tenant_id internamente)
