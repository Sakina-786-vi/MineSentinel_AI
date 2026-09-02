import { useState, useEffect, useCallback, type ComponentType, type CSSProperties } from "react";
import {
  LayoutDashboard, Activity, Cpu, Brain, Bell, Clock, FileText,
  Settings, ChevronLeft, ChevronRight, Wifi, Battery, AlertTriangle,
  Shield, TrendingUp, Thermometer, Droplets, Zap,
  Navigation2, Layers, Radio, Server, AlertCircle, CheckCircle,
  Signal, ArrowRight, MapPin, Power
} from "lucide-react";
import { useLiveSensorData } from "../hooks/SensorDataContext";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

type RiskStatus = "safe" | "warning" | "danger" | "critical";
interface DataPt { t: string; v: number }

type IconComp = ComponentType<{ size?: number; className?: string; style?: CSSProperties; color?: string }>;

interface SensorDef {
  id: string; label: string; unit: string; base: number; spread: number;
  icon: IconComp;
  status: RiskStatus; value: number; min: number; max: number;
}

interface Alert {
  id: string; sev: "critical" | "warning" | "info";
  msg: string; loc: string; time: string; ack: boolean;
}

const THEME = {
  background: "#070b0e",
  foreground: "#c8d8e2",
  card: "#0b1318",
  muted: "#111d25",
  mutedText: "#4e6a7a",
  primary: "#00c4ad",
  accent: "#06cee8",
  border: "rgba(0, 196, 173, 0.13)",
  sidebar: "#070a0d",
};

const RISK_COLOR: Record<RiskStatus, string> = {
  safe: "#22c55e", warning: "#eab308", danger: "#f97316", critical: "#ef4444",
};
const RISK_LABEL: Record<RiskStatus, string> = {
  safe: "SAFE", warning: "MODERATE", danger: "HIGH RISK", critical: "CRITICAL",
};
const RISK_BG: Record<RiskStatus, string> = {
  safe: "rgba(34,197,94,0.08)", warning: "rgba(234,179,8,0.08)",
  danger: "rgba(249,115,22,0.08)", critical: "rgba(239,68,68,0.1)",
};
const SEV_COLOR = { critical: "#ef4444", warning: "#eab308", info: THEME.accent };
const SEV_BG = { critical: "rgba(239,68,68,0.08)", warning: "rgba(234,179,8,0.06)", info: "rgba(6,206,232,0.06)" };

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "monitoring", label: "Live Monitoring", icon: Activity },
  { id: "map", label: "Mine Map", icon: MapPin },
  { id: "sensors", label: "Sensors", icon: Cpu },
  { id: "ai-risk", label: "AI Risk", icon: Brain },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "history", label: "History", icon: Clock },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const SENSOR_DEFS: SensorDef[] = [
  { id: "tilt", label: "Tilt", unit: "°", base: 2.34, spread: 0.3, icon: Navigation2, status: "warning", value: 2.34, min: 0, max: 10 },
  { id: "disp", label: "Displacement", unit: "mm", base: 8.7, spread: 0.8, icon: Layers, status: "warning", value: 8.7, min: 0, max: 30 },
  { id: "vib", label: "Vibration", unit: "mm/s", base: 14.2, spread: 1.5, icon: Zap, status: "danger", value: 14.2, min: 0, max: 40 },
  { id: "temp", label: "Temperature", unit: "°C", base: 28.4, spread: 0.4, icon: Thermometer, status: "safe", value: 28.4, min: 15, max: 45 },
  { id: "hum", label: "Humidity", unit: "%", base: 74, spread: 1.2, icon: Droplets, status: "safe", value: 74, min: 30, max: 100 },
];

const INIT_ALERTS: Alert[] = [
  { id: "a2", sev: "warning", msg: "Tilt angle 2.34° approaching warning limit", loc: "Panel-B North Gate", time: "14:21:45", ack: false },
  { id: "a3", sev: "warning", msg: "Vibration peak 14.2 mm/s — above baseline", loc: "Panel-B South Gate", time: "14:18:30", ack: true },
];

const FLOW_STEPS = [
  { label: "ESP32\nSensors", icon: Cpu },
  { label: "NRF24\nWireless", icon: Radio },
  { label: "Gateway\nNode", icon: Server },
  { label: "AI Anomaly\nDetection", icon: Brain },
  { label: "Risk\nEngine", icon: Shield },
  { label: "GIS\nDashboard", icon: LayoutDashboard },
  { label: "Early\nWarning", icon: AlertTriangle },
];

function genData(base: number, spread: number, n = 22): DataPt[] {
  return Array.from({ length: n }, (_, i) => ({
    t: `${i}`, v: parseFloat((base + (Math.random() - 0.5) * spread * 2).toFixed(2)),
  }));
}

function jitter(v: number, s: number) {
  return parseFloat((v + (Math.random() - 0.5) * s).toFixed(2));
}

function riskOf(score: number): RiskStatus {
  if (score >= 80) return "critical";
  if (score >= 60) return "danger";
  if (score >= 40) return "warning";
  return "safe";
}

const ANIM_CSS = `
  @keyframes pulse-ring {
    0%   { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.55; }
  }
  @keyframes live-blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }
  @keyframes scan-y {
    0%   { transform: translateY(0); }
    100% { transform: translateY(310px); }
  }
  @keyframes flow-dash {
    to { stroke-dashoffset: -24; }
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pulse-ring { animation: pulse-ring 2.4s cubic-bezier(0,0,0.2,1) infinite; }
  .pulse-ring-2 { animation: pulse-ring 2.4s cubic-bezier(0,0,0.2,1) 0.8s infinite; }
  .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
  .live-blink { animation: live-blink 1.6s ease-in-out infinite; }
  .scan-line { animation: scan-y 3.5s linear infinite; }
  .flow-dash { animation: flow-dash 1s linear infinite; }
  .fade-in { animation: fade-in 0.4s ease-out; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0, 196, 173, 0.18); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0, 196, 173, 0.35); }
`;

