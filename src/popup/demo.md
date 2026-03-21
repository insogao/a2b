import React, { useState, type CSSProperties } from "react";

// 模拟状态与方法以支持在当前环境中独立预览
export type PopupState = {
  bridgeStatus: string;
  recordingActive: boolean;
  recordingCount: number;
  bridgeUrl: string;
  target: {
    title: string;
    origin: string;
    targetId: string;
  } | null;
  cookieHeader: string;
};

function buildAiBundleText(state: PopupState) {
  return "mock_ai_bundle_data";
}

function previewCookieHeader(cookieHeader: string) {
  return cookieHeader;
}

type AppProps = {
  state?: PopupState;
  onCopy?: (value: string) => void;
  onCopyCookies?: () => void;
  onToggleRecording?: () => void;
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function App(props: AppProps) {
  const { onCopy = () => {}, onCopyCookies = () => {}, onToggleRecording } = props;
  
  const [isRecording, setIsRecording] = useState(props.state?.recordingActive ?? true);

  const state = props.state || {
    bridgeStatus: "connected",
    recordingActive: isRecording,
    recordingCount: 0,
    bridgeUrl: "ws://127.0.0.1:46321/ws",
    target: {
      title: "Google Gemini",
      origin: "https://gemini.google.com",
      targetId: "session-aa8af632-tab-482670830",
    },
    cookieHeader: "__Secure-BUCKET=CNoD; SEARC...",
  };

  const copyText = buildAiBundleText(state);
  const statusLabel = isRecording ? "Recording" : formatStatus(state.bridgeStatus);
  const cookiePreview = previewCookieHeader(state.cookieHeader);

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    if (onToggleRecording) onToggleRecording();
  };

  return (
    <main
      style={{
        width: 360,
        padding: 16,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: "#111827",
        backgroundColor: "#F3F4F6", // 整体采用浅灰底色，区分内容卡片
        margin: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* 注入呼吸灯动画的关键帧 */}
      <style>
        {`
          @keyframes breathe {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          .recording-dot {
            animation: breathe 2s infinite;
            background-color: #EF4444;
          }
          .ready-dot {
            background-color: #10B981;
          }
        `}
      </style>

      {/* 顶部 Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "#111827",
              lineHeight: 1.2,
            }}
          >
            Browser Bridge
          </h1>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
            {state.bridgeUrl || "ws://..."}
          </div>
        </div>
        
        <button
          type="button"
          onClick={state.target ? handleToggleRecording : undefined}
          disabled={!state.target}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            border: `1px solid ${isRecording ? "#FCA5A5" : "#E5E7EB"}`,
            backgroundColor: isRecording ? "#FEF2F2" : "#FFFFFF",
            color: isRecording ? "#DC2626" : "#374151",
            fontSize: 12,
            fontWeight: 600,
            cursor: state.target ? "pointer" : "default",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            transition: "all 0.2s ease",
          }}
        >
          <span
            className={isRecording ? "recording-dot" : "ready-dot"}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span>{statusLabel}</span>
            {isRecording && (
              <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
                Events · {state.recordingCount}
              </span>
            )}
          </div>
        </button>
      </header>

      {/* 主体内容 */}
      {state.target ? (
        <>
          {/* Target 信息卡片 */}
          <section style={cardStyle}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6B7280",
                marginBottom: 8,
              }}
            >
              Active Target
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.2,
                letterSpacing: "-0.5px",
                marginBottom: 4,
                wordBreak: "break-word",
              }}
            >
              {state.target.title}
            </div>
            <div style={{ fontSize: 13, color: "#4B5563", marginBottom: 16 }}>
              {state.target.origin}
            </div>
            <div
              style={{
                fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: "#6B7280",
                backgroundColor: "#F9FAFB",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                wordBreak: "break-all",
              }}
            >
              {state.target.targetId}
            </div>
          </section>

          {/* 数据与日志区域 */}
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...cardStyle, padding: "14px 16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
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
                  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  backgroundColor: "#F9FAFB",
                  padding: "6px 8px",
                  borderRadius: 4,
                  border: "1px solid #E5E7EB",
                }}
              >
                {cookiePreview || "No cookies available"}
              </div>
            </div>

            <div style={{ ...cardStyle, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Log Access
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#111827",
                  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  backgroundColor: "#F9FAFB",
                  padding: "6px 8px",
                  borderRadius: 4,
                  border: "1px solid #E5E7EB",
                }}
              >
                bridge://recording/{state.target.targetId}
              </div>
            </div>
          </section>

          {/* 核心操作按钮 */}
          <button
            type="button"
            onClick={() => onCopy(copyText)}
            style={primaryButtonStyle}
          >
            Copy Bundle for AI
          </button>
        </>
      ) : (
        /* 空状态 (未找到 Target) */
        <section
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
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
            }}
          >
            <span style={{ fontSize: 24 }}>🌐</span>
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 8,
            }}
          >
            Waiting for target...
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
            Open a normal web page to register a target. Data snapshot will appear here.
          </div>
        </section>
      )}
    </main>
  );
}

// --- 提炼的复用样式 ---

const cardStyle: CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  padding: 18,
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
};

const primaryButtonStyle: CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 10,
  padding: "14px",
  backgroundColor: "#111827", // 唯一的深色大色块，聚焦核心操作
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  transition: "background-color 0.2s ease",
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
  transition: "all 0.2s ease",
};