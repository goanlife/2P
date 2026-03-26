import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ManuMan] React crash:", error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.error) return this.props.children;

    const err = this.state.error;
    const stack = this.state.info?.componentStack || "";

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0D1B2A", padding: "24px",
        fontFamily: "monospace",
      }}>
        <div style={{
          background: "#1A2535", border: "1px solid #EF4444",
          borderRadius: 12, padding: "24px 28px", maxWidth: 600, width: "100%",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💥</div>
          <div style={{ fontFamily: "system-ui", fontWeight: 700, fontSize: 18,
            color: "#F8FAFC", marginBottom: 8 }}>
            ManuMan ha incontrato un errore
          </div>
          <div style={{ fontSize: 13, color: "#EF4444", background: "#2D1B1B",
            padding: "10px 14px", borderRadius: 6, marginBottom: 16,
            wordBreak: "break-all", lineHeight: 1.5 }}>
            {err.message || String(err)}
          </div>
          {stack && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ fontSize: 12, color: "#94A3B8", cursor: "pointer" }}>
                Dettagli tecnici
              </summary>
              <pre style={{ fontSize: 10, color: "#64748B", marginTop: 8,
                overflow: "auto", maxHeight: 200, whiteSpace: "pre-wrap" }}>
                {stack}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()}
              style={{ padding: "9px 20px", background: "#F59E0B", color: "#0D1B2A",
                border: "none", borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              🔄 Ricarica
            </button>
            <button onClick={() => {
                try { localStorage.clear(); } catch {}
                sessionStorage.clear();
                window.location.reload();
              }}
              style={{ padding: "9px 20px", background: "transparent",
                border: "1px solid #475569", color: "#94A3B8",
                borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
              🧹 Pulisci cache e ricarica
            </button>
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "#475569" }}>
            Copia questo errore e mandalo al supporto se il problema persiste.
          </div>
        </div>
      </div>
    );
  }
}
