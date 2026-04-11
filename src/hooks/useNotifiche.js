/**
 * useNotifiche — gestione toast/notifiche globali
 */
import { useState, useCallback } from "react";

export function useNotifiche() {
  const [toast, setToast] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);

  const notify = useCallback((msg, type = "info") => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const confirmDel = useCallback((msg, onConfirm) => {
    setConfirmDlg({ msg, onConfirm });
  }, []);

  return { toast, setToast, notify, confirmDlg, setConfirmDlg, confirmDel };
}