function CircularGauge({ score }: { score: number }) {
  const r = 68, cx = 95, cy = 98;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = (score / 100) * arcLen;
  const level = riskOf(score);
  const col = RISK_COLOR[level];

  const ticks = Array.from({ length: 28 }, (_, i) => {
    const angleDeg = 135 + i * (270 / 27);
    const rad = angleDeg * (Math.PI / 180);
    const isMaj = i % 9 === 0;
    const inner = r + (isMaj ? 10 : 7);
    const outer = r + 18;
    return { rad, inner, outer, isMaj };
  });

  const needleAngle = (135 + (score / 100) * 270) * (Math.PI / 180);
  const nx = cx + r * Math.cos(needleAngle);
  const ny = cy + r * Math.sin(needleAngle);

  return (
    <svg width={190} height={196} viewBox="0 0 190 196" className="overflow-visible">
      {ticks.map((tk, i) => (
        <line key={i}
          x1={cx + tk.inner * Math.cos(tk.rad)} y1={cy + tk.inner * Math.sin(tk.rad)}
          x2={cx + tk.outer * Math.cos(tk.rad)} y2={cy + tk.outer * Math.sin(tk.rad)}
          stroke={tk.isMaj ? "#233240" : "#172430"} strokeWidth={tk.isMaj ? 2 : 1}
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0d1c26" strokeWidth={11}
        strokeDasharray={`${arcLen} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={18} strokeOpacity={0.12}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1), stroke .6s" }}
      />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={9}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1), stroke .6s" }}
      />
      <circle cx={cx} cy={cy} r={52} fill="#060c12" />
      <circle cx={cx} cy={cy} r={52} fill="none" stroke="#0f1d28" strokeWidth={1} />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="white"
        fontSize={30} fontWeight={800} fontFamily="Manrope, sans-serif" letterSpacing="-1">
        {score}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#3a5a6a"
        fontSize={8} fontFamily="JetBrains Mono, monospace" letterSpacing="2.5">
        RISK SCORE
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill={col}
        fontSize={10} fontWeight={700} fontFamily="Manrope, sans-serif" letterSpacing="1.5">
        {RISK_LABEL[level]}
      </text>
      <circle cx={nx} cy={ny} r={6} fill={col} />
      <circle cx={nx} cy={ny} r={4} fill="#070b0e" />
      <circle cx={nx} cy={ny} r={2} fill={col} />
    </svg>
  );
}

interface SensorPin { id: string; cx: number; cy: number; status: RiskStatus }

export function PanelMineMap({ activePin, setActivePin, nodeName = "MS-1", riskStatus = "safe", online = false }: {
  activePin: string | null;
  setActivePin: (id: string | null) => void;
  nodeName?: string;
  riskStatus?: RiskStatus;
  online?: boolean;
}) {
  const pins: SensorPin[] = [
    { id: nodeName, cx: 258, cy: 172, status: riskStatus },
  ];

  return (
    <div className="relative w-full h-full rounded overflow-hidden" style={{ height: "100%", background: THEME.background }}>
      <svg viewBox="0 0 560 312" className="w-full h-full" style={{ fontFamily: "JetBrains Mono, monospace" }}>
        {Array.from({ length: 15 }, (_, i) => (
          <line key={`vg${i}`} x1={i * 40} y1={0} x2={i * 40} y2={312}
            stroke="rgba(0,196,173,0.055)" strokeWidth={0.5} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`hg${i}`} x1={0} y1={i * 40} x2={560} y2={i * 40}
            stroke="rgba(0,196,173,0.055)" strokeWidth={0.5} />
        ))}

        <rect x={18} y={18} width={524} height={276} rx={2}
          fill="none" stroke="rgba(0,196,173,0.18)" strokeWidth={1.5} strokeDasharray="8 4" />

        <rect x={18} y={44} width={524} height={18} fill="#0b1820" stroke="rgba(0,196,173,0.12)" strokeWidth={0.8} />
        <text x={30} y={57} fontSize={7} fill="#2a4a5a" letterSpacing="1.5">MAIN HAULAGE LEVEL  ─────────────────────────────</text>

        <rect x={18} y={270} width={524} height={16} fill="#0b1820" stroke="rgba(0,196,173,0.1)" strokeWidth={0.8} />
        <text x={30} y={281} fontSize={7} fill="#2a4a5a" letterSpacing="1.5">RETURN AIRWAY</text>

        {[80, 200, 360, 520].map(x => (
          <rect key={x} x={x - 5} y={62} width={10} height={208} fill="#0c1a22" stroke="rgba(0,196,173,0.12)" strokeWidth={0.6} />
        ))}

        {[100, 168, 236].map(y => (
          <rect key={y} x={80} y={y} width={440} height={8} fill="#0c1a22" stroke="rgba(0,196,173,0.08)" strokeWidth={0.5} />
        ))}

        <rect x={80} y={62} width={120} height={208} fill="rgba(234,179,8,0.055)" />
        <rect x={80} y={62} width={120} height={208} fill="none" stroke="rgba(234,179,8,0.2)" strokeWidth={0.8} />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`ha${i}`} x1={80} y1={62 + i * 30} x2={200} y2={62 + i * 30 + 30}
            stroke="rgba(234,179,8,0.07)" strokeWidth={1} />
        ))}
        <text x={105} y={172} fontSize={7.5} fill="rgba(234,179,8,0.5)" letterSpacing="1" textAnchor="middle">PANEL A</text>
        <text x={105} y={184} fontSize={6} fill="rgba(234,179,8,0.35)" letterSpacing="0.5" textAnchor="middle">(GOB/WORKED-OUT)</text>

        <rect x={200} y={62} width={160} height={208} fill="rgba(249,115,22,0.07)" />
        <rect x={200} y={62} width={160} height={208} fill="none" stroke="rgba(249,115,22,0.22)" strokeWidth={0.8} />
        <text x={280} y={90} fontSize={7.5} fill="rgba(249,115,22,0.6)" letterSpacing="1" textAnchor="middle">PANEL B (ACTIVE)</text>

        <rect x={300} y={62} width={60} height={208} fill="rgba(239,68,68,0.07)" />

        <rect x={296} y={62} width={8} height={208} fill="rgba(239,68,68,0.15)" />
        <line x1={300} y1={62} x2={300} y2={270} stroke="#ef4444" strokeWidth={2.5} strokeDasharray="6 3" opacity={0.7} />
        <text x={304} y={80} fontSize={6.5} fill="rgba(239,68,68,0.7)" letterSpacing="0.5">ACTIVE FACE →</text>

        <rect x={360} y={62} width={160} height={208} fill="rgba(34,197,94,0.04)" />
        <rect x={360} y={62} width={160} height={208} fill="none" stroke="rgba(34,197,94,0.15)" strokeWidth={0.8} />
        <text x={440} y={172} fontSize={7.5} fill="rgba(34,197,94,0.45)" letterSpacing="1" textAnchor="middle">PANEL C</text>
        <text x={440} y={184} fontSize={6} fill="rgba(34,197,94,0.3)" letterSpacing="0.5" textAnchor="middle">(INTACT / SAFE)</text>

        <ellipse cx={258} cy={175} rx={52} ry={72}
          fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.3)" strokeWidth={1} strokeDasharray="4 3" />
        <ellipse cx={258} cy={175} rx={28} ry={38} fill="rgba(239,68,68,0.09)" />
        <text x={258} y={248} textAnchor="middle" fontSize={7} fill="rgba(239,68,68,0.55)" letterSpacing="0.5">SUBSIDENCE ZONE</text>

        <ellipse cx={230} cy={126} rx={35} ry={42}
          fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.22)" strokeWidth={0.8} strokeDasharray="3 3" />

        <ellipse cx={155} cy={200} rx={32} ry={42}
          fill="rgba(234,179,8,0.08)" stroke="rgba(234,179,8,0.2)" strokeWidth={0.8} strokeDasharray="3 3" />

        <g className="scan-line" style={{ transformOrigin: "0 0" }}>
          <line x1={18} y1={0} x2={542} y2={0} stroke="rgba(0,196,173,0.14)" strokeWidth={1.5} />
          <line x1={18} y1={-2} x2={542} y2={-2} stroke="rgba(0,196,173,0.06)" strokeWidth={3} />
        </g>

        {pins.map(pin => {
          const col = online ? RISK_COLOR[pin.status] : "#60717E";
          const isActive = activePin === pin.id;
          return (
            <g key={pin.id} style={{ cursor: "pointer" }}
              onClick={() => setActivePin(isActive ? null : pin.id)}>
              {(pin.status === "critical" || pin.status === "danger") && (
                <>
                  <circle cx={pin.cx} cy={pin.cy} r={10} fill="none" stroke={col} strokeWidth={1}
                    className="pulse-ring" style={{ transformOrigin: `${pin.cx}px ${pin.cy}px` }} />
                  <circle cx={pin.cx} cy={pin.cy} r={10} fill="none" stroke={col} strokeWidth={0.8}
                    className="pulse-ring-2" style={{ transformOrigin: `${pin.cx}px ${pin.cy}px` }} />
                </>
              )}
              {pin.status === "warning" && (
                <circle cx={pin.cx} cy={pin.cy} r={10} fill="none" stroke={col} strokeWidth={1}
                  className="pulse-ring" style={{ transformOrigin: `${pin.cx}px ${pin.cy}px` }} />
              )}
              <circle cx={pin.cx} cy={pin.cy} r={5.5} fill={isActive ? "white" : col} className="pulse-dot" />
              <circle cx={pin.cx} cy={pin.cy} r={5.5} fill="none" stroke={col} strokeWidth={1.5} />
              <circle cx={pin.cx} cy={pin.cy} r={2.5} fill={isActive ? col : "#070b0e"} />
              <text x={pin.cx} y={pin.cy - 10} textAnchor="middle" fontSize={7}
                fill={col} fontFamily="JetBrains Mono, monospace" letterSpacing="0.5">
                {pin.id}
              </text>
              <text x={pin.cx} y={pin.cy + 38} textAnchor="middle" fontSize={6}
                fill={col} fontFamily="JetBrains Mono, monospace" letterSpacing="0.5">
                {online ? "ONLINE" : "OFFLINE"}
              </text>
              {isActive && (
                <rect x={pin.cx - 34} y={pin.cy + 8} width={68} height={20} rx={2}
                  fill="#0b1318" stroke={col} strokeWidth={0.8} />
              )}
              {isActive && (
                <text x={pin.cx} y={pin.cy + 22} textAnchor="middle" fontSize={7}
                  fill={col} letterSpacing="0.3">
                  {RISK_LABEL[pin.status]}
                </text>
              )}
            </g>
          );
        })}

        <g transform="translate(524, 36)">
          <circle cx={0} cy={0} r={12} fill="#0b1620" stroke="rgba(0,196,173,0.2)" strokeWidth={1} />
          <line x1={0} y1={-8} x2={0} y2={8} stroke="rgba(0,196,173,0.4)" strokeWidth={1} />
          <line x1={-8} y1={0} x2={8} y2={0} stroke="rgba(0,196,173,0.2)" strokeWidth={0.8} />
          <text x={0} y={-2} textAnchor="middle" fontSize={7} fill="#00c4ad" fontWeight={700}>N</text>
        </g>

        <g transform="translate(430, 298)">
          <line x1={0} y1={0} x2={80} y2={0} stroke="rgba(0,196,173,0.3)" strokeWidth={1.5} />
          <line x1={0} y1={-4} x2={0} y2={4} stroke="rgba(0,196,173,0.3)" strokeWidth={1} />
          <line x1={80} y1={-4} x2={80} y2={4} stroke="rgba(0,196,173,0.3)" strokeWidth={1} />
          <text x={40} y={-5} textAnchor="middle" fontSize={6.5} fill="#3a5a6a" letterSpacing="1">100 m</text>
        </g>

        {[80, 200, 360, 520].map((x, i) => (
          <text key={i} x={x} y={14} textAnchor="middle" fontSize={6.5} fill="#2a3a44" letterSpacing="0.5">
            E{(i + 1) * 100}
          </text>
        ))}
        {[62, 168, 270].map((y, i) => (
          <text key={i} x={10} y={y + 4} textAnchor="middle" fontSize={6.5} fill="#2a3a44" letterSpacing="0.5">
            N{(i + 1) * 100}
          </text>
        ))}

        <text x={543} y={172} fontSize={6} fill="#2a4a5a" letterSpacing="0.5" transform="rotate(90 543 172)">DEPTH ≈ 340 m</text>
      </svg>

      <div className="absolute bottom-2 left-3 flex gap-3">
        {(["critical", "danger", "warning", "safe"] as RiskStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: RISK_COLOR[s] }} />
            <span style={{ fontSize: 9, color: "#4a6a7a", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.5px" }}>
              {RISK_LABEL[s]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SensorCard({ def, data }: { def: SensorDef; data: DataPt[] }) {
  const col = RISK_COLOR[def.status];
  const pct = Math.min(100, ((def.value - def.min) / (def.max - def.min)) * 100);
  const Icon = def.icon;

  return (
    <div className="rounded border flex flex-col gap-2 p-3 transition-colors duration-300"
      style={{ background: THEME.card, borderColor: THEME.border, boxShadow: `inset 0 0 0 1px ${THEME.border}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: `${col}18` }}>
            <Icon size={14} style={{ color: col }} />
          </div>
          <span className="text-[10px] font-mono tracking-widest uppercase"
            style={{ color: THEME.mutedText }}>{def.label}</span>
        </div>
        <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: col }} />
      </div>

      <div className="flex items-end gap-1">
        <span className="text-xl font-bold" style={{ color: col, fontFamily: "Manrope, sans-serif" }}>
          {def.value.toFixed(1)}
        </span>
        <span className="text-[10px] mb-0.5" style={{ color: THEME.mutedText }}>{def.unit}</span>
      </div>

      <div className="w-full h-1 rounded-full" style={{ background: "var(--muted)" }}>
        <div className="h-1 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: col }} />
      </div>

      <div className="h-8 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sg-${def.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={col} stopOpacity={0.25} />
                <stop offset="95%" stopColor={col} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.5}
              fill={`url(#sg-${def.id})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded inline-flex self-start"
        style={{ background: RISK_BG[def.status], color: col, letterSpacing: "1.5px" }}>
        {RISK_LABEL[def.status]}
      </div>
    </div>
  );
}

function AIPanel({ anomaly, riskScore, risk, health, reading }: { anomaly: number; riskScore: number; risk?: any; health?: any; reading?: any }) {
  const isAiAvailable = risk?.ai_available ?? health?.ai_available ?? false;
  const reasons = risk?.reasons || [];
  const insightText = reasons.length > 0
    ? reasons.join(". ") + "."
    : isAiAvailable
      ? "Real-time readings are consistent with normal baseline. No anomalous subsidence patterns detected."
      : (health?.ai_message || "Learning normal baseline from historical sensor data. Isolation Forest active.");

  const comp = risk?.components || {};
  const featureList = [
    { label: "Displacement Rate", pct: Math.round(comp.displacement ?? 0), col: "#ef4444" },
    { label: "Tilt Severity", pct: Math.round(comp.tilt ?? 0), col: "#f97316" },
    { label: "Vibration FFT", pct: Math.round(comp.vibration ?? 0), col: "#eab308" },
    { label: "Deformation Trend", pct: Math.round(comp.trend ?? 0), col: "#06cee8" },
  ];

  return (
    <div className="rounded border flex flex-col h-full overflow-hidden"
      style={{ background: THEME.card, borderColor: THEME.border }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b"
        style={{ borderColor: "rgba(6,206,232,0.12)" }}>
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color: "#06cee8" }} />
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#06cee8", letterSpacing: "2px" }}>
            AI Deformation Intel
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full live-blink" style={{ background: isAiAvailable ? "#06cee8" : "#eab308" }} />
          <span className="text-[9px] font-mono" style={{ color: THEME.mutedText }}>{isAiAvailable ? "LIVE" : "BASELINE"}</span>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: THEME.mutedText }}>
              Anomaly Score
            </span>
            <span className="text-sm font-bold" style={{ color: "#06cee8", fontFamily: "Manrope" }}>
              {isAiAvailable && risk?.anomaly_score !== null && risk?.anomaly_score !== undefined
                ? `${(risk.anomaly_score * 100).toFixed(1)}%`
                : "Learning baseline"}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: THEME.muted }}>
            <div className="h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(0, anomaly))}%`,
                background: `linear-gradient(90deg, #06cee8, ${anomaly > 70 ? "#f97316" : "#00c4ad"})`
              }} />
          </div>
        </div>

        <div className="rounded p-2.5" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="text-[9px] font-mono tracking-widest uppercase mb-1" style={{ color: "rgba(239,68,68,0.6)" }}>
            Calculated Risk Level
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-black" style={{ color: risk?.risk_level === "CRITICAL" ? "#ef4444" : risk?.risk_level === "HIGH_RISK" ? "#f97316" : risk?.risk_level === "WARNING" ? "#eab308" : "#22c55e", fontFamily: "Manrope" }}>
              {risk ? riskScore : "—"}
            </span>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] font-mono" style={{ color: "#94A3AE" }}>
                {risk ? risk.risk_level : "Insufficient data"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded p-2.5 space-y-1.5"
          style={{ background: "rgba(6,206,232,0.05)", border: "1px solid rgba(6,206,232,0.12)" }}>
          <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: "#3a7a8a" }}>Explainable AI Insight</div>
          <p className="text-[10px] leading-relaxed" style={{ color: THEME.mutedText }}>
            {insightText}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="text-[9px] font-mono tracking-widest uppercase mb-2" style={{ color: THEME.mutedText }}>
            Risk Component Weights
          </div>
          {featureList.map(f => (
            <div key={f.label}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px]" style={{ color: THEME.mutedText }}>{f.label}</span>
                <span className="text-[9px] font-mono" style={{ color: f.col }}>{f.pct}%</span>
              </div>
              <div className="w-full h-1 rounded-full" style={{ background: THEME.muted }}>
                <div className="h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, f.pct))}%`, background: f.col, opacity: 0.8 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded p-2.5" style={{ background: THEME.muted, border: `1px solid ${THEME.border}` }}>
          <div className="text-[9px] font-mono tracking-widest uppercase mb-2" style={{ color: THEME.mutedText }}>
            Data Pipeline
          </div>
          <div className="flex items-center justify-between gap-0.5 overflow-x-auto pb-1">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === FLOW_STEPS.length - 1;
              return (
                <div key={i} className="flex items-center gap-0.5">
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <div className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: isLast ? "rgba(239,68,68,0.15)" : "rgba(0,196,173,0.12)" }}>
                      <Icon size={10} style={{ color: isLast ? "#ef4444" : "#00c4ad" }} />
                    </div>
                    <span className="text-center whitespace-pre-line" style={{ fontSize: 6, color: "#3a5a6a", lineHeight: 1.2 }}>
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <ArrowRight size={8} style={{ color: "rgba(0,196,173,0.3)", flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RealTimeChart({ datasets }: {
  datasets: { label: string; data: DataPt[]; color: string; unit: string }[]
}) {
  const [tab, setTab] = useState(0);
  const ds = datasets[tab];

  const customTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded px-2 py-1 text-[10px] font-mono"
        style={{ background: "#0b1318", border: `1px solid ${ds.color}40`, color: ds.color }}>
        {payload[0].value.toFixed(2)} {ds.unit}
      </div>
    );
  };

  return (
    <div className="rounded border flex flex-col h-full overflow-hidden"
      style={{ background: THEME.card, borderColor: THEME.border }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: THEME.border }}>
        <div className="flex items-center gap-2">
          <Activity size={13} style={{ color: THEME.primary }} />
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: THEME.mutedText }}>
            Real-time Telemetry
          </span>
        </div>
        <div className="flex gap-1">
          {datasets.map((d, i) => (
            <button key={i} onClick={() => setTab(i)}
              className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wide transition-all duration-200"
              style={{
                background: tab === i ? `${d.color}18` : "transparent",
                color: tab === i ? d.color : THEME.mutedText,
                border: `1px solid ${tab === i ? d.color + "40" : "transparent"}`,
                letterSpacing: "0.8px"
              }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-2 pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ds.data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={`cg-${tab}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ds.color} stopOpacity={0.22} />
                <stop offset="95%" stopColor={ds.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tick={false} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#3a5a6a", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} />
            <Tooltip content={customTooltip} />
            <Area type="monotone" dataKey="v" stroke={ds.color} strokeWidth={1.5}
              fill={`url(#cg-${tab})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="px-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full live-blink" style={{ background: ds.color }} />
          <span className="text-[9px] font-mono" style={{ color: THEME.mutedText }}>Live · 2s refresh</span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: ds.color }}>
          {ds.data[ds.data.length - 1]?.v.toFixed(2)} {ds.unit}
        </span>
      </div>
    </div>
  );
}

function AlertPanel({ alerts, onAck }: { alerts: Alert[]; onAck: (id: string) => void }) {
  return (
    <div className="rounded border flex flex-col h-full overflow-hidden"
      style={{ background: THEME.card, borderColor: "rgba(239,68,68,0.2)" }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: "rgba(239,68,68,0.15)" }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} style={{ color: "#ef4444" }} />
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "#ef4444", letterSpacing: "2px" }}>
            Active Alerts
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="px-1.5 py-0.5 rounded text-[9px] font-mono"
            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
            {alerts.filter(a => !a.ack).length} UNACK
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {alerts.map(alert => {
          const col = SEV_COLOR[alert.sev];
          return (
            <div key={alert.id} className="rounded p-2.5 transition-opacity duration-300"
              style={{
                background: SEV_BG[alert.sev],
                border: `1px solid ${col}25`,
                opacity: alert.ack ? 0.45 : 1
              }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                  <AlertCircle size={11} style={{ color: col, flexShrink: 0, marginTop: 1 }} />
                  <div className="min-w-0">
                    <p className="text-[10px] leading-relaxed" style={{ color: THEME.foreground }}>
                      {alert.msg}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono" style={{ color: THEME.mutedText }}>
                        {alert.loc}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] font-mono" style={{ color: col }}>
                    {alert.time}
                  </span>
                  {!alert.ack && (
                    <button onClick={() => onAck(alert.id)}
                      className="text-[8px] font-mono px-1.5 py-0.5 rounded transition-all duration-200 hover:opacity-80"
                      style={{ background: `${col}18`, color: col, border: `1px solid ${col}30`, letterSpacing: "0.5px" }}>
                      ACK
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                <div className="text-[8px] font-mono px-1.5 py-0.5 rounded uppercase"
                  style={{ background: `${col}15`, color: col, letterSpacing: "1px" }}>
                  {alert.sev}
                </div>
                {alert.ack && (
                  <div className="flex items-center gap-1">
                    <CheckCircle size={9} style={{ color: "#22c55e" }} />
                    <span className="text-[8px] font-mono" style={{ color: "#22c55e" }}>ACK</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NetworkStatus({ nodes, allNodesLatest, allNodesRisk, lastSyncAgo }: { nodes: string[]; allNodesLatest: any[]; allNodesRisk: any[]; lastSyncAgo?: string }) {
  const nodeRows = nodes.length > 0 ? nodes.map(nodeId => {
    const reading = allNodesLatest.find(r => r.node_id === nodeId);
    const risk = allNodesRisk.find(r => r.node_id === nodeId);
    const levelStr = risk?.risk_level?.toLowerCase() || "safe";
    const status: RiskStatus = levelStr.includes("critical") ? "critical" : levelStr.includes("high") ? "danger" : levelStr.includes("warn") ? "warning" : "safe";
    return {
      id: nodeId,
      location: `Panel-B (${nodeId})`,
      status,
      seen: reading ? lastSyncAgo || "Live" : "No data",
    };
  }) : [
    { id: "No Nodes", location: "Waiting for backend data", status: "safe" as RiskStatus, seen: "—" }
  ];

  return (
    <div className="rounded border flex flex-col overflow-hidden"
      style={{ background: THEME.card, borderColor: THEME.border, boxShadow: `inset 0 0 0 1px ${THEME.border}` }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b"
        style={{ borderColor: THEME.border }}>
        <div className="flex items-center gap-2">
          <Radio size={13} style={{ color: THEME.primary }} />
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: THEME.mutedText }}>
            Sensor Network
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full live-blink" style={{ background: nodes.length > 0 ? "#22c55e" : "#ef4444" }} />
          <span className="text-[9px] font-mono" style={{ color: nodes.length > 0 ? "#22c55e" : "#ef4444" }}>
            {nodes.length > 0 ? `${nodes.length}/${nodes.length} ONLINE` : "NO NODES"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
              {['Node', 'Location', 'Risk Status', 'Updated'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-normal tracking-widest uppercase"
                  style={{ color: THEME.mutedText, letterSpacing: "1px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodeRows.map((n, i) => {
              const col = RISK_COLOR[n.status];
              return (
                <tr key={n.id} className="hover:bg-[rgba(0,196,173,0.03)] transition-colors duration-200"
                  style={{ borderBottom: i < nodeRows.length - 1 ? `1px solid ${THEME.border}` : "none" }}>
                  <td className="px-3 py-2.5" style={{ color: THEME.primary }}>{n.id}</td>
                  <td className="px-3 py-2.5" style={{ color: THEME.foreground }}>{n.location}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded uppercase tracking-widest"
                      style={{ background: RISK_BG[n.status], color: col, fontSize: 8, letterSpacing: "1px" }}>
                      {RISK_LABEL[n.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: THEME.mutedText }}>{n.seen}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DigitalTwin() {
  const [mode, setMode] = useState<"surface" | "subsurface">("surface");

  return (
    <div className="rounded border flex flex-col overflow-hidden"
      style={{ background: THEME.card, borderColor: THEME.border, boxShadow: `inset 0 0 0 1px ${THEME.border}` }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: THEME.border }}>
        <div className="flex items-center gap-2">
          <Layers size={13} style={{ color: THEME.accent }} />
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: THEME.mutedText }}>
            Digital Twin
          </span>
        </div>
        <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${THEME.border}` }}>
          {(["surface", "subsurface"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="px-2 py-0.5 text-[9px] font-mono tracking-wide capitalize transition-all duration-200"
              style={{
                background: mode === m ? "rgba(6,206,232,0.12)" : "transparent",
                color: mode === m ? THEME.accent : THEME.mutedText,
                letterSpacing: "0.5px"
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-3">
        {mode === "surface" ? (
          <svg viewBox="0 0 340 150" className="w-full h-full">
            <rect x={0} y={0} width={340} height={150} fill="#060c10" />
            <path d="M 0 45 Q 60 43 120 40 Q 160 36 180 32 Q 210 28 240 31 Q 280 35 340 42 L 340 60 L 0 60 Z"
              fill="#1a3020" stroke="#22c55e" strokeWidth={1.5} />
            <path d="M 140 32 Q 180 26 220 30" stroke="#ef4444" strokeWidth={2} fill="none" strokeDasharray="4 2" />
            {[80, 155, 200, 265].map((x, i) => (
              <g key={i}>
                <line x1={x} y1={30 + i * 3} x2={x} y2={44} stroke="rgba(0,196,173,0.5)" strokeWidth={1} strokeDasharray="2 2" />
                <rect x={x - 5} y={20 + i * 3} width={10} height={12} rx={1} fill="#0b1318" stroke="#00c4ad" strokeWidth={0.8} />
                <text x={x} y={17 + i * 3} textAnchor="middle" fontSize={6} fill="#3a7a6a" fontFamily="JetBrains Mono">S{i + 1}</text>
              </g>
            ))}
            <text x={185} y={22} textAnchor="middle" fontSize={7} fill="#ef4444" fontFamily="JetBrains Mono">▲ 8.7mm</text>
            {[
              { y: 60, h: 20, color: "#1a2820", label: "Topsoil / Alluvium" },
              { y: 80, h: 30, color: "#131e22", label: "Sandstone / Shale" },
              { y: 110, h: 15, color: "#0e1618", label: "Limestone" },
              { y: 125, h: 12, color: "#080c10", label: "Coal Seam ▬▬▬▬▬" },
              { y: 137, h: 13, color: "#0a1420", label: "Fireclay / Underclay" },
            ].map(l => (
              <g key={l.y}>
                <rect x={0} y={l.y} width={340} height={l.h} fill={l.color} />
                <line x1={0} y1={l.y} x2={340} y2={l.y} stroke="rgba(0,196,173,0.08)" strokeWidth={0.5} />
                <text x={6} y={l.y + l.h / 2 + 3} fontSize={6.5} fill="rgba(0,196,173,0.3)" fontFamily="JetBrains Mono">
                  {l.label}
                </text>
              </g>
            ))}
            {[
              { y: 62, label: "0m" },
              { y: 82, label: "100m" },
              { y: 112, label: "240m" },
              { y: 127, label: "330m" },
            ].map(m => (
              <text key={m.y} x={330} y={m.y + 4} textAnchor="end" fontSize={6} fill="#2a4050" fontFamily="JetBrains Mono">
                {m.label}
              </text>
            ))}
            <text x={6} y={12} fontSize={8} fill="#3a7a8a" fontFamily="JetBrains Mono" letterSpacing="1">SURFACE DEFORMATION PROFILE</text>
          </svg>
        ) : (
          <svg viewBox="0 0 340 150" className="w-full h-full">
            <rect x={0} y={0} width={340} height={150} fill="#060c10" />
            {Array.from({ length: 9 }, (_, i) => (
              <line key={i} x1={i * 40} y1={0} x2={i * 40} y2={150} stroke="rgba(0,196,173,0.04)" strokeWidth={0.5} />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <line key={i} x1={0} y1={i * 30} x2={340} y2={i * 30} stroke="rgba(0,196,173,0.04)" strokeWidth={0.5} />
            ))}
            <rect x={20} y={80} width={300} height={20} fill="#0f1820" stroke="rgba(0,196,173,0.1)" strokeWidth={0.8} />
            <text x={26} y={93} fontSize={7} fill="rgba(0,196,173,0.3)" fontFamily="JetBrains Mono">COAL SEAM — 2B</text>
            <rect x={60} y={82} width={100} height={16} fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.2)" strokeWidth={0.8} />
            <text x={110} y={93} textAnchor="middle" fontSize={6} fill="rgba(239,68,68,0.5)" fontFamily="JetBrains Mono">GOAF</text>
            <rect x={160} y={82} width={60} height={16} fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.25)" strokeWidth={1} />
            <text x={190} y={93} textAnchor="middle" fontSize={6} fill="rgba(249,115,22,0.6)" fontFamily="JetBrains Mono">ACTIVE</text>
            <rect x={220} y={82} width={100} height={16} fill="rgba(34,197,94,0.05)" stroke="rgba(34,197,94,0.15)" strokeWidth={0.8} />
            <text x={270} y={93} textAnchor="middle" fontSize={6} fill="rgba(34,197,94,0.4)" fontFamily="JetBrains Mono">INTACT</text>
            {[80, 100, 125, 145].map((x, i) => (
              <line key={i} x1={x + i} y1={10} x2={x + i * 0.5} y2={80}
                stroke="rgba(239,68,68,0.25)" strokeWidth={0.8} strokeDasharray="3 2" />
            ))}
            <text x={112} y={20} textAnchor="middle" fontSize={7} fill="rgba(239,68,68,0.6)" fontFamily="JetBrains Mono">Subsidence Zone</text>
            {[
              { cx: 100, cy: 70, status: "critical" },
              { cx: 175, cy: 68, status: "danger" },
              { cx: 265, cy: 72, status: "safe" },
            ].map((s, i) => {
              const col = RISK_COLOR[s.status as RiskStatus];
              return (
                <g key={i}>
                  <circle cx={s.cx} cy={s.cy} r={4} fill={`${col}20`} stroke={col} strokeWidth={1} className="pulse-dot" />
                  <circle cx={s.cx} cy={s.cy} r={2} fill={col} />
                </g>
              );
            })}
            <text x={6} y={12} fontSize={8} fill="#3a7a8a" fontFamily="JetBrains Mono" letterSpacing="1">SUBSURFACE CROSS-SECTION</text>
            <text x={6} y={145} fontSize={6} fill="#2a4050" fontFamily="JetBrains Mono">Section A-A' · Scale 1:5000 · RL 340m</text>
          </svg>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, col }: {
  label: string; value: string; sub: string;
  icon: IconComp;
  col: string;
}) {
  return (
    <div className="rounded border flex items-center gap-3 px-3 py-2.5 transition-colors duration-300"
      style={{ background: THEME.card, borderColor: THEME.border }}>
      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
        style={{ background: `${col}18` }}>
        <Icon size={15} style={{ color: col }} />
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-mono tracking-widest uppercase truncate" style={{ color: THEME.mutedText, letterSpacing: "1px" }}>{label}</div>
        <div className="text-sm font-bold" style={{ color: THEME.foreground, fontFamily: "Manrope" }}>{value}</div>
        <div className="text-[9px] font-mono" style={{ color: col }}>{sub}</div>
      </div>
    </div>
  );
}

export default function Overview() {
  const live = useLiveSensorData();
  const [activePin, setActivePin] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState(0);
  const [anomaly, setAnomaly] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sensorData, setSensorData] = useState(() => SENSOR_DEFS.map(s => ({ ...s, value: 0, data: [] })));
  const [liveChartData, setLiveChartData] = useState({
    tilt: [] as DataPt[],
    disp: [] as DataPt[],
    vib: [] as DataPt[],
    temp: [] as DataPt[],
    hum: [] as DataPt[],
  });

  const nodeName = live.selectedNode || "MS-1";

  useEffect(() => {
    const reading = live.latest;
    if (!reading) return;
    const history = live.history;
    const point = (key: "tilt_x" | "distance" | "vibration") => history.map(item => ({
      t: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      v: key === "tilt_x" ? item.tilt_angle : parseFloat(Number(item[key]).toFixed(3)),
    }));
    
    setRiskScore(live.risk?.risk_score ?? 0);
    setAnomaly((live.risk?.anomaly_score ?? 0) * 100);
    setAlerts(live.risk?.alert ? [{ id: String(reading.id), sev: live.risk.risk_level === "CRITICAL" ? "critical" : "warning", msg: live.risk.reasons.join("; ") || "Backend risk alert", loc: `Node ${reading.node_id}`, time: new Date(reading.timestamp).toLocaleTimeString(), ack: false }] : []);
    
    const tiltStatus: RiskStatus = live.risk?.thresholds?.tilt?.severity === "CRITICAL" ? "critical" : live.risk?.thresholds?.tilt?.severity === "WARNING" ? "warning" : "safe";
    const dispStatus: RiskStatus = live.risk?.thresholds?.displacement?.severity === "CRITICAL" ? "critical" : live.risk?.thresholds?.displacement?.severity === "WARNING" ? "warning" : "safe";
    const vibStatus: RiskStatus = live.risk?.thresholds?.vibration?.severity === "CRITICAL" ? "critical" : live.risk?.thresholds?.vibration?.severity === "WARNING" ? "warning" : "safe";

    setSensorData([
      { ...SENSOR_DEFS[0], value: reading.tilt_angle, status: tiltStatus, data: point("tilt_x") },
      { ...SENSOR_DEFS[1], value: reading.distance, status: dispStatus, data: point("distance") },
      { ...SENSOR_DEFS[2], value: reading.vibration, status: vibStatus, data: point("vibration") },
      { ...SENSOR_DEFS[3], value: reading.temperature, status: "safe", data: history.map(item => ({ t: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), v: item.temperature })) },
      { ...SENSOR_DEFS[4], value: reading.humidity, status: "safe", data: history.map(item => ({ t: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), v: item.humidity })) },
    ]);
    setLiveChartData({
      tilt: point("tilt_x"),
      disp: point("distance"),
      vib: point("vibration"),
      temp: history.map(item => ({ t: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), v: item.temperature })),
      hum: history.map(item => ({ t: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), v: item.humidity })),
    });
  }, [live.latest, live.history, live.risk]);

  const ackAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ack: true } : a));
  }, []);

  const unackCount = alerts.filter(a => !a.ack).length;
  const currentRiskLevel = live.risk?.risk_level?.toLowerCase() || "safe";
  const currentRiskStatus: RiskStatus = currentRiskLevel.includes("critical") ? "critical" : currentRiskLevel.includes("high") ? "danger" : currentRiskLevel.includes("warn") ? "warning" : "safe";
  const featureValue = (key: string) => {
    const value = live.risk?.features?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };
  const riskMetrics = [
    { label: "Tilt", score: live.risk?.components?.tilt ?? 0, value: live.latest ? `${live.latest.tilt_angle.toFixed(2)}°` : "—", col: "#ef4444" },
    { label: "Displacement change", score: live.risk?.components?.displacement ?? 0, value: `${featureValue("displacement_change").toFixed(2)} cm`, col: "#f97316" },
    { label: "Vibration", score: live.risk?.components?.vibration ?? 0, value: live.latest ? `${live.latest.vibration.toFixed(3)} g` : "—", col: "#00c4ad" },
    { label: "Temperature", score: live.risk?.components?.temperature ?? 0, value: live.latest ? `${live.latest.temperature.toFixed(1)}°C` : "—", col: "#f59e0b" },
    { label: "Humidity", score: live.risk?.components?.humidity ?? 0, value: live.latest ? `${live.latest.humidity.toFixed(1)}%` : "—", col: "#06cee8" },
    { label: "Pressure", score: live.risk?.components?.pressure ?? 0, value: live.latest?.pressure == null ? "Unavailable" : `${live.latest.pressure.toFixed(1)} hPa`, col: "#a78bfa" },
    { label: "Deformation trend", score: live.risk?.components?.trend ?? 0, value: `${featureValue("recent_trend").toFixed(2)} / sample`, col: "#06cee8" },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: THEME.background, color: THEME.foreground }}>
      <style>{ANIM_CSS}</style>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard label="Active Sensors" value={live.status === "LIVE" ? "1 / 1 Online" : "0 / 1 Online"} sub={live.status === "LIVE" ? `Node ${nodeName} active` : `Node ${nodeName} offline`} icon={Radio} col={live.status === "LIVE" ? "#22c55e" : "#ef4444"} />
          <StatCard label="Active Alerts" value={`${unackCount} Alert${unackCount !== 1 ? "s" : ""}`} sub={unackCount > 0 ? "Requires attention" : "Normal state"} icon={AlertTriangle} col={unackCount > 0 ? "#ef4444" : "#22c55e"} />
          <StatCard label="AI Risk Level" value={live.risk?.risk_level || "NORMAL"} sub={live.risk?.ai_available ? "Isolation Forest active" : "Baseline learning"} icon={Wifi} col={live.risk?.risk_level === "CRITICAL" ? "#ef4444" : live.risk?.risk_level === "HIGH_RISK" ? "#f97316" : live.risk?.risk_level === "WARNING" ? "#eab308" : "#00c4ad"} />
          <StatCard label="Last Reading" value={live.lastSyncAgo || "—"} sub={live.latest ? `Node ${live.latest.node_id}` : "Waiting for packet"} icon={Activity} col="#06cee8" />
        </div>

        <div className="grid gap-2.5" style={{ gridTemplateColumns: "268px 1fr 288px", gridTemplateRows: "370px" }}>
          <div className="rounded border flex flex-col overflow-hidden"
            style={{ background: THEME.card, borderColor: THEME.border, boxShadow: `inset 0 0 0 1px ${THEME.border}` }}>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b"
              style={{ borderColor: THEME.border }}>
              <Shield size={13} style={{ color: THEME.primary }} />
              <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: THEME.mutedText, letterSpacing: "2px" }}>
                Safety Risk Score
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3">
              <CircularGauge score={Math.round(riskScore)} />
              <div className="w-full space-y-1.5 px-1">
                {riskMetrics.map(m => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className="text-[9px] font-mono" style={{ color: THEME.mutedText }}>{m.label}</span>
                    <span className="text-[10px] font-mono font-medium" style={{ color: m.col }}>{Math.round(m.score)}% · {m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded border flex flex-col overflow-hidden"
            style={{ background: THEME.background, borderColor: THEME.border }}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
              style={{ borderColor: THEME.border }}>
              <div className="flex items-center gap-2">
                <MapPin size={13} style={{ color: THEME.primary }} />
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: THEME.mutedText, letterSpacing: "2px" }}>
                  GIS Mine Plan · Panel-B Active Zone
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono" style={{ color: THEME.mutedText }}>
                  Node {nodeName} Active
                </span>
                <div className="w-1.5 h-1.5 rounded-full live-blink" style={{ background: "#00c4ad" }} />
              </div>
            </div>
            <div className="flex-1 p-2">
              <PanelMineMap activePin={activePin} setActivePin={setActivePin} nodeName={nodeName} riskStatus={currentRiskStatus} online={live.status === "LIVE"} />
            </div>
          </div>

          <AIPanel anomaly={anomaly} riskScore={Math.round(riskScore)} risk={live.risk} health={live.health} reading={live.latest} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          {sensorData.map(s => (
            <SensorCard key={s.id} def={s} data={s.data} />
          ))}
        </div>

        <div className="grid gap-2.5" style={{ gridTemplateColumns: "2fr 1fr", gridTemplateRows: "280px" }}>
          <RealTimeChart datasets={[
            { label: "Tilt", data: liveChartData.tilt, color: "#eab308", unit: "°" },
            { label: "Displacement", data: liveChartData.disp, color: "#f97316", unit: "mm" },
            { label: "Vibration", data: liveChartData.vib, color: "#ef4444", unit: "g" },
          ]} />
          <AlertPanel alerts={alerts} onAck={ackAlert} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <NetworkStatus nodes={[nodeName]} allNodesLatest={live.allNodesLatest} allNodesRisk={live.allNodesRisk} lastSyncAgo={live.lastSyncAgo} />
          <DigitalTwin />
        </div>

        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono" style={{ color: "#2a4050" }}>MineSentinel AI v2.4.1</span>
            <span className="text-[9px] font-mono" style={{ color: "#2a4050" }}>·</span>
            <span className="text-[9px] font-mono" style={{ color: "#2a4050" }}>SIH 2024 · CSIR-CIMFR Approved Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Power size={10} style={{ color: live.backendOnline ? "#22c55e" : "#ef4444" }} />
            <span className="text-[9px] font-mono" style={{ color: live.backendOnline ? "#22c55e" : "#ef4444" }}>
              {live.backendOnline ? "System Operational" : "Backend Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
