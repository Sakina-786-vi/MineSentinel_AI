export type RiskLevel = "normal" | "warning" | "high" | "critical";

export interface SensorNode {
  id: string;
  label: string;
  status: "online" | "offline";
  tilt: number;
  displacement: number;
  vibration: "low" | "medium" | "high";
  temperature: number;
  humidity: number;
  battery: number;
  signal: "weak" | "moderate" | "strong";
  risk: RiskLevel;
  riskScore: number;
  lastUpdate: string;
  position: { x: number; y: number };
}

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  nodeId: string;
  panel: string;
  title: string;
  description: string;
  riskScore: number;
  indicators: string[];
  timestamp: string;
  acknowledged: boolean;
  recommendation: string;
}

export const SENSOR_NODES: SensorNode[] = [
  { id: "N01", label: "N01", status: "online", tilt: 0.21, displacement: 2.1, vibration: "low", temperature: 28.4, humidity: 62, battery: 94, signal: "strong", risk: "normal", riskScore: 12, lastUpdate: "4 sec", position: { x: 20, y: 20 } },
  { id: "N02", label: "N02", status: "online", tilt: 0.34, displacement: 3.8, vibration: "low", temperature: 28.7, humidity: 63, battery: 91, signal: "strong", risk: "normal", riskScore: 18, lastUpdate: "4 sec", position: { x: 50, y: 20 } },
  { id: "N03", label: "N03", status: "online", tilt: 0.58, displacement: 6.2, vibration: "medium", temperature: 29.1, humidity: 65, battery: 87, signal: "strong", risk: "warning", riskScore: 34, lastUpdate: "5 sec", position: { x: 80, y: 20 } },
  { id: "N04", label: "N04", status: "online", tilt: 0.72, displacement: 8.9, vibration: "medium", temperature: 29.3, humidity: 66, battery: 85, signal: "moderate", risk: "warning", riskScore: 42, lastUpdate: "4 sec", position: { x: 20, y: 50 } },
  { id: "N05", label: "N05", status: "online", tilt: 1.42, displacement: 18.4, vibration: "high", temperature: 29.4, humidity: 64, battery: 82, signal: "strong", risk: "high", riskScore: 78, lastUpdate: "4 sec", position: { x: 50, y: 50 } },
  { id: "N06", label: "N06", status: "online", tilt: 0.61, displacement: 7.4, vibration: "medium", temperature: 28.9, humidity: 63, battery: 88, signal: "strong", risk: "warning", riskScore: 38, lastUpdate: "6 sec", position: { x: 80, y: 50 } },
  { id: "N07", label: "N07", status: "online", tilt: 0.19, displacement: 1.8, vibration: "low", temperature: 28.2, humidity: 61, battery: 96, signal: "strong", risk: "normal", riskScore: 10, lastUpdate: "4 sec", position: { x: 20, y: 80 } },
  { id: "N08", label: "N08", status: "online", tilt: 0.28, displacement: 2.6, vibration: "low", temperature: 28.3, humidity: 62, battery: 93, signal: "strong", risk: "normal", riskScore: 15, lastUpdate: "4 sec", position: { x: 50, y: 80 } },
  { id: "N09", label: "N09", status: "offline", tilt: 0, displacement: 0, vibration: "low", temperature: 0, humidity: 0, battery: 14, signal: "weak", risk: "normal", riskScore: 0, lastUpdate: "8 min", position: { x: 80, y: 80 } },
];

export const ALERTS: Alert[] = [
  {
    id: "A001", severity: "critical", nodeId: "N05", panel: "Panel A",
    title: "Progressive deformation detected",
    description: "Node N05 reports sustained tilt and displacement exceeding safety thresholds. Spatial correlation with N04 and N06 indicates possible progressive subsidence pattern.",
    riskScore: 78,
    indicators: ["Increasing tilt (1.42°)", "High surface displacement (18.4 mm)", "Abnormal vibration", "Neighbouring-node correlation"],
    timestamp: "14:32:18", acknowledged: false,
    recommendation: "Immediate field inspection recommended. Isolate panel and notify mine safety officer."
  },
  {
    id: "A002", severity: "warning", nodeId: "N04", panel: "Panel A",
    title: "Tilt threshold exceeded",
    description: "Node N04 tilt reading has crossed the 0.70° warning threshold. Displacement trending upward over past 6 hours.",
    riskScore: 42, indicators: ["Tilt at 0.72°", "Displacement trending ↑", "Medium vibration"],
    timestamp: "14:28:45", acknowledged: false,
    recommendation: "Monitor closely. Increase observation frequency to 5-minute intervals."
  },
  {
    id: "A003", severity: "warning", nodeId: "N03", panel: "Panel A",
    title: "Displacement rate elevated",
    description: "Displacement rate has increased 0.8 mm over the past 3 hours. Vibration level upgraded to medium.",
    riskScore: 34, indicators: ["Displacement rate ↑", "Medium vibration"],
    timestamp: "13:55:02", acknowledged: true,
    recommendation: "Schedule maintenance inspection within 24 hours."
  },
];

function genTimeSeries(hours: number, baseVal: number, noise: number, trend: number, anomalyAt?: number) {
  const pts: { time: string; value: number }[] = [];
  const steps = Math.min(hours * 6, 120);
  const now = Date.now();
  for (let i = steps; i >= 0; i--) {
    const t = new Date(now - i * (hours * 3600000 / steps));
    const prog = (steps - i) / steps;
    let val = baseVal + trend * prog + (Math.random() - 0.5) * noise;
    if (anomalyAt && prog > anomalyAt) val += (prog - anomalyAt) * trend * 3;
    pts.push({
      time: t.getHours().toString().padStart(2, "0") + ":" + t.getMinutes().toString().padStart(2, "0"),
      value: Math.max(0, +val.toFixed(3))
    });
  }
  return pts;
}

export function getChartData(range: "1H" | "6H" | "24H" | "7D" | "30D") {
  const hours = range === "1H" ? 1 : range === "6H" ? 6 : range === "24H" ? 24 : range === "7D" ? 168 : 720;
  const tilt = genTimeSeries(hours, 0.4, 0.08, 1.0, 0.65);
  const displacement = genTimeSeries(hours, 3.0, 0.6, 15.0, 0.65);
  const vibration = genTimeSeries(hours, 0.3, 0.1, 0.6, 0.7);
  const risk = genTimeSeries(hours, 20, 4, 58, 0.62);
  return tilt.map((pt, i) => ({
    time: pt.time,
    tilt: pt.value,
    displacement: displacement[i].value,
    vibration: vibration[i].value,
    risk: Math.min(100, risk[i].value),
    anomaly: i === Math.floor(tilt.length * 0.67),
  }));
}
