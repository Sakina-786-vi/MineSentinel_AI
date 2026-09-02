import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { useSensorData } from "../hooks/useSensorData";
import { toRiskLevel } from "../types";
import RiskBadge from "../components/RiskBadge";

export type Page = "overview" | "monitoring" | "map" | "ai" | "alerts" | "sensors" | "analytics" | "reports" | "settings";
type Props = { page: Page; data: ReturnType<typeof useSensorData> };
const card = { background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: 16 };
const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function NodePicker({ data }: { data: ReturnType<typeof useSensorData> }) {
  return <select value={data.selectedNode ?? ""} onChange={event => data.setSelectedNode(event.target.value)} style={{ background: "#111A23", color: "#E8EEF2", border: "1px solid #263542", borderRadius: 6, padding: "7px 10px" }}>
    {data.nodes.map(node => <option key={node} value={node}>{node}</option>)}
  </select>;
}

function Chart({ data, metric, color, title }: { data: ReturnType<typeof useSensorData>; metric: "tilt_x" | "tilt_y" | "distance" | "vibration" | "temperature" | "humidity"; color: string; title: string }) {
  const chartData = data.history.map(reading => ({ ...reading, time: formatTime(reading.timestamp) }));
  return <section style={card}><div style={{ color: "#94A3AE", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{title}</div><ResponsiveContainer width="100%" height={250}><LineChart data={chartData}><CartesianGrid stroke="#263542" strokeDasharray="3 3"/><XAxis dataKey="time" hide/><YAxis/><Tooltip/><Line dataKey={metric} stroke={color} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></section>;
}

function CurrentReadings({ data }: { data: ReturnType<typeof useSensorData> }) {
  const reading = data.latest;
  if (!reading) return <div style={card}>Waiting for real gateway data...</div>;
  const values = [["Tilt X", reading.tilt_x, "°"], ["Tilt Y", reading.tilt_y, "°"], ["Distance", reading.distance, " cm"], ["Vibration", reading.vibration, ""], ["Temperature", reading.temperature, "°C"], ["Humidity", reading.humidity, "%"]];
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12 }}>{values.map(([label, value, unit]) => <div key={String(label)} style={card}><div style={{ color: "#94A3AE", fontSize: 11 }}>{label}</div><div style={{ fontFamily: "monospace", fontSize: 22, marginTop: 6 }}>{value}{unit}</div></div>)}</div>;
}

function RiskPanel({ data }: { data: ReturnType<typeof useSensorData> }) {
  const risk = data.risk;
  if (!risk) return <section style={card}>No backend analysis is available for this node.</section>;
  return <section style={card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: "#94A3AE", fontSize: 11 }}>BACKEND RISK SCORE</div><div style={{ fontFamily: "monospace", fontSize: 34, marginTop: 5 }}>{risk.risk_score} / 100</div></div><RiskBadge level={toRiskLevel(risk.risk_level)} size="md"/></div><div style={{ marginTop: 14, color: "#94A3AE", fontSize: 13 }}>Isolation Forest: {risk.ai_available ? (risk.anomaly ? "ANOMALY DETECTED" : "NORMAL") : "LEARNING BASELINE"}</div><div style={{ marginTop: 8, fontSize: 12 }}>{risk.reasons.length ? risk.reasons.join(" · ") : "No active risk reasons returned by the backend."}</div></section>;
}

