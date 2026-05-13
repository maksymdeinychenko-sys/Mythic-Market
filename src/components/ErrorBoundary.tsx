import React from "react";

interface State {
  err: Error | null;
}

/**
 * Last-resort error boundary. Catches any thrown error during render and shows
 * the message + a "Reset save" button so the user isn't stuck on a black
 * screen. In dev, the underlying error is also visible in the console / Vite
 * overlay; this boundary mainly helps when a stale persisted state collides
 * with a schema change.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[Mythic Market] crashed:", err, info);
  }

  resetSave = () => {
    try {
      localStorage.removeItem("mythic-market-state-v1");
    } catch {}
    location.reload();
  };

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{
        padding: 32,
        color: "var(--text-primary)",
        background: "var(--bg-deep)",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}>
        <h1 style={{ color: "var(--hp)", marginBottom: 16 }}>Something broke.</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
          This is usually a stale saved game from an older version. Resetting
          the save fixes it.
        </p>
        <pre style={{
          background: "var(--bg-panel)",
          padding: 12,
          borderRadius: 8,
          overflow: "auto",
          fontSize: 12,
          maxHeight: 220,
        }}>{String(this.state.err.stack ?? this.state.err.message)}</pre>
        <button
          className="mm-btn gold"
          style={{ marginTop: 16 }}
          onClick={this.resetSave}
        >
          Reset save & reload
        </button>
      </div>
    );
  }
}
