const REPORT_TYPES = [
  { label: "Daily Monitoring Report", sub: "24-hour sensor summary with trends", icon: "📋", lastGen: "Today, 06:00" },
  { label: "Weekly Deformation Report", sub: "7-day deformation analysis and comparison", icon: "📊", lastGen: "2026-08-17" },
  { label: "Incident Report", sub: "Event-based report for alert conditions", icon: "⚠", lastGen: "2026-08-24, 14:32" },
  { label: "Sensor Health Report", sub: "Battery, signal, and calibration status", icon: "🔧", lastGen: "2026-08-23" },
  { label: "AI Risk Summary", sub: "AI model output and anomaly analysis", icon: "◈", lastGen: "Today, 14:30" },
];

export default function Reports() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>Generate, export, and manage monitoring reports</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {REPORT_TYPES.map(rt => (
          <div key={rt.label} style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{rt.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EEF2" }}>{rt.label}</div>
                <div style={{ fontSize: 11, color: "#60717E", marginTop: 2 }}>{rt.sub}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#60717E", marginBottom: 14 }}>
              Last generated: <span style={{ color: "#94A3AE", fontFamily: "JetBrains Mono" }}>{rt.lastGen}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, padding: "7px 0", background: "#2F80ED", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Generate
              </button>
              <button style={{ padding: "7px 12px", background: "#16212C", border: "1px solid #263542", borderRadius: 6, color: "#94A3AE", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                PDF
              </button>
              <button style={{ padding: "7px 12px", background: "#16212C", border: "1px solid #263542", borderRadius: 6, color: "#94A3AE", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em", marginBottom: 12 }}>QUICK ACTIONS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {["Export All Data", "Generate Report", "View Active Alerts", "Configure Thresholds", "Download Sensor Logs"].map(action => (
            <button key={action} style={{
              padding: "8px 16px", background: "#16212C",
              border: "1px solid #263542", borderRadius: 6,
              color: "#94A3AE", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "#2F80ED"; (e.target as HTMLButtonElement).style.color = "#2F80ED"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "#263542"; (e.target as HTMLButtonElement).style.color = "#94A3AE"; }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
