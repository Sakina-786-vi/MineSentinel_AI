import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { useSensorData } from "../hooks/useSensorData";
import { toRiskLevel } from "../types";
import RiskBadge from "../components/RiskBadge";

type Props = { data: ReturnType<typeof useSensorData> };
const color = "#27B7D7";
const fields = [
  ["Tilt X", "tilt_x", "°"], ["Tilt Y", "tilt_y", "°"], ["Distance", "distance", " cm"],
  ["Vibration", "vibration", ""], ["Temperature", "temperature", "°C"], ["Humidity", "humidity", "%"],
] as const;
function time(value: string) { return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
export default function Dashboard({ data }: Props) {
  const { latest, history, risk, nodes, selectedNode, setSelectedNode, status, loading, error } = data;
  const chartData = history.map(item => ({ ...item, time: time(item.timestamp) }));
  if (loading) return <main style={{ padding: 24, color: "#94A3AE" }}>Loading sensor data...</main>;
  if (error && !latest) return <main style={{ padding: 24, color: "#FF4D5A" }}>Backend unavailable: {error}</main>;
  if (!latest) return <main style={{ padding: 24, color: "#94A3AE" }}>Waiting for gateway data...</main>;
  return <div style={{ flex: 1, overflowY: "auto", padding: 20, color: "#E8EEF2" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h1 style={{ margin: 0, fontSize: 20 }}>Live Mine Monitoring</h1><p style={{ color: "#94A3AE", fontSize: 12 }}>REST polling every 2 seconds · values are sourced from FastAPI</p></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><select value={selectedNode} onChange={event => setSelectedNode(event.target.value)} style={{ background: "#111A23", color: "#E8EEF2", border: "1px solid #263542", padding: 8 }}>{nodes.map(node => <option key={node}>{node}</option>)}</select><span style={{ color: status === "LIVE" ? "#32D583" : "#FF4D5A", fontSize: 12, fontWeight: 700 }}>● {status}</span></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>{fields.map(([label, key, unit]) => <div key={key} style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 8, padding: 14 }}><div style={{ fontSize: 11, color: "#94A3AE" }}>{label}</div><div style={{ fontSize: 23, fontFamily: "monospace", marginTop: 5 }}>{latest[key]}{unit}</div></div>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginTop: 14 }}><section style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 8, padding: 14 }}><h2 style={{ fontSize: 12, color: "#94A3AE", margin: "0 0 10px" }}>TEMPERATURE & HUMIDITY HISTORY</h2><ResponsiveContainer width="100%" height={240}><LineChart data={chartData}><CartesianGrid stroke="#263542" strokeDasharray="3 3"/><XAxis dataKey="time" hide/><YAxis/><Tooltip/><Line dataKey="temperature" stroke="#F28C38" dot={false}/><Line dataKey="humidity" stroke="#27B7D7" dot={false}/></LineChart></ResponsiveContainer></section><section style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 8, padding: 14 }}><h2 style={{ fontSize: 12, color: "#94A3AE", margin: "0 0 10px" }}>BACKEND RISK ANALYSIS</h2>{risk ? <><RiskBadge level={toRiskLevel(risk.risk_level)} size="md"/><div style={{ fontFamily: "monospace", fontSize: 32, margin: "16px 0" }}>{risk.risk_score} / 100</div><div>Isolation Forest: {risk.ai_available ? (risk.anomaly ? "ANOMALY" : "NORMAL") : "LEARNING BASELINE"}</div><div style={{ color: "#94A3AE", fontSize: 12, marginTop: 10 }}>{risk.reasons.length ? risk.reasons.join(" · ") : "No active risk reasons"}</div></> : "Analysis unavailable"}</section></div>
    <section style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 8, padding: 14, marginTop: 14 }}><h2 style={{ fontSize: 12, color: "#94A3AE", margin: "0 0 10px" }}>TILT, VIBRATION & DISTANCE HISTORY</h2><ResponsiveContainer width="100%" height={240}><AreaChart data={chartData}><CartesianGrid stroke="#263542" strokeDasharray="3 3"/><XAxis dataKey="time" hide/><YAxis/><Tooltip/><Area dataKey="distance" stroke="#F28C38" fill="#F28C3822"/><Area dataKey="vibration" stroke={color} fill="#27B7D722"/><Area dataKey="tilt_x" stroke="#32D583" fill="none"/></AreaChart></ResponsiveContainer></section>
  </div>;
}
