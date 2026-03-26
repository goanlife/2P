import React, { useState, useEffect, useRef } from "react";

// ─── Contenuto help per ogni sezione ─────────────────────────────────────

const HELP_CONTENT = {

  dashboard: {
    titolo: "Dashboard",
    icon: "📊",
    intro: "La dashboard mostra un riepilogo in tempo reale di tutte le attività di manutenzione.",
    sezioni: [
      {
        titolo: "KPI principali",
        testo: "I 4 riquadri in alto mostrano: attività totali, completate, in scadenza oggi e urgenti. Cliccando su uno di essi vieni portato alla lista manutenzioni già filtrata per quello stato.",
      },
      {
        titolo: "Attività in scadenza",
        testo: "La sezione centrale elenca le attività pianificate per oggi e i prossimi 7 giorni. Le attività scadute (data passata e non completate) appaiono in rosso.",
      },
      {
        titolo: "Calendario mini",
        testo: "Il calendario mensile evidenzia i giorni con attività programmate. I pallini colorati indicano il numero di interventi: verde = completati, arancione = pianificati, rosso = scaduti.",
      },
    ],
    tips: [
      "Usa la dashboard come punto di partenza mattutino per vedere subito cosa fare oggi.",
      "I KPI si aggiornano in tempo reale — non serve ricaricare la pagina.",
    ],
  },

  manutenzioni: {
    titolo: "Lista Manutenzioni",
    icon: "🔧",
    intro: "La lista manutenzioni contiene tutte le attività di intervento: pianificate, in corso e completate.",
    sezioni: [
      {
        titolo: "Filtri",
        testo: "Usa i filtri in alto per trovare rapidamente le attività: per stato (pianificata, in corso, completata, scaduta), per cliente, asset, operatore o data. Puoi combinare più filtri insieme.",
      },
      {
        titolo: "Creare una manutenzione",
        testo: "Clicca '+ Nuova attività'. Compila: titolo, tipo (ordinaria/straordinaria), data, durata stimata, operatore e cliente. I campi obbligatori sono solo titolo e data.",
      },
      {
        titolo: "Cambiare stato",
        testo: "Clicca il badge colorato dello stato nella card per avanzarlo. Il flusso è: Pianificata → In corso → Completata. Per completare con firma e note tecniche usa il pulsante '✓ Chiudi'.",
      },
      {
        titolo: "Numeri attività",
        testo: "Le attività generate dai Piani hanno un numero progressivo nel formato CODICE-ANNO-NNN (es. CLI1-2025-001). Quelle create manualmente non hanno numero.",
      },
    ],
    tips: [
      "Duplica un'attività con il tasto 📋 per creare rapidamente interventi simili.",
      "Le attività scadute (data passata, stato pianificata) si colorano automaticamente di rosso ogni notte.",
      "Usa Ctrl+K per cercare qualsiasi cosa nell'app.",
    ],
  },

  piani: {
    titolo: "Piani di Manutenzione",
    icon: "📋",
    intro: "I piani sono template riutilizzabili che definiscono cosa fare e con quale frequenza. Applicandoli ai siti si generano automaticamente gli Ordini di Lavoro.",
    sezioni: [
      {
        titolo: "Struttura di un piano",
        testo: "Un piano è composto da: (1) Nome e modalità di aggregazione OdL, (2) Attività con le loro frequenze (es. 'Taglio erba' ogni settimana, 'Verifica estintori' ogni 6 mesi), (3) Siti a cui è applicato (clienti).",
      },
      {
        titolo: "Modalità aggregazione OdL",
        testo: "Scegli come raggruppare le attività negli Ordini di Lavoro: Per visita (stesso operatore+giorno → 1 OdL), Per attività (1 OdL per ogni attività), Per mese (tutto il mese → 1 OdL), Per categoria (raggruppate per tipo).",
      },
      {
        titolo: "Applicare a un sito",
        testo: "Dal tab 'Siti applicati' clicca '+ Applica a un sito'. Seleziona cliente, operatore di default e date del contratto. Solo dopo questa operazione potrai generare gli OdL.",
      },
      {
        titolo: "Generare gli OdL",
        testo: "Clicca '⚡ Genera OdL' su un sito applicato. Si apre un wizard dove scegli il periodo (da/a), l'operatore e vedi l'anteprima di tutti gli OdL che verranno creati prima di confermare.",
      },
    ],
    tips: [
      "Un piano può essere applicato a più siti/clienti diversi — è un template, non è legato a un singolo cliente.",
      "Se usi 'Per visita', lo stesso tecnico che fa più attività nella stessa giornata riceve un solo OdL.",
      "Aggiungi la 'Categoria' alle attività se usi l'aggregazione 'Per categoria'.",
    ],
  },

  odl: {
    titolo: "Ordini di Lavoro",
    icon: "📝",
    intro: "Gli Ordini di Lavoro (OdL) sono i documenti operativi assegnati agli operatori. Ogni OdL raggruppa una o più attività da eseguire in una visita.",
    sezioni: [
      {
        titolo: "Ciclo di vita OdL",
        testo: "Un OdL parte come Bozza, viene Confermato (il tecnico riceve email), poi passa In corso durante l'esecuzione, e infine Completato. Ogni passaggio di stato può inviare una notifica email automatica.",
      },
      {
        titolo: "Rapporto PDF",
        testo: "Clicca 🖨 sulla card OdL per generare il rapporto completo: numero OdL, cliente, tecnico, lista attività con ore effettive, note tecniche e spazio per le firme. Si apre in una finestra pronta per la stampa o il salvataggio PDF.",
      },
      {
        titolo: "Ripianificazione massiva",
        testo: "Il bottone '📅 Ripianifica' apre 3 opzioni: A) Seleziona le card con le checkbox e modifica i selezionati, B) Filtra per criteri e applica a tutti i risultati, C) Esporta CSV, modifica in Excel, reimporta.",
      },
      {
        titolo: "Selezione multipla",
        testo: "Ogni card ha un checkbox in alto a sinistra. Seleziona più OdL e usa la barra che appare in basso per: spostare le date di N giorni, cambiare operatore, cambiare stato in blocco.",
      },
    ],
    tips: [
      "Genera gli OdL sempre dai Piani di manutenzione — non crearli a mano, altrimenti perdi il collegamento al piano.",
      "Dopo aver completato un OdL, tutte le attività collegate vengono chiuse automaticamente.",
      "Il rapporto PDF include la firma già raccolta nelle singole attività.",
    ],
  },

  assets: {
    titolo: "Asset",
    icon: "⚙",
    intro: "Gli asset sono impianti, attrezzature e apparecchiature soggetti a manutenzione. Ogni asset ha una scheda con storico interventi, stato di salute e documenti.",
    sezioni: [
      {
        titolo: "Creare un asset",
        testo: "Clicca '+ Nuovo asset'. I campi principali sono: nome, tipo, cliente di riferimento, ubicazione (reparto/piano/zona) e matricola. Aggiungi marca, modello e data di installazione per una gestione completa.",
      },
      {
        titolo: "Importazione massiva",
        testo: "Clicca '📥 Importa CSV/Excel' per caricare molti asset in una volta. Il sistema riconosce automaticamente le colonne anche con nomi diversi. Scarica il template CSV di esempio per vedere il formato corretto.",
      },
      {
        titolo: "Esporta e aggiorna",
        testo: "Usa '📤 Esporta CSV' per scaricare l'anagrafica attuale. Modifica il file (aggiorna stato, ore utilizzo, garanzie) e reimportalo: le righe con ID_MANUМАН vengono aggiornate, le righe senza ID vengono inserite come nuovi asset.",
      },
      {
        titolo: "Stato di salute",
        testo: "Il badge 'Salute' sulla card viene calcolato automaticamente in base a: ore di utilizzo rispetto alla soglia, scadenza garanzia, data ultima manutenzione e numero di interventi in sospeso.",
      },
      {
        titolo: "QR Code",
        testo: "Ogni asset ha un QR code stampabile (pulsante QR). Applicato fisicamente sull'impianto, permette al tecnico di aprire direttamente la scheda dell'asset inquadrando il codice.",
      },
    ],
    tips: [
      "Collega ogni asset a un cliente: questo permette di filtrare gli asset per sito e ai clienti di vedere solo i propri.",
      "Imposta la 'Soglia ore' per ricevere avvisi quando l'asset si avvicina alla manutenzione obbligatoria.",
      "Usa le categorie Tipo per raggruppare: Impianto elettrico, Impianto termico, Meccanico, ecc.",
    ],
  },

  clienti: {
    titolo: "Clienti",
    icon: "🏢",
    intro: "L'anagrafica clienti contiene tutte le aziende/siti per cui gestisci le manutenzioni.",
    sezioni: [
      {
        titolo: "Dati del cliente",
        testo: "Per ogni cliente puoi registrare: ragione sociale, codice breve (es. CLI1), P.IVA, contatto di riferimento, telefono, email, indirizzo e settore. L'email del cliente viene usata per le notifiche automatiche al completamento degli interventi.",
      },
      {
        titolo: "Contenitore SLA",
        testo: "Assegna un profilo SLA al cliente per definire i tempi di risposta e risoluzione garantiti. I profili SLA si configurano in Azienda → ⏱ SLA. Ogni priorità (bassa/media/alta/urgente) può avere tempi diversi.",
      },
      {
        titolo: "Importa e aggiorna",
        testo: "Usa '📥 Importa' per caricare l'anagrafica da CSV/Excel. Usa '📤 Esporta CSV' per scaricare, modificare (telefoni, email, indirizzi) e reimportare in massa. Le righe con ID_MANUМАН vengono aggiornate.",
      },
      {
        titolo: "Portale cliente",
        testo: "Puoi creare accesso all'app per i tuoi clienti (tipo 'Cliente' in Utenti). Vedranno solo le attività del loro sito in sola lettura: calendario interventi, storico, asset.",
      },
    ],
    tips: [
      "Il codice breve (es. CLI1) viene usato nella numerazione automatica delle attività: CLI1-2025-001.",
      "Aggiungi l'email del cliente per abilitare le notifiche automatiche al completamento OdL.",
    ],
  },

  utenti: {
    titolo: "Utenti e Operatori",
    icon: "👥",
    intro: "Gestisce chi può accedere all'app e con quali permessi. Ci sono 3 tipi di utente: Admin, Fornitore/Tecnico e Cliente.",
    sezioni: [
      {
        titolo: "Tipi di utente",
        testo: "Admin: accesso completo a tutto. Fornitore/Tecnico: vede le proprie attività assegnate, può chiudere gli interventi. Cliente: sola lettura del proprio sito (attività, asset, calendario). I tipi si impostano nel campo 'Tipo' di ogni operatore.",
      },
      {
        titolo: "Creare accesso login",
        testo: "Un operatore in anagrafica non ha accesso automatico all'app. Per creare le credenziali: trova la card dell'operatore → clicca 🔑 → inserisci email e password temporanea → comunica le credenziali all'operatore.",
      },
      {
        titolo: "Invitare tramite codice",
        testo: "Alternativa più semplice: vai in Azienda → 🔗 Invito, copia il codice e mandalo all'operatore. Quando si registra autonomamente su ManuMan, inserisce il codice e si unisce automaticamente alla tua azienda.",
      },
      {
        titolo: "Gruppi",
        testo: "I gruppi permettono di limitare la visibilità dei menu per profili diversi. Crea un gruppo (es. 'Tecnici campo'), assegna gli operatori e configura quali tab del menu possono vedere.",
      },
    ],
    tips: [
      "Per ogni nuova azienda che acquista ManuMan: il loro admin si registra, crea la propria azienda e gestisce i propri utenti autonomamente.",
      "La tariffa oraria dell'operatore è usata per calcolare il costo degli interventi.",
    ],
  },

  calendario: {
    titolo: "Calendario",
    icon: "📅",
    intro: "Vista mensile di tutte le attività pianificate. Permette di vedere il carico di lavoro, spostare interventi e creare nuove attività.",
    sezioni: [
      {
        titolo: "Navigazione",
        testo: "Usa le frecce per navigare tra i mesi. I pallini colorati sotto ogni numero indicano il numero di attività quel giorno: verde = completate, arancione = pianificate, rosso = scadute. Clicca su un giorno per vedere il dettaglio.",
      },
      {
        titolo: "Spostare un'attività",
        testo: "Trascina una card attività da un giorno a un altro per ripianificarla. La data viene aggiornata automaticamente. Puoi anche cliccare su una card e modificare la data dal form.",
      },
      {
        titolo: "Creare dal calendario",
        testo: "Clicca su un giorno vuoto per creare una nuova attività con quella data già precompilata. Risparmia tempo rispetto ad andare in Lista Manutenzioni.",
      },
      {
        titolo: "Filtri calendario",
        testo: "Usa i filtri in alto per vedere solo le attività di un operatore o cliente specifico. Utile per verificare il carico di lavoro di un singolo tecnico nel mese.",
      },
    ],
    tips: [
      "Il drag & drop funziona anche tra settimane diverse — non serve navigare al mese di destinazione.",
      "I giorni festivi (sabato/domenica) hanno sfondo diverso per aiutare la pianificazione.",
    ],
  },

  kanban: {
    titolo: "Kanban",
    icon: "🗂",
    intro: "Vista a colonne per gestire il flusso delle attività per stato. Ideale per coordinare il team durante la giornata.",
    sezioni: [
      {
        titolo: "Colonne",
        testo: "Le 4 colonne corrispondono agli stati: Pianificata, In corso, Completata, Scaduta. Sposta le card tra le colonne trascinandole per cambiare stato.",
      },
      {
        titolo: "Card kanban",
        testo: "Ogni card mostra: titolo, cliente, asset, operatore assegnato e data. Le priorità sono indicate dal colore del bordo sinistro: grigio=bassa, giallo=media, blu=alta, rosso=urgente.",
      },
    ],
    tips: [
      "Usa il Kanban durante le riunioni operative per avere una visione immediata di cosa è in corso.",
    ],
  },

  statistiche: {
    titolo: "Statistiche",
    icon: "📈",
    intro: "Report e KPI sulle attività di manutenzione. Analizza performance per cliente, piano e operatore.",
    sezioni: [
      {
        titolo: "Tab Globale",
        testo: "Mostra i KPI aggregati: totale interventi, tasso di completamento, ore lavorate, attività per tipo e stato. Il grafico mensile mostra l'andamento degli ultimi 6 mesi.",
      },
      {
        titolo: "Tab Per cliente",
        testo: "Breakdown per ogni cliente: numero interventi, completati, scaduti, ore stimate vs effettive. Utile per rendicontare il servizio al cliente.",
      },
      {
        titolo: "Tab Per piano",
        testo: "Analisi per piano di manutenzione: quante attività ha generato ogni piano, tasso di rispetto delle frequenze, ore pianificate vs eseguite.",
      },
    ],
    tips: [
      "Esporta i dati in CSV dalla Lista Manutenzioni per analisi più approfondite in Excel.",
    ],
  },

  azienda: {
    titolo: "Azienda",
    icon: "🏭",
    intro: "Configurazione generale dell'account: anagrafica, logo, inviti, SLA, menu e notifiche email.",
    sezioni: [
      {
        titolo: "Anagrafica",
        testo: "Inserisci i dati della tua azienda: nome, P.IVA, indirizzo, telefono, email. Questi appaiono sui PDF dei verbali e rapporti OdL.",
      },
      {
        titolo: "Email automatiche",
        testo: "Configura le notifiche email nella tab 📧 Email. Hai bisogno di un account gratuito su resend.com e di configurare la chiave RESEND_API_KEY su Supabase. Usa il bottone '🧪 Testa invio email' per verificare che tutto funzioni.",
      },
      {
        titolo: "SLA",
        testo: "Definisci i tempi di risposta e risoluzione garantiti per priorità. Puoi creare profili SLA diversi da associare ai singoli clienti.",
      },
      {
        titolo: "Codice invito",
        testo: "Genera un codice nella tab 🔗 Invito e condividilo con i tuoi collaboratori. Chi si registra con quel codice entra automaticamente nella tua azienda come membro.",
      },
    ],
    tips: [
      "Il logo caricato appare nella sidebar e sui documenti PDF.",
      "Ogni codice invito può essere usato una sola volta — generane uno nuovo per ogni persona.",
    ],
  },

  scadenzario: {
    titolo: "Scadenzario Normativo",
    icon: "⚖",
    intro: "Gestione delle scadenze obbligatorie per legge: verifiche periodiche, certificazioni, collaudi.",
    sezioni: [
      {
        titolo: "Creare una scadenza",
        testo: "Aggiungi gli adempimenti normativi con: titolo, cliente/sito, data scadenza, frequenza di rinnovo e riferimento normativo (es. DPR 462/01, D.Lgs 81/08). Il sistema avvisa automaticamente 30 giorni prima.",
      },
      {
        titolo: "Avvisi email",
        testo: "Se le notifiche email sono abilitate (Azienda → 📧 Email), ricevi un promemoria automatico 30 giorni prima di ogni scadenza normativa.",
      },
    ],
    tips: [
      "Usa il riferimento normativo per documentare la base legale di ogni adempimento.",
      "Le scadenze in rosso sono già scadute — prendile in carico immediatamente.",
    ],
  },

  ordini: {
    titolo: "Ordini di Acquisto",
    icon: "🛒",
    intro: "Gestione degli ordini ai fornitori per ricambi e materiali.",
    sezioni: [
      {
        titolo: "Creare un ordine",
        testo: "Crea un ordine di acquisto con fornitore, data, righe articoli (codice, descrizione, quantità, prezzo). Lo stato dell'ordine segue il flusso: Bozza → Confermato → Ricevuto.",
      },
      {
        titolo: "Collegamento ricambi",
        testo: "I ricambi nel catalogo (Azienda → 🔩 Ricambi) possono essere aggiunti direttamente agli ordini. Quando l'ordine è ricevuto, il magazzino si aggiorna automaticamente.",
      },
    ],
    tips: [],
  },

  richieste: {
    titolo: "Richieste di Intervento",
    icon: "📨",
    intro: "Gestione delle segnalazioni di guasti o interventi urgenti non pianificati.",
    sezioni: [
      {
        titolo: "Aprire una richiesta",
        testo: "Compila cliente, descrizione del problema, priorità e asset coinvolto. La richiesta può essere convertita in manutenzione straordinaria con un clic.",
      },
      {
        titolo: "Portale cliente",
        testo: "I clienti con accesso all'app possono aprire richieste direttamente. Ricevono aggiornamenti sullo stato della loro segnalazione.",
      },
    ],
    tips: [
      "Imposta la priorità 'Urgente' per le segnalazioni che richiedono intervento entro 4 ore.",
    ],
  },

};

