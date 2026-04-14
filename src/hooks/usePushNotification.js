/**
 * usePushNotification — notifiche browser native
 * Triggera notifiche quando arrivano ticket urgenti o manutenzioni scadono
 */
import { useEffect, useCallback } from "react";

export function usePushNotification() {
  // Richiedi permesso notifiche al primo uso
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  // Invia notifica
  const notify = useCallback(async (titolo, opzioni = {}) => {
    const ok = await requestPermission();
    if (!ok) return;
    const n = new Notification(titolo, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      ...opzioni,
    });
    // Auto-chiudi dopo 5s
    setTimeout(() => n.close(), 5000);
    n.onclick = () => { window.focus(); n.close(); };
    return n;
  }, [requestPermission]);

  // Notifica ticket urgente
  const notificaTicket = useCallback((ticket) => {
    const emoji = ticket.priorita === "urgente" ? "🚨" : "🎫";
    notify(`${emoji} Nuovo ticket: ${ticket.titolo}`, {
      body: `${ticket.segnalatore_nome || "Cliente"} — ${ticket.tipo}`,
      tag: `ticket-${ticket.id}`,
    });
  }, [notify]);

  // Notifica manutenzione scaduta
  const notificaScaduta = useCallback((manut) => {
    notify(`⏰ Manutenzione scaduta: ${manut.titolo}`, {
      body: `Data prevista: ${new Date(manut.data + "T00:00:00").toLocaleDateString("it-IT")}`,
      tag: `manut-${manut.id}`,
    });
  }, [notify]);

  return { requestPermission, notify, notificaTicket, notificaScaduta };
}
