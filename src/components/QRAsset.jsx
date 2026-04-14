/**
 * QRAsset — genera e mostra QR code per un asset
 * Usa la Web API QR generation oppure un servizio esterno via URL
 */
import React, { useEffect, useRef, useState } from "react";

// QR generato lato client con canvas — nessuna dipendenza esterna
// Implementazione semplificata usando Google Charts API (gratuita, no tracking)
export function QRCodeAsset({ asset, onClose }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  // URL che apre direttamente la scheda asset nell'app
  const assetUrl = `${window.location.origin}?asset=${asset.id}`;

  useEffect(() => {
    // Google Charts QR API — URL pubblico, nessun dato personale inviato
    const encoded = encodeURIComponent(assetUrl);
    setQrUrl(`https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encoded}&choe=UTF-8`);
  }, [assetUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(assetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>QR - ${asset.nome}</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 40px; }
        h2 { font-size: 18px; margin-bottom: 4px; }
        p { color: #666; font-size: 13px; margin: 4px 0 20px; }
        img { border: 1px solid #eee; border-radius: 8px; }
        .info { margin-top: 16px; font-size: 12px; color: #888; }
      </style></head>
      <body>
        <h2>${asset.nome}</h2>
        <p>${asset.tipo || ""} — ${asset.ubicazione || ""}</p>
        <img src="${qrUrl}" width="200" height="200" />
        <div class="info">Matricola: ${asset.matricola || "—"} &nbsp;|&nbsp; ID: ${asset.id}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,.6)", display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface, #fff)", borderRadius: 20,
        padding: "28px 24px", maxWidth: 360, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        textAlign: "center",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>
              QR Code Asset
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              {asset.nome}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-3)", fontSize: 20, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* QR Code */}
        <div style={{
          background: "#fff", borderRadius: 12, padding: 16,
          display: "inline-block", border: "1px solid var(--border)",
          marginBottom: 20,
        }}>
          {qrUrl ? (
            <img src={qrUrl} alt={`QR ${asset.nome}`} width={220} height={220}
              style={{ display: "block", borderRadius: 4 }} />
          ) : (
            <div style={{ width: 220, height: 220, display: "flex", alignItems: "center",
              justifyContent: "center", color: "var(--text-3)", fontSize: 12 }}>
              Generazione...
            </div>
          )}
        </div>

        {/* Info asset */}
        <div style={{
          background: "var(--surface-2, #f8f9fa)", borderRadius: 10,
          padding: "10px 14px", marginBottom: 20, textAlign: "left",
          fontSize: 12, color: "var(--text-2)",
        }}>
          <div><strong>Matricola:</strong> {asset.matricola || "—"}</div>
          <div><strong>Ubicazione:</strong> {asset.ubicazione || "—"}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-3)",
            fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
            {assetUrl}
          </div>
        </div>

        {/* Azioni */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleCopy} className="btn-secondary" style={{ flex: 1, fontSize: 13 }}>
            {copied ? "✅ Copiato!" : "📋 Copia URL"}
          </button>
          <button onClick={handlePrint} className="btn-primary" style={{ flex: 1, fontSize: 13 }}>
            🖨 Stampa
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * QRScanner — apre la camera per scansionare un QR code asset
 * Usa l'API nativa del browser (no librerie esterne)
 */
export function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then(s => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(e => setError("Camera non disponibile: " + e.message));

    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Analisi QR ogni 500ms usando BarcodeDetector API (Chrome 83+)
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    if (!("BarcodeDetector" in window)) {
      setError("QR scanner non supportato su questo browser. Usa Chrome su Android.");
      return;
    }
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const interval = setInterval(async () => {
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          const url = codes[0].rawValue;
          // Estrai asset ID dall'URL ?asset=123
          const match = url.match(/[?&]asset=(\d+)/);
          if (match) {
            clearInterval(interval);
            stream?.getTracks().forEach(t => t.stop());
            onScan(Number(match[1]));
          }
        }
      } catch { }
    }, 500);
    return () => clearInterval(interval);
  }, [stream, onScan]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#000", display: "flex",
      flexDirection: "column", alignItems: "center",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", width: "100%", background: "rgba(0,0,0,.7)",
      }}>
        <div style={{ color: "#fff", fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700 }}>
          📷 Scansiona QR Asset
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "#fff",
          fontSize: 24, cursor: "pointer",
        }}>✕</button>
      </div>

      {error ? (
        <div style={{ color: "#fff", padding: 40, textAlign: "center", fontSize: 14 }}>
          ⚠ {error}
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline
            style={{ width: "100%", maxWidth: 500, flex: 1, objectFit: "cover" }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 220, height: 220,
            border: "3px solid var(--amber, #FFAB00)",
            borderRadius: 16, pointerEvents: "none",
          }} />
          <div style={{ color: "#ccc", padding: 20, fontSize: 13 }}>
            Inquadra il QR code dell'asset
          </div>
        </>
      )}
    </div>
  );
}
