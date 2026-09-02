import { useState } from "react";

type Page = "overview" | "monitoring" | "map" | "ai" | "alerts" | "sensors" | "analytics" | "reports" | "settings";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "overview",   label: "Overview",        icon: "▦" },
  { id: "monitoring", label: "Live Monitoring",  icon: "◎" },
  { id: "map",        label: "Mine Map",         icon: "⊞" },
  { id: "ai",        label: "AI Analysis",       icon: "◈" },
  { id: "alerts",    label: "Alerts",            icon: "△" },
  { id: "sensors",   label: "Sensor Network",    icon: "⋯" },
  { id: "analytics", label: "Analytics",         icon: "∿" },
  { id: "reports",   label: "Reports",           icon: "☰" },
  { id: "settings",  label: "Settings",          icon: "⚙" },
];

interface Props {
  current: Page;
  onChange: (p: Page) => void;
  alertCount?: number;
  backendOnline?: boolean;
  lastSyncAgo?: string;
}

export default function Sidebar({ current, onChange, alertCount = 0, backendOnline = true, lastSyncAgo }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? 56 : 220,
      minWidth: collapsed ? 56 : 220,
      background: "#0B1117",
      borderRight: "1px solid #263542",
      display: "flex", flexDirection: "column",
      transition: "width 0.22s ease, min-width 0.22s ease",
      overflow: "hidden",
      position: "relative",
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "18px 0" : "18px 16px",
        borderBottom: "1px solid #263542",
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: collapsed ? "center" : "flex-start",
      }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="6" fill="#16212C"/>
            <line x1="5" y1="10" x2="25" y2="10" stroke="#263542" strokeWidth="1"/>
            <line x1="5" y1="16" x2="25" y2="16" stroke="#263542" strokeWidth="1"/>
            <line x1="5" y1="22" x2="25" y2="22" stroke="#263542" strokeWidth="1"/>
            <circle cx="15" cy="10" r="2.5" fill="#2F80ED"/>
            <circle cx="10" cy="16" r="2.5" fill="#27B7D7"/>
            <circle cx="20" cy="16" r="2.5" fill="#F28C38"/>
            <line x1="15" y1="10" x2="10" y2="16" stroke="#2F80ED" strokeWidth="1" strokeOpacity="0.6"/>
            <line x1="10" y1="16" x2="20" y2="16" stroke="#27B7D7" strokeWidth="1" strokeOpacity="0.6"/>
            <path d="M15 7 L18 13 H12 Z" fill="#FF4D5A" fillOpacity="0.7"/>
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", color: "#E8EEF2" }}>MINESENTINEL</div>
            <div style={{ fontWeight: 400, fontSize: 10, color: "#2F80ED", letterSpacing: "0.12em" }}>AI SYSTEM</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {NAV.map(item => {
          const active = current === item.id;
          return (
            <button key={item.id} onClick={() => onChange(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: collapsed ? "10px 0" : "10px 16px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "#16212C" : "transparent",
                borderLeft: active ? "2px solid #2F80ED" : "2px solid transparent",
                color: active ? "#E8EEF2" : "#60717E",
                cursor: "pointer", borderTop: "none", borderRight: "none", borderBottom: "none",
                fontSize: 13, fontWeight: active ? 500 : 400,
                fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 15, opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.id === "alerts" && alertCount > 0 && (
                <span style={{
                  marginLeft: "auto", background: "#FF4D5A",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                  borderRadius: 10, padding: "1px 6px",
                }}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #263542", padding: collapsed ? "12px 0" : "12px 16px" }}>
        {!collapsed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="blink" style={{ width: 7, height: 7, borderRadius: "50%", background: backendOnline ? "#32D583" : "#FF4D5A", display: "inline-block" }}/>
              <span style={{ fontSize: 11, color: backendOnline ? "#32D583" : "#FF4D5A", fontWeight: 600 }}>
                {backendOnline ? "SYSTEM ONLINE" : "BACKEND OFFLINE"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#60717E" }}>Gateway: <span style={{ color: "#94A3AE" }}>{backendOnline ? "Connected" : "Disconnected"}</span></div>
            <div style={{ fontSize: 11, color: "#60717E" }}>Last sync: <span style={{ color: "#94A3AE", fontFamily: "JetBrains Mono" }}>{lastSyncAgo || "—"}</span></div>
            <div style={{ fontSize: 11, color: "#60717E", marginTop: 4 }}>Mine Operations</div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span className="blink" style={{ width: 7, height: 7, borderRadius: "50%", background: backendOnline ? "#32D583" : "#FF4D5A", display: "inline-block" }}/>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(c => !c)}
        style={{
          position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)",
          width: 24, height: 24, borderRadius: "50%",
          background: "#16212C", border: "1px solid #263542",
          color: "#60717E", cursor: "pointer", fontSize: 11,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 20,
        }}
      >
        {collapsed ? "›" : "‹"}
      </button>
    </aside>
  );
}
