import { useEffect, useState } from "react";
import { useLiveSensorData } from "../hooks/SensorDataContext";
import { api, type StoredAlert } from "../services/api";

const SEV_COLOR: Record<string, string> = { critical: "#FF4D5A", warning: "#F5C451", info: "#2F80ED" };

export default function Alerts() {
  const live = useLiveSensorData();
  const [alerts, setAlerts] = useState<StoredAlert[]>([]);

  useEffect(() => {
    api.alerts("MS-1").then(setAlerts).catch(() => undefined);
  }, [live.latest?.id]);

  function acknowledge(id: number) {
    api.acknowledgeAlert(id).then(updated => setAlerts(prev => prev.map(alert => alert.id === id ? updated : alert))).catch(() => undefined);
  }

  const displayAlerts = alerts.map(alert => {
        const severity: "critical" | "warning" = alert.severity === "CRITICAL" ? "critical" : "warning";
        return {
          id: alert.id,
          severity,
          nodeId: alert.node_id,
          panel: `Panel-B`,
          title: alert.reasons[0] || alert.trigger,
          description: alert.reasons.join(". ") || alert.trigger,
          riskScore: alert.risk_score,
          indicators: alert.reasons.length > 0 ? alert.reasons : [alert.trigger],
          timestamp: new Date(alert.timestamp).toLocaleTimeString(),
          acknowledged: alert.acknowledged,
          recommendation: severity === "critical"
            ? "Immediate field verification recommended. Inspect strata convergence and verify node stability."
            : "Monitor deformation rate over the next observation interval.",
        };
      });

  const active = displayAlerts.filter(a => !a.acknowledged);
  const critical = active.filter(a => a.severity === "critical").length;
  const warning = active.filter(a => a.severity === "warning").length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>Alert Center</h1>
        <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>Active warnings and recommendations from backend risk engine</p>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "ACTIVE ALERTS", value: active.length, color: "#E8EEF2" },
          { label: "CRITICAL", value: critical, color: "#FF4D5A" },
          { label: "WARNING", value: warning, color: "#F5C451" },
          { label: "ACKNOWLEDGED", value: displayAlerts.filter(a => a.acknowledged).length, color: "#60717E" },
        ].map(c => (
          <div key={c.label} style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#60717E", letterSpacing: "0.08em", fontWeight: 600 }}>{c.label}</span>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 32, fontWeight: 700, color: c.color }}>{String(c.value).padStart(2, "0")}</span>
          </div>
        ))}
      </div>

      {/* Alert cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {displayAlerts.length > 0 ? (
          displayAlerts.map(alert => (
            <div key={alert.id} className={!alert.acknowledged ? "slide-in" : ""} style={{
              background: "#111A23", border: `1px solid ${alert.acknowledged ? "#263542" : SEV_COLOR[alert.severity] + "44"}`,
              borderRadius: 10, padding: 16, opacity: alert.acknowledged ? 0.6 : 1,
              borderLeft: `3px solid ${alert.acknowledged ? "#263542" : SEV_COLOR[alert.severity]}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    background: SEV_COLOR[alert.severity] + "18",
                    border: `1px solid ${SEV_COLOR[alert.severity]}33`,
                    color: SEV_COLOR[alert.severity], borderRadius: 4,
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", letterSpacing: "0.08em",
                  }}>{alert.severity.toUpperCase()}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#E8EEF2" }}>{alert.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#60717E" }}>{alert.timestamp}</span>
                  {alert.acknowledged && <span style={{ fontSize: 10, color: "#60717E", background: "#16212C", border: "1px solid #263542", borderRadius: 4, padding: "2px 6px" }}>ACKNOWLEDGED</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#94A3AE", marginBottom: 8, lineHeight: 1.5 }}>{alert.description}</div>
                  <div style={{ fontSize: 11, color: "#60717E", marginBottom: 4 }}>Panel: <span style={{ color: "#94A3AE" }}>{alert.panel}</span> · Node: <span style={{ color: "#27B7D7", fontFamily: "JetBrains Mono" }}>{alert.nodeId}</span> · Risk Score: <span style={{ color: SEV_COLOR[alert.severity], fontFamily: "JetBrains Mono", fontWeight: 600 }}>{alert.riskScore} / 100</span></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {alert.indicators.map(ind => (
                      <span key={ind} style={{ background: "#16212C", border: "1px solid #263542", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#94A3AE" }}>
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ width: 200, flexShrink: 0, background: "#0B1117", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#2F80ED", fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>RECOMMENDED ACTION</div>
                  <p style={{ fontSize: 12, color: "#94A3AE", margin: 0, lineHeight: 1.5 }}>{alert.recommendation}</p>
                </div>
              </div>

              {!alert.acknowledged && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #1B2733" }}>
                  <button onClick={() => acknowledge(alert.id)} style={{ padding: "6px 14px", background: "#16212C", border: "1px solid #30404D", borderRadius: 6, color: "#E8EEF2", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>ACKNOWLEDGE</button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "24px", textAlign: "center", color: "#60717E" }}>
            No active alerts detected. All monitored node parameters are currently within normal thresholds.
          </div>
        )}
      </div>
    </div>
  );
}
