import { useLiveSensorData } from "../hooks/SensorDataContext";
import RiskBadge from "../components/RiskBadge";
import { toRiskLevel } from "../types";

export default function SensorNetwork() {
  const live = useLiveSensorData();
  const nodes = live.allNodesLatest.length > 0 ? live.allNodesLatest : (live.latest ? [live.latest] : []);
  const online = nodes.filter(n => Date.now() - new Date(n.timestamp).getTime() <= 30000).length;
  const total = nodes.length;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>Sensor Network</h1>
          <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>{online} / {total} nodes online · Jharia Coalfield Panel A</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["ONLINE", "#32D583", online], ["OFFLINE", "#FF4D5A", Math.max(0, total - online)]].map(([l, c, v]) => (
            <div key={l as string} style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: c as string, display: "inline-block" }}/>
              <span style={{ fontSize: 11, fontWeight: 600, color: c as string }}>{v as number} {l as string}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {nodes.length > 0 ? (
          nodes.map(node => {
            const isOnline = Date.now() - new Date(node.timestamp).getTime() <= 30000;
            const nodeRisk = live.allNodesRisk.find(r => r.node_id === node.node_id);
            const riskLevel = toRiskLevel(nodeRisk?.risk_level);
            const tiltVal = node.tilt_angle.toFixed(2);
            return (
              <div key={node.id} style={{
                background: "#111A23", border: `1px solid ${riskLevel === "high" ? "#F28C3844" : riskLevel === "critical" ? "#FF4D5A44" : "#263542"}`,
                borderRadius: 10, padding: 14,
                borderTop: `2px solid ${!isOnline ? "#263542" : riskLevel === "high" ? "#F28C38" : riskLevel === "critical" ? "#FF4D5A" : riskLevel === "warning" ? "#F5C451" : "#32D583"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: "#E8EEF2" }}>{node.node_id}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <span className={isOnline ? "blink" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "#32D583" : "#FF4D5A", display: "inline-block" }}/>
                      <span style={{ fontSize: 10, fontWeight: 600, color: isOnline ? "#32D583" : "#FF4D5A" }}>{isOnline ? "ONLINE" : "OFFLINE"}</span>
                    </div>
                  </div>
                  <RiskBadge level={riskLevel} size="xs"/>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginBottom: 10 }}>
                  {[
                    ["Tilt", `${tiltVal}°`],
                    ["Displacement", `${node.distance.toFixed(1)} mm`],
                    ["Temperature", `${node.temperature.toFixed(1)}°C`],
                    ["Humidity", `${node.humidity.toFixed(1)}%`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, color: "#60717E" }}>{l}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 500, color: "#E8EEF2" }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 8 }}>
                  <div>
                    <span style={{ color: "#60717E" }}>Vibration: </span>
                    <span style={{ color: "#32D583", fontWeight: 600 }}>{node.vibration.toFixed(3)} g</span>
                  </div>
                  <div>
                    <span style={{ color: "#60717E" }}>Risk Score: </span>
                    <span style={{ color: "#E8EEF2", fontWeight: 600 }}>{nodeRisk ? `${nodeRisk.risk_score}/100` : "—"}</span>
                  </div>
                </div>

                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1B2733", fontSize: 10, color: "#60717E" }}>
                  Last comm: <span style={{ color: "#94A3AE", fontFamily: "JetBrains Mono" }}>{new Date(node.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: "1 / -1", background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: 24, textAlign: "center", color: "#60717E" }}>
            {live.loading ? "Loading nodes from backend..." : "No active nodes detected from gateway."}
          </div>
        )}
      </div>

      {/* IoT Architecture */}
      <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "14px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em", marginBottom: 14 }}>HARDWARE / IoT ARCHITECTURE</div>
        <div style={{ display: "flex", gap: 0, alignItems: "stretch", overflowX: "auto" }}>
          {[
            { label: "SENSOR NODE", sub: "ESP32 + MPU6050 + ADXL345", color: "#F28C38", icon: "◉" },
            { label: "RF / WI-FI LINK", sub: "2.4 GHz IoT Protocol", color: "#27B7D7", icon: "〰" },
            { label: "GATEWAY", sub: "Ingestion Server", color: "#2F80ED", icon: "⊡" },
            { label: "FASTAPI BACKEND", sub: "Persistence & AI Engine", color: "#94A3AE", icon: "⤴" },
            { label: "ISOLATION FOREST", sub: "Real Anomaly Scoring", color: "#32D583", icon: "⬡" },
            { label: "MineSentinel AI", sub: "Real-time Telemetry UI", color: "#2F80ED", icon: "▦" },
          ].map((step, i, arr) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <div style={{ background: "#16212C", border: `1px solid ${step.color}44`, borderRadius: 8, padding: "10px 14px", textAlign: "center", minWidth: 120 }}>
                <div style={{ fontSize: 18, marginBottom: 4, color: step.color }}>{step.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#E8EEF2" }}>{step.label}</div>
                <div style={{ fontSize: 10, color: "#60717E", marginTop: 2 }}>{step.sub}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 6px" }}>
                  <div style={{ width: 30, height: 1, background: "#263542" }}/>
                  <div style={{ fontSize: 12, color: "#60717E" }}>›</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
