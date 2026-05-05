-- ManuMan — Movimentazioni DB di test
-- Esegui su: https://supabase.com/dashboard/project/nnsylkjahuhttwajuxls/sql


DO $$
DECLARE
  tid uuid;
  t1 bigint; t2 bigint; t3 bigint; t4 bigint;
  m1 bigint; m2 bigint; m3 bigint;
  a1 bigint; a2 bigint; a3 bigint;
  r1 bigint; r2 bigint;
  odl1 bigint; oa1 bigint;
  op1 bigint; op2 bigint;
  c1 bigint; c2 bigint;
  nuovo_ticket bigint;
  nuova_man bigint;
BEGIN
  SELECT id INTO tid FROM tenants ORDER BY created_at LIMIT 1;
  IF tid IS NULL THEN RAISE EXCEPTION 'Nessun tenant'; END IF;

  -- Recupera ID esistenti
  SELECT id INTO t1 FROM tickets WHERE tenant_id=tid AND numero='TKT-2025-001';
  SELECT id INTO t2 FROM tickets WHERE tenant_id=tid AND numero='TKT-2025-002';
  SELECT id INTO t3 FROM tickets WHERE tenant_id=tid AND numero='TKT-2025-003';
  SELECT id INTO t4 FROM tickets WHERE tenant_id=tid AND numero='TKT-2025-004';
  SELECT id INTO m3 FROM manutenzioni WHERE tenant_id=tid AND titolo LIKE 'Sostituzione guarnizione%';
  SELECT id INTO a1 FROM assets WHERE tenant_id=tid AND matricola='PH-500-2019-001';
  SELECT id INTO a2 FROM assets WHERE tenant_id=tid AND matricola='CA-75-2020-003';
  SELECT id INTO a3 FROM assets WHERE tenant_id=tid AND matricola='EX-2-2018-007';
  SELECT id INTO r1 FROM ricambi WHERE tenant_id=tid AND codice='FO-075-001';
  SELECT id INTO r2 FROM ricambi WHERE tenant_id=tid AND codice='GP-HYD-023';
  SELECT id INTO op1 FROM operatori WHERE tenant_id=tid AND nome='Elettromeccanica Rossi';
  SELECT id INTO op2 FROM operatori WHERE tenant_id=tid AND nome='Idraulica Bianchi & Figli';
  SELECT id INTO c1 FROM clienti WHERE tenant_id=tid AND codice='CLI001';
  SELECT id INTO c2 FROM clienti WHERE tenant_id=tid AND codice='CLI002';
  SELECT id INTO odl1 FROM ordini_lavoro WHERE tenant_id=tid AND numero='OdL-2025-001';

  RAISE NOTICE '═══ MOVIMENTAZIONI DATABASE ═══';

  -- ════════════════════════════════════════════════════════
  -- 1. TICKET TKT-2025-001: avanza da in_lavorazione → risolto
  -- ════════════════════════════════════════════════════════
  IF t1 IS NOT NULL THEN
    UPDATE tickets SET
      stato = 'risolto',
      updated_at = NOW()
    WHERE id = t1;

    INSERT INTO ticket_commenti (ticket_id, testo, autore_nome, tipo, tenant_id) VALUES
      (t1, 'Guarnizione sostituita. Pompa ripristinata. Perdita azzerata. Test pressione ok a 185 bar.', 'Idraulica Bianchi & Figli', 'commento', tid),
      (t1, 'Macchina riavviata e collaudata. Cliente soddisfatto.', 'Mario Tecnico', 'commento', tid);

    -- Aggiorna ore utilizzo asset (riavvio dopo fermo)
    UPDATE assets SET ore_utilizzo = ore_utilizzo + 3 WHERE id = a1;

    -- Scala stock guarnizioni usate
    UPDATE ricambi SET quantita_stock = GREATEST(0, quantita_stock - 2) WHERE id = r2;

    RAISE NOTICE '✅ TKT-2025-001: in_lavorazione → risolto';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 2. TICKET TKT-2025-002: assegna operatore e apri
  -- ════════════════════════════════════════════════════════
  IF t2 IS NOT NULL THEN
    UPDATE tickets SET
      stato = 'in_lavorazione',
      operatore_id = op1,
      updated_at = NOW()
    WHERE id = t2;

    INSERT INTO ticket_commenti (ticket_id, testo, autore_nome, tipo, tenant_id) VALUES
      (t2, 'Assegnato a Elettromeccanica Rossi per diagnosi. Sopralluogo domani mattina 9:00.', 'Mario Tecnico', 'commento', tid);

    RAISE NOTICE '✅ TKT-2025-002: aperto → in_lavorazione (assegnato a Elettromeccanica Rossi)';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 3. TICKET TKT-2025-003: approvazione admin → aperto
  -- ════════════════════════════════════════════════════════
  IF t3 IS NOT NULL THEN
    UPDATE tickets SET
      stato = 'aperto',
      updated_at = NOW()
    WHERE id = t3;

    INSERT INTO ticket_commenti (ticket_id, testo, autore_nome, tipo, tenant_id) VALUES
      (t3, 'Richiesta approvata. Revisione pianificata per il mese prossimo. Contattare cliente per conferma data.', 'Sistema', 'log', tid);

    RAISE NOTICE '✅ TKT-2025-003: in_attesa → aperto (approvato admin)';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 4. MANUTENZIONE CORRETTIVA: completa l'intervento pompa
  -- ════════════════════════════════════════════════════════
  IF m3 IS NOT NULL THEN
    UPDATE manutenzioni SET
      stato = 'completata',
      chiuso_at = NOW(),
      ore_effettive = 2.5,
      note_chiusura = 'Guarnizioni pompa principale e secondaria sostituite. Test tenuta ok. Macchina rilasciata.',
      fermo_impianto = false
    WHERE id = m3;

    -- Ripristina stato asset
    UPDATE assets SET stato = 'attivo' WHERE id = a3 AND stato = 'manutenzione';

    INSERT INTO attivita_commenti (manutenzione_id, autore_nome, testo, tipo, tenant_id) VALUES
      (m3, 'Idraulica Bianchi & Figli', 'Intervento completato in 2.5h. Tutto regolare.', 'commento', tid),
      (m3, 'Mario Tecnico', 'Asset riportato in produzione. Cliente avvisato.', 'commento', tid);

    RAISE NOTICE '✅ Manutenzione correttiva estrusore: completata, asset attivo';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 5. NUOVO TICKET URGENTE (creato da cliente)
  -- ════════════════════════════════════════════════════════
  IF c1 IS NOT NULL THEN
    INSERT INTO tickets (
      numero, titolo, tipo, priorita, stato,
      cliente_id, asset_id, operatore_id,
      descrizione, causa_guasto, fermo_impianto,
      segnalatore_nome, segnalatore_email, tenant_id
    ) VALUES (
      'TKT-2025-006',
      'Allarme temperatura quadro elettrico linea A',
      'correttiva', 'urgente', 'aperto',
      c1, a1, op1,
      'Il quadro elettrico della linea A mostra allarme temperatura >85°C. Produzione rallentata al 50%.',
      'Possibile guasto ventilatore quadro',
      false,
      'Ing. Ferretti', 'ferretti@acciaierie-nordest.it',
      tid
    ) RETURNING id INTO nuovo_ticket;

    INSERT INTO ticket_commenti (ticket_id, testo, autore_nome, tipo, tenant_id) VALUES
      (nuovo_ticket, 'URGENTE: allarme attivo. Tecnico elettrico richiesto entro 2 ore.', 'Ing. Ferretti', 'commento', tid);

    RAISE NOTICE '✅ Nuovo ticket urgente TKT-2025-006 creato';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 6. NUOVA MANUTENZIONE PIANIFICATA (generata dal piano)
  -- ════════════════════════════════════════════════════════
  IF c1 IS NOT NULL AND a2 IS NOT NULL AND op2 IS NOT NULL THEN
    INSERT INTO manutenzioni (
      titolo, tipo, stato, priorita,
      operatore_id, cliente_id, asset_id,
      data, durata, note, fermo_impianto, tenant_id
    ) VALUES (
      'Sostituzione filtro aria — Compressore Atlas 75kW',
      'ordinaria', 'pianificata', 'media',
      op2, c1, a2,
      CURRENT_DATE + 3, 45,
      'Filtro aria scaduto per ore utilizzo. Sostituzione obbligatoria.',
      false, tid
    ) RETURNING id INTO nuova_man;

    -- Aggiorna ore compressore
    UPDATE assets SET ore_utilizzo = ore_utilizzo + 168 WHERE id = a2;

    RAISE NOTICE '✅ Nuova manutenzione pianificata: sostituzione filtro aria compressore (+168h)';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 7. ORDINE ACQUISTO: riordino filtri (stock sotto soglia)
  -- ════════════════════════════════════════════════════════
  IF r1 IS NOT NULL THEN
    -- Scala stock filtri
    UPDATE ricambi SET quantita_stock = GREATEST(0, quantita_stock - 3) WHERE id = r1;

    -- Verifica se siamo sotto soglia (soglia_minima = 4, stock ora = ~9)
    -- Crea ordine di riordino
    INSERT INTO ordini_acquisto (
      fornitore, stato, data_ordine, data_attesa,
      totale, numero, note, tenant_id
    ) VALUES (
      'Filtri Italia Srl', 'bozza',
      CURRENT_DATE, CURRENT_DATE + 7,
      285.00, 'OA-2025-003',
      'Riordino automatico filtri — stock sceso dopo 3 sostituzioni',
      tid
    );

    RAISE NOTICE '✅ OA-2025-003 creato: riordino filtri olio (stock -3 unita)';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 8. OdL: conferma e collega manutenzione
  -- ════════════════════════════════════════════════════════
  IF odl1 IS NOT NULL AND nuova_man IS NOT NULL THEN
    UPDATE manutenzioni SET odl_id = odl1 WHERE id = nuova_man;
    RAISE NOTICE '✅ Manutenzione filtro collegata a OdL-2025-001';
  END IF;

  -- ════════════════════════════════════════════════════════
  -- 9. SCADENZA NORMATIVA: aggiorna stato (scaduta → in lavorazione)
  -- ════════════════════════════════════════════════════════
  UPDATE scadenze_normative
  SET stato = 'in_lavorazione',
      note = 'Pratica avviata. Contattato organismo notificato TUV per sopralluogo entro 30 giorni.'
  WHERE tenant_id = tid
    AND titolo LIKE '%Messa a terra%'
    AND stato = 'scaduta';

  RAISE NOTICE '✅ Scadenza normativa messa a terra: avviata pratica rinnovo';

  -- ════════════════════════════════════════════════════════
  -- 10. LOG ATTIVITA
  -- ════════════════════════════════════════════════════════
  INSERT INTO log_attivita (entita_tipo, entita_id, azione, dettagli, operatore_nome, tenant_id)
  VALUES
    ('ticket', t1, 'cambio_stato', 'in_lavorazione → risolto', 'Idraulica Bianchi & Figli', tid),
    ('ticket', t2, 'assegnazione', 'Assegnato a Elettromeccanica Rossi', 'Mario Tecnico', tid),
    ('ticket', t3, 'approvazione', 'in_attesa → aperto (admin)', 'Sistema', tid),
    ('manutenzione', m3, 'completamento', 'Intervento completato in 2.5h', 'Idraulica Bianchi & Figli', tid),
    ('asset', a3, 'cambio_stato', 'manutenzione → attivo', 'Sistema', tid);

  -- ════════════════════════════════════════════════════════
  -- RIEPILOGO
  -- ════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════';
  RAISE NOTICE 'MOVIMENTAZIONI COMPLETATE:';
  RAISE NOTICE '  Ticket aggiornati: 3 (TKT-001 risolto, TKT-002 assegnato, TKT-003 approvato)';
  RAISE NOTICE '  Ticket creati: 1 (TKT-2025-006 urgente)';
  RAISE NOTICE '  Manutenzioni completate: 1 (pompa estrusore)';
  RAISE NOTICE '  Manutenzioni create: 1 (filtro aria compressore)';
  RAISE NOTICE '  Asset ripristinati: 1 (estrusore → attivo)';
  RAISE NOTICE '  Asset aggiornati ore: 2 (pressa +3h, compressore +168h)';
  RAISE NOTICE '  Stock ricambi scalati: 2 (filtri -3, guarnizioni -2)';
  RAISE NOTICE '  Ordini acquisto creati: 1 (OA-2025-003 riordino filtri)';
  RAISE NOTICE '  Scadenze aggiornate: 1 (messa a terra in lavorazione)';
  RAISE NOTICE '  Log attivita inseriti: 5';
  RAISE NOTICE '══════════════════════════════════';
END $$;
