import { useState, useEffect } from "react";
import type { Reading } from "../services/api";

export default function Header({ alertCount = 0, status, latest, lastSyncAgo }: { alertCount?: number; status?: string; latest?: Reading; lastSyncAgo?: string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const critical = alertCount;
  const isLive = status === "LIVE";
  const statusColor = isLive ? "#32D583" : "#FF4D5A";
  const statusLabel = isLive ? "LIVE MONITORING" : status === "OFFLINE" ? "OFFLINE" : "CONNECTING";

  return (
    <header style={{
      height: 52, background: "#0B1117",
      borderBottom: "1px solid #263542",
      display: "flex", alignItems: "center",
      padding: "0 20px", gap: 16, flexShrink: 0,
    }}>
      {/* Site selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#E8EEF2" }}>Jharia Coalfield</span>
        <span style={{ color: "#60717E", fontSize: 13 }}>—</span>
        <span style={{ fontSize: 13, color: "#94A3AE" }}>Panel A</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "#60717E" }}>
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      <div style={{ width: 1, height: 24, background: "#263542" }}/>

      {/* Live status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="blink" style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block" }}/>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: statusColor }}>{statusLabel}</span>
      </div>

      <div style={{ fontSize: 11, color: "#60717E" }}>Last sync <span style={{ color: "#94A3AE", fontFamily: "JetBrains Mono" }}>{lastSyncAgo || "—"}</span></div>

      <div style={{ flex: 1 }}/>

      {/* Critical alert banner */}
      {critical > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,77,90,0.08)", border: "1px solid rgba(255,77,90,0.25)",
          borderRadius: 6, padding: "4px 10px",
        }}>
          <span style={{ fontSize: 11, color: "#FF4D5A", fontWeight: 600 }}>⚠ {critical} CRITICAL ALERT{critical > 1 ? "S" : ""}</span>
        </div>
      )}

      {/* Datetime */}
      <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#60717E" }}>
        {time.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        {" "}
        <span style={{ color: "#94A3AE" }}>{time.toLocaleTimeString("en-IN", { hour12: false })}</span>
      </div>

      {/* Notification icon */}
      <button style={{
        position: "relative", background: "transparent", border: "none", cursor: "pointer",
        color: "#60717E", padding: "4px",
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2a5 5 0 0 1 5 5v2l1.5 2.5H2.5L4 9V7a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
          <path d="M7 14.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        {alertCount > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0, width: 8, height: 8,
            borderRadius: "50%", background: "#FF4D5A",
            border: "1px solid #0B1117",
          }}/>
        )}
      </button>

      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "#16212C", border: "1px solid #263542",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600, color: "#2F80ED",
        cursor: "pointer",
      }}>MO</div>
    </header>
  );
}