// ─── Componente bottone help (?) ──────────────────────────────────────────
export function HelpButton({ sezione, style={} }) {
  const [open, setOpen] = useState(false);

  if (!HELP_CONTENT[sezione]) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Guida e aiuto"
        style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "var(--surface-2)", border: "1.5px solid var(--border)",
          color: "var(--text-3)", fontSize: 13, fontWeight: 700,
          cursor: "pointer", display: "inline-flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          transition: "all .15s",
          ...style,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "var(--amber)";
          e.currentTarget.style.color = "#0D1B2A";
          e.currentTarget.style.borderColor = "var(--amber)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "var(--surface-2)";
          e.currentTarget.style.color = "var(--text-3)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        ?
      </button>
      {open && <HelpPanel sezione={sezione} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Pannello help laterale ───────────────────────────────────────────────
export function HelpPanel({ sezione, onClose }) {
  const content = HELP_CONTENT[sezione];
  const [sezioneAperta, setSezioneAperta] = useState(null);
  const panelRef = useRef();

  useEffect(() => {
    // Chiudi premendo Escape
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Chiudi cliccando fuori — useCapture=false, cleanup corretto
  useEffect(() => {
    let active = false;
    const fn = e => {
      if (!active) return; // ignora il click che ha aperto il pannello
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    // Piccolo delay per evitare chiusura immediata al click del bottone
    const t = setTimeout(() => {
      active = true;
      document.addEventListener("mousedown", fn);
    }, 150);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", fn);
    };
  }, [onClose]);

  if (!content) return null;

  return (
    <>
      {/* Overlay leggero */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.2)",
        zIndex: 800,
      }} />

      {/* Pannello laterale */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(380px, 95vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,.15)",
          zIndex: 801,
          display: "flex", flexDirection: "column",
          overflowY: "auto",
          animation: "slideInRight .2s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--navy)",
          color: "white",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{content.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{content.titolo}</div>
                <div style={{ fontSize: 11, opacity: .7, marginTop: 1 }}>Guida rapida</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,.1)", border: "none",
                color: "white", cursor: "pointer", borderRadius: "50%",
                width: 32, height: 32, fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>

        {/* Corpo */}
        <div style={{ padding: "20px", flex: 1 }}>

          {/* Intro */}
          <div style={{
            fontSize: 13, color: "var(--text-2)", lineHeight: 1.7,
            marginBottom: 20, padding: "12px 14px",
            background: "var(--surface-2)", borderRadius: 8,
            borderLeft: "3px solid var(--amber)",
          }}>
            {content.intro}
          </div>

          {/* Sezioni accordion */}
          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            {content.sezioni.map((s, i) => (
              <div key={i} style={{
                border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
              }}>
                <button
                  onClick={() => setSezioneAperta(sezioneAperta === i ? null : i)}
                  style={{
                    width: "100%", padding: "11px 14px",
                    background: sezioneAperta === i ? "var(--surface-2)" : "var(--surface)",
                    border: "none", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{s.titolo}</span>
                  <span style={{
                    fontSize: 11, color: "var(--text-3)",
                    transform: sezioneAperta === i ? "rotate(180deg)" : "none",
                    transition: "transform .2s",
                  }}>▼</span>
                </button>
                {sezioneAperta === i && (
                  <div style={{
                    padding: "12px 14px",
                    fontSize: 12, color: "var(--text-2)", lineHeight: 1.7,
                    borderTop: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}>
                    {s.testo}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tips */}
          {content.tips?.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "var(--text-3)", marginBottom: 10,
              }}>
                💡 Consigli pratici
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {content.tips.map((tip, i) => (
                  <div key={i} style={{
                    fontSize: 12, padding: "10px 12px",
                    background: "#FFFBEB", border: "1px solid #FDE68A",
                    borderRadius: 7, color: "#92400E", lineHeight: 1.6,
                  }}>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid var(--border)",
          background: "var(--surface-2)", flexShrink: 0,
          fontSize: 11, color: "var(--text-3)", textAlign: "center",
        }}>
          Premi <kbd style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 4, padding: "1px 5px", fontSize: 10,
          }}>Esc</kbd> per chiudere
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Hook per mostrare help contestuale ──────────────────────────────────
export function useHelp() {
  const [helpSezione, setHelpSezione] = useState(null);
  const apriHelp  = sezione => setHelpSezione(sezione);
  const chiudiHelp = () => setHelpSezione(null);
  return { helpSezione, apriHelp, chiudiHelp };
}
