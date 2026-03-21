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
  onToggleRecording?: () => void;
};

function formatStatus(status: PopupState["bridgeStatus"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function App({
  state,
  onCopy,
  onCopyCookies,
  onToggleRecording
}: AppProps) {
  const copyText = buildAiBundleText(state);
  const isRecording = state.recordingActive;
  const statusLabel = isRecording ? "Recording" : formatStatus(state.bridgeStatus);
  const recordingLabel = isRecording
    ? `Recording · ${state.recordingCount}`
    : `Ready · ${state.recordingCount}`;
  const cookiePreview = previewCookieHeader(state.cookieHeader);

  return (
    <main
      style={{
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
        gap: 16
      }}
    >
      <style>
        {`
          @keyframes bridge-recording-breathe {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.36); }
            70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          .bridge-recording-dot {
            animation: bridge-recording-breathe 2s infinite;
          }
        `}
      </style>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.45px",
              color: "#111827",
              lineHeight: 1.2
            }}
          >
            Browser Bridge
          </h1>
          <div
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 4
            }}
          >
            {state.bridgeUrl}
          </div>
        </div>

        <button
          type="button"
          onClick={state.target ? onToggleRecording : undefined}
          disabled={!state.target}
          aria-label={recordingLabel}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            borderRadius: 999,
            border: `1px solid ${isRecording ? "#FCA5A5" : "#E5E7EB"}`,
            backgroundColor: isRecording ? "#FEF2F2" : "#FFFFFF",
            color: isRecording ? "#DC2626" : "#374151",
            fontSize: 12,
            fontWeight: 600,
            cursor: state.target ? "pointer" : "default",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            transition: "all 0.2s ease",
            minWidth: 112,
            justifyContent: "flex-start"
          }}
        >
          <span
            className={isRecording ? "bridge-recording-dot" : undefined}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isRecording ? "#EF4444" : "#10B981",
              flexShrink: 0
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              lineHeight: 1.15
            }}
          >
            <span>{statusLabel}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                opacity: 0.82
              }}
            >
              {recordingLabel}
            </span>
          </div>
        </button>
      </header>

      {state.target ? (
        <>
          <section style={cardStyle}>
            <div style={eyebrowStyle}>Active Target</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.2,
                letterSpacing: "-0.5px",
                marginBottom: 4,
                wordBreak: "break-word"
              }}
            >
              {state.target.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#4B5563",
                marginBottom: 16
              }}
            >
              {state.target.origin}
            </div>
            <div
              style={{
                fontSize: 12,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: "#6B7280",
                backgroundColor: "#F9FAFB",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                wordBreak: "break-all"
              }}
            >
              {state.target.targetId}
            </div>
          </section>

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}
          >
            <section style={{ ...cardStyle, padding: "14px 16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 8
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151"
                  }}
                >
                  Cookie Snapshot
                </span>
                <button
                  type="button"
                  onClick={onCopyCookies}
                  style={secondaryButtonStyle}
                >
                  Copy Cookie
                </button>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  backgroundColor: "#F9FAFB",
                  padding: "6px 8px",
                  borderRadius: 4,
                  border: "1px solid #E5E7EB"
                }}
              >
                {cookiePreview || "No cookies available"}
              </div>
            </section>

            <section style={{ ...cardStyle, padding: "14px 16px" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8
                }}
              >
                Log Access
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#111827",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  backgroundColor: "#F9FAFB",
                  padding: "6px 8px",
                  borderRadius: 4,
                  border: "1px solid #E5E7EB"
                }}
              >
                bridge://recording/{state.target.targetId}
              </div>
            </section>
          </section>

          <button
            type="button"
            onClick={() => onCopy(copyText)}
            style={primaryButtonStyle}
          >
            Copy For AI
          </button>
        </>
      ) : (
        <section
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              border: "1px solid #E5E7EB"
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 18,
                border: "2px solid #9CA3AF"
              }}
            />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 8
            }}
          >
            Waiting for target...
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
              lineHeight: 1.5
            }}
          >
            Open a normal web page to register a target. Data snapshot will appear
            here.
          </div>
        </section>
      )}
    </main>
  );
}

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6B7280",
  marginBottom: 8
};

const cardStyle: CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  padding: 18,
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
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
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  transition: "background-color 0.2s ease"
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
  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  transition: "all 0.2s ease"
};
