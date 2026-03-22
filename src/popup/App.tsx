import type { CSSProperties } from "react";
import {
  buildAiBundleText,
  previewCookieHeader,
  type PopupState
} from "./hooks";

type AppProps = {
  state: PopupState;
  onCopy: (value: string) => void;
  onCopyCookies?: () => void;
  onToggleBrowserAccess?: () => void;
  onToggleRecording?: () => void;
};

export function App({
  state,
  onCopy,
  onCopyCookies,
  onToggleBrowserAccess,
  onToggleRecording
}: AppProps) {
  const copyText = buildAiBundleText(state);
  const browserAccessLabel = state.browserAccessEnabled ? "On" : "Off";
  const bridgeHint = state.browserAccessEnabled
    ? state.bridgeStatus === "connected"
      ? "AI bridge connected"
      : "Waiting for local AI bridge"
    : "Browser access is paused";
  const cookiePreview = previewCookieHeader(state.cookieHeader);
  const canUseBridge = state.browserAccessEnabled && Boolean(state.target);
  const debugLabel = `Debug Count · ${state.recordingCount}`;

  return (
    <main style={mainStyle}>
      <style>
        {`
          @keyframes bridge-debug-breathe {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.44); }
            65% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }

          .bridge-debug-dot {
            animation: bridge-debug-breathe 1.8s infinite;
          }
        `}
      </style>

      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Browser Bridge</h1>
          <div style={bridgeUrlStyle}>{state.bridgeUrl}</div>
        </div>

        <div style={statusBadgeStyle(state.browserAccessEnabled)}>
          {browserAccessLabel}
        </div>
      </header>

      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Browser Access</div>
            <div style={cardTitleStyle}>{bridgeHint}</div>
          </div>

          <button
            type="button"
            role="switch"
            aria-label="Browser Access"
            aria-checked={state.browserAccessEnabled}
            onClick={onToggleBrowserAccess}
            style={switchStyle(state.browserAccessEnabled)}
          >
            <span style={switchThumbStyle(state.browserAccessEnabled)} />
          </button>
        </div>
      </section>

      {state.browserAccessEnabled ? (
        state.target ? (
          <>
            <section style={cardStyle}>
              <div style={eyebrowStyle}>Active Target</div>
              <div style={targetTitleStyle}>{state.target.title}</div>
              <div style={targetOriginStyle}>{state.target.origin}</div>
              <div style={targetIdStyle}>{state.target.targetId}</div>
            </section>

            <section style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={sectionTitleStyle}>Cookie Snapshot</span>
                <button type="button" onClick={onCopyCookies} style={secondaryButtonStyle}>
                  Copy Cookie
                </button>
              </div>
              <div style={cookiePreviewStyle}>{cookiePreview || "No cookies available"}</div>
            </section>

            <button type="button" onClick={() => onCopy(copyText)} style={primaryButtonStyle}>
              Copy For AI
            </button>
          </>
        ) : (
          <section style={{ ...cardStyle, ...emptyCardStyle }}>
            <div style={emptyTitleStyle}>Waiting for a browser tab</div>
            <div style={emptyBodyStyle}>
              Open a normal web page and it will appear here automatically.
            </div>
          </section>
        )
      ) : (
        <section style={{ ...cardStyle, ...emptyCardStyle }}>
          <div style={emptyTitleStyle}>Browser access is turned off</div>
          <div style={emptyBodyStyle}>
            Turn it back on to reconnect.
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={canUseBridge ? onToggleRecording : undefined}
        disabled={!canUseBridge}
        aria-label={debugLabel}
        style={debugButtonStyle(state.recordingActive, canUseBridge)}
      >
        <span
          className={state.recordingActive ? "bridge-debug-dot" : undefined}
          style={debugDotStyle(state.recordingActive)}
        />
        <span>{debugLabel}</span>
      </button>
    </main>
  );
}

const mainStyle: CSSProperties = {
  width: 360,
  padding: 16,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: "#111827",
  backgroundColor: "#F3F4F6",
  margin: 0,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 14
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: "-0.45px",
  color: "#111827",
  lineHeight: 1.2
};

const bridgeUrlStyle: CSSProperties = {
  fontSize: 12,
  color: "#6B7280",
  marginTop: 4
};

const cardStyle: CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6B7280",
  marginBottom: 8
};

const cardTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#111827"
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#374151"
};

const targetTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#111827",
  lineHeight: 1.2,
  letterSpacing: "-0.5px",
  marginBottom: 4,
  wordBreak: "break-word"
};

const targetOriginStyle: CSSProperties = {
  fontSize: 13,
  color: "#4B5563",
  marginBottom: 16
};

const targetIdStyle: CSSProperties = {
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  color: "#6B7280",
  backgroundColor: "#F9FAFB",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #E5E7EB",
  wordBreak: "break-all"
};

const cookiePreviewStyle: CSSProperties = {
  fontSize: 13,
  color: "#6B7280",
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  backgroundColor: "#F9FAFB",
  padding: "6px 8px",
  borderRadius: 4,
  border: "1px solid #E5E7EB",
  marginTop: 10
};

const primaryButtonStyle: CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 10,
  padding: "14px",
  backgroundColor: "#111827",
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow:
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #D1D5DB",
  borderRadius: 6,
  padding: "4px 10px",
  backgroundColor: "#FFFFFF",
  color: "#374151",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
};

const emptyCardStyle: CSSProperties = {
  textAlign: "center",
  padding: "40px 24px"
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#111827",
  marginBottom: 8
};

const emptyBodyStyle: CSSProperties = {
  fontSize: 13,
  color: "#6B7280",
  lineHeight: 1.5
};

function statusBadgeStyle(enabled: boolean): CSSProperties {
  return {
    padding: "7px 11px",
    borderRadius: 999,
    backgroundColor: enabled ? "#DCFCE7" : "#F3F4F6",
    color: enabled ? "#166534" : "#6B7280",
    border: `1px solid ${enabled ? "#BBF7D0" : "#E5E7EB"}`,
    fontSize: 12,
    fontWeight: 700,
    minWidth: 44,
    textAlign: "center"
  };
}

function switchStyle(enabled: boolean): CSSProperties {
  return {
    position: "relative",
    width: 50,
    height: 30,
    borderRadius: 999,
    border: "none",
    backgroundColor: enabled ? "#111827" : "#D1D5DB",
    padding: 0,
    cursor: "pointer",
    flexShrink: 0
  };
}

function switchThumbStyle(enabled: boolean): CSSProperties {
  return {
    position: "absolute",
    top: 4,
    left: enabled ? 24 : 4,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.18)",
    transition: "left 0.2s ease"
  };
}

function debugButtonStyle(active: boolean, enabled: boolean): CSSProperties {
  return {
    border: "1px solid #E5E7EB",
    borderRadius: 999,
    padding: "10px 12px",
    backgroundColor: active ? "#FEF2F2" : "#FFFFFF",
    color: active ? "#B91C1C" : "#6B7280",
    fontSize: 12,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: enabled ? 1 : 0.55
  };
}

function debugDotStyle(active: boolean): CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: active ? "#EF4444" : "#9CA3AF",
    boxShadow: active ? "0 0 8px rgba(239, 68, 68, 0.75)" : "none"
  };
}
