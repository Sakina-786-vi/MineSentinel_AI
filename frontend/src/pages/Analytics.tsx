import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useLiveSensorData } from "../hooks/SensorDataContext";
import { api, type Reading } from "../services/api";

type Range = "1H" | "6H" | "24H" | "7D" | "30D";
const RANGES: Range[] = ["1H", "6H", "24H", "7D", "30D"];

export default function Analytics() {
  const live = useLiveSensorData();
  const [range, setRange] = useState<Range>("24H");
  const [node, setNode] = useState<string>(live.selectedNode || (live.nodes[0] ?? "MS-1"));
  const [historyData, setHistoryData] = useState<Reading[]>(live.history);

  useEffect(() => {
    if (live.nodes.length > 0 && !live.nodes.includes(node)) {
      setNode(live.nodes[0]);
    }
  }, [live.nodes, node]);

  useEffect(() => {
    if (!node) return;
    const limit = range === "1H" ? 30 : range === "6H" ? 180 : range === "24H" ? 720 : 1000;
    api.history(node, limit)
      .then(res => setHistoryData(res))
      .catch(() => setHistoryData(live.history));
  }, [node, range, live.latest]);

  const data = historyData.map(item => {
    const tilt = item.tilt_angle;
    const displacement = parseFloat(item.distance.toFixed(2));
    const vibration = parseFloat(item.vibration.toFixed(3));
    const risk = live.risk?.risk_score ?? 0;
    return {
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      tilt,
      displacement,
      vibration,
      risk,
    };
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>Historical deformation analysis and trend review from real database</p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 1, background: "#111A23", border: "1px solid #263542", borderRadius: 6, padding: 2 }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "5px 12px", borderRadius: 4, border: "none",
              background: range === r ? "#2F80ED" : "transparent",
              color: range === r ? "#fff" : "#60717E",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{r}</button>
          ))}
        </div>
        <select value={node} onChange={e => { setNode(e.target.value); live.setSelectedNode(e.target.value); }} style={{
          background: "#111A23", border: "1px solid #263542", borderRadius: 6,
          color: "#E8EEF2", fontSize: 12, padding: "6px 10px", fontFamily: "JetBrains Mono",
        }}>
          {live.nodes.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "#60717E" }}>
          {historyData.length} records loaded from backend
        </span>
      </div>

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { title: "TILT TREND", dataKey: "tilt", color: "#27B7D7", unit: "°", ChartCmp: LineChart, LineCmp: Line },
          { title: "DISPLACEMENT TREND", dataKey: "displacement", color: "#F28C38", unit: " mm", ChartCmp: AreaChart, LineCmp: Area },
          { title: "VIBRATION TREND", dataKey: "vibration", color: "#F5C451", unit: " g", ChartCmp: LineChart, LineCmp: Line },
          { title: "RISK SCORE HISTORY", dataKey: "risk", color: "#FF4D5A", unit: " / 100", ChartCmp: AreaChart, LineCmp: Area },
        ].map(({ title, dataKey, color, unit, ChartCmp, LineCmp }) => (
          <div key={title} style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</div>
            <ResponsiveContainer width="100%" height={160}>
              <ChartCmp data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1B2733" strokeDasharray="3 3"/>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#60717E", fontFamily: "JetBrains Mono" }} interval="preserveStartEnd"/>
                <YAxis tick={{ fontSize: 9, fill: "#60717E", fontFamily: "JetBrains Mono" }}/>
                <Tooltip
                  contentStyle={{ background: "#16212C", border: "1px solid #30404D", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: any) => [`${typeof v === "number" ? v.toFixed(2) : v}${unit}`, title]}
                  labelStyle={{ color: "#60717E", fontFamily: "JetBrains Mono" }}
                />
                <LineCmp type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false}
                  fill={`url(#grad-${dataKey})`} isAnimationActive={false}/>
              </ChartCmp>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* AI Anomalies */}
      <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em", marginBottom: 12 }}>AI ANOMALY DETECTION · NORMAL BASELINE vs CURRENT</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="grad-risk2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF4D5A" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="#FF4D5A" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1B2733" strokeDasharray="3 3"/>
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#60717E", fontFamily: "JetBrains Mono" }} interval="preserveStartEnd"/>
            <YAxis tick={{ fontSize: 9, fill: "#60717E", fontFamily: "JetBrains Mono" }}/>
            <Tooltip contentStyle={{ background: "#16212C", border: "1px solid #30404D", borderRadius: 6, fontSize: 11 }} labelStyle={{ color: "#60717E" }}/>
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3AE" }}/>
            <Area type="monotone" dataKey="risk" name="Current Risk Score" stroke="#FF4D5A" strokeWidth={1.5} fill="url(#grad-risk2)" dot={false} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
