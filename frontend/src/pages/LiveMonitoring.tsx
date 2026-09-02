import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLiveSensorData } from "../hooks/SensorDataContext";
import RiskBadge from "../components/RiskBadge";
import { toRiskLevel } from "../types";

export default function LiveMonitoring() {
  const live = useLiveSensorData();
  const selected = live.selectedNode || (live.nodes[0] ?? "MS-1");
  const reading = live.latest;
  const history = live.history;
  const risk = live.risk;

  const tilt = reading ? reading.tilt_angle.toFixed(2) : "—";
  const disp = reading ? reading.distance.toFixed(1) : "—";
  const vib = reading ? reading.vibration.toFixed(3) : "—";
  const temp = reading ? reading.temperature.toFixed(1) : "—";
  const pressure = reading?.pressure == null ? "Unavailable" : `${reading.pressure.toFixed(1)} hPa`;
  const riskScoreText = risk ? `${risk.risk_score} / 100` : "—";

  const tiltData = history.map(item => ({
    t: item.timestamp,
    v: item.tilt_angle,
  }));

  const dispData = history.map(item => ({
    t: item.timestamp,
    v: parseFloat(item.distance.toFixed(2)),
  }));

  const isLive = live.status === "LIVE";
  const statusColor = isLive ? "#32D583" : "#FF4D5A";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>Live Monitoring</h1>
          <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>Gateway packets and risk analysis refresh every second</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="blink" style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block" }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, letterSpacing: "0.1em" }}>{live.status}</span>
        </div>
      </div>

      {/* Node selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {live.nodes.length > 0 ? live.nodes.map(nodeId => {
          const isSel = selected === nodeId;
          const nodeRisk = live.allNodesRisk.find(r => r.node_id === nodeId);
          const rLevel = toRiskLevel(nodeRisk?.risk_level);
          const rc: Record<string, string> = { normal: "#32D583", warning: "#F5C451", high: "#F28C38", critical: "#FF4D5A" };
          const color = rc[rLevel] || "#32D583";
          return (
            <button key={nodeId} onClick={() => live.setSelectedNode(nodeId)} style={{
              padding: "6px 14px", borderRadius: 6,
              border: `1px solid ${isSel ? color : "#263542"}`,
              background: isSel ? `${color}18` : "#111A23",
              color: isSel ? color : "#60717E",
              fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>{nodeId}</button>
          );
        }) : (
          <div style={{ color: "#60717E", fontSize: 12 }}>Waiting for nodes from backend...</div>
        )}
      </div>

      {/* Key metrics */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "TILT", value: reading ? `${tilt}°` : "No data", color: "#27B7D7" },
          { label: "DISPLACEMENT", value: reading ? `${disp} mm` : "No data", color: "#F28C38" },
          { label: "VIBRATION", value: reading ? `${vib} g` : "No data", color: "#32D583" },
          { label: "TEMPERATURE", value: reading ? `${temp}°C` : "No data", color: "#94A3AE" },
          { label: "PRESSURE", value: reading ? pressure : "No data", color: "#94A3AE" },
          { label: "STATUS", value: live.status, color: statusColor },
          { label: "RISK SCORE", value: risk ? riskScoreText : "Insufficient data", color: (risk?.risk_score ?? 0) > 60 ? "#F28C38" : "#32D583" },
        ].map(m => (
          <div key={m.label} style={{ flex: 1, background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#60717E", letterSpacing: "0.08em", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Live charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { title: "TILT (LIVE)", data: tiltData, color: "#27B7D7", unit: "°" },
          { title: "DISPLACEMENT (LIVE)", data: dispData, color: "#F28C38", unit: " mm" },
        ].map(({ title, data, color, unit }) => (
          <div key={title} style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em" }}>{title}</span>
              <span style={{ fontSize: 10, color: "#60717E" }}>Node {selected}</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="#1B2733" strokeDasharray="3 3"/>
                <XAxis dataKey="t" tick={false}/>
                <YAxis tick={{ fontSize: 9, fill: "#60717E", fontFamily: "JetBrains Mono" }}/>
                <Tooltip
                  contentStyle={{ background: "#16212C", border: "1px solid #30404D", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: any) => [`${typeof v === "number" ? v.toFixed(2) : v}${unit}`, title]}
                  labelFormatter={() => ""}
                />
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #1B2733", fontSize: 11, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em" }}>ALL NODES · CURRENT STATUS</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0B1117" }}>
                {["NODE", "TILT", "DISPLACEMENT", "VIBRATION", "RISK"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em", borderBottom: "1px solid #1B2733" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(live.allNodesLatest.length > 0 ? live.allNodesLatest : (live.latest ? [live.latest] : [])).length > 0 ? (
                (live.allNodesLatest.length > 0 ? live.allNodesLatest : (live.latest ? [live.latest] : [])).map(n => {
                  const nodeRisk = live.allNodesRisk.find(r => r.node_id === n.node_id) || live.risk;
                  const rLevel = toRiskLevel(nodeRisk?.risk_level);
                  const nTilt = n.tilt_angle.toFixed(2);
                  return (
                    <tr key={n.id} onClick={() => live.setSelectedNode(n.node_id)}
                      style={{ cursor: "pointer", background: selected === n.node_id ? "#16212C" : "transparent" }}>
                      <td style={{ padding: "8px 14px", fontFamily: "JetBrains Mono", fontWeight: 600, color: "#E8EEF2" }}>{n.node_id}</td>
                      <td style={{ padding: "8px 14px", fontFamily: "JetBrains Mono", color: "#94A3AE" }}>{nTilt}°</td>
                      <td style={{ padding: "8px 14px", fontFamily: "JetBrains Mono", color: "#94A3AE" }}>{n.distance.toFixed(1)} mm</td>
                      <td style={{ padding: "8px 14px" }}>
                        <span style={{ color: "#32D583", fontWeight: 600, fontSize: 11 }}>{n.vibration.toFixed(3)}</span>
                      </td>
                      <td style={{ padding: "8px 14px" }}><RiskBadge level={rLevel} size="xs"/></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#60717E" }}>
                    {live.loading ? "Loading nodes..." : "No sensor readings received yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