export default function DataView({ page, data }: Props) {
  const latest = data.latest;
  const shell = (title: string, subtitle: string, body: React.ReactNode) => <div style={{ flex: 1, overflowY: "auto", padding: 20, color: "#E8EEF2" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h1 style={{ margin: 0, fontSize: 20 }}>{title}</h1><p style={{ color: "#94A3AE", fontSize: 12, margin: "5px 0 0" }}>{subtitle}</p></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><NodePicker data={data}/><span style={{ color: data.status === "LIVE" ? "#32D583" : "#FF4D5A", fontSize: 11, fontWeight: 700 }}>● {data.status}</span></div></div>{data.error && <div style={{ ...card, color: "#FF4D5A", marginBottom: 12 }}>{data.error}</div>}{body}</div>;
  if (page === "overview") return shell("Overview", "Live readings and analysis from FastAPI", <div style={{ display: "grid", gap: 14 }}><CurrentReadings data={data}/><div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", gap: 14 }}><Chart data={data} metric="temperature" color="#F28C38" title="TEMPERATURE HISTORY"/><RiskPanel data={data}/></div></div>);
  if (page === "monitoring") return shell("Live Monitoring", "Latest genuine sensor packet and continuously updated readings", <div style={{ display: "grid", gap: 14 }}><CurrentReadings data={data}/><Chart data={data} metric="vibration" color="#27B7D7" title="VIBRATION HISTORY"/></div>);
  if (page === "analytics") return shell("Analytics", "Historical data retained by FastAPI for the selected node", <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><Chart data={data} metric="tilt_x" color="#32D583" title="TILT X HISTORY"/><Chart data={data} metric="tilt_y" color="#F5C451" title="TILT Y HISTORY"/><Chart data={data} metric="distance" color="#F28C38" title="DISTANCE HISTORY"/><Chart data={data} metric="humidity" color="#27B7D7" title="HUMIDITY HISTORY"/></div>);
  if (page === "ai") return shell("AI Analysis", "Risk and anomaly results calculated by the backend", <RiskPanel data={data}/>);
  if (page === "alerts") return shell("Alerts", "Only active backend-generated risk states are displayed", data.risk?.alert ? <RiskPanel data={data}/> : <div style={card}>No active backend alert for {data.selectedNode ?? "the selected node"}.</div>);
  if (page === "sensors") return shell("Sensor Network", "Nodes reported by /api/nodes", <section style={card}>{data.nodes.length ? data.nodes.map(node => <button key={node} onClick={() => data.setSelectedNode(node)} style={{ display: "flex", width: "100%", justifyContent: "space-between", background: node === data.selectedNode ? "#16212C" : "transparent", color: "#E8EEF2", border: "none", borderBottom: "1px solid #263542", padding: 12, cursor: "pointer" }}><span>{node}</span><span>{node === data.selectedNode && latest ? `Last reading: ${formatTime(latest.timestamp)}` : "Select node"}</span></button>) : "No nodes have sent data."}</section>);
  if (page === "map") return shell("Mine Map", "Node locations are not supplied by the backend", <section style={card}>{data.nodes.length ? <><p style={{ color: "#94A3AE", marginTop: 0 }}>The API currently provides node IDs but not geographic coordinates. This view intentionally lists real nodes rather than drawing invented positions.</p>{data.nodes.map(node => <div key={node} style={{ padding: 10, borderTop: "1px solid #263542" }}>● {node}{node === data.selectedNode ? " (selected)" : ""}</div>)}</> : "No data received."}</section>);
  if (page === "reports") return shell("Reports", "Summary generated from the selected node's real retained history", <section style={card}><div>Node: {data.selectedNode ?? "No node selected"}</div><div style={{ marginTop: 8 }}>Historical readings loaded: {data.history.length}</div><div style={{ marginTop: 8 }}>Latest timestamp: {latest ? new Date(latest.timestamp).toLocaleString() : "No data"}</div><div style={{ marginTop: 8 }}>Latest reading ID: {latest?.id ?? "No data"}</div></section>);
  return shell("Settings", "Live connection settings", <section style={card}><div>Backend connection: {data.backendOnline ? "Connected" : "Unavailable"}</div><div style={{ marginTop: 8 }}>Polling interval: 2 seconds</div><div style={{ marginTop: 8 }}>Selected node: {data.selectedNode ?? "None"}</div><button onClick={() => void data.refresh()} style={{ marginTop: 14, background: "#2F80ED", border: "none", borderRadius: 6, color: "white", padding: "8px 12px", cursor: "pointer" }}>Refresh real data now</button></section>);
}
