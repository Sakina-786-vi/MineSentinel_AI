import { useState } from "react";
import type { RiskLevel } from "../types";

export interface MapNode {
  id: string;
  label: string;
  status: "online" | "offline";
  tilt: number;
  displacement: number;
  vibration: number;
  temperature: number;
  humidity: number;
  risk: RiskLevel;
  riskScore: number;
  lastUpdate: string;
  position: { x: number; y: number };
}

const RISK_COLOR: Record<RiskLevel, string> = {
  normal: "#32D583",
  warning: "#F5C451",
  high: "#F28C38",
  critical: "#FF4D5A",
};

function NodeMarker({ node, onClick, selected }: { node: MapNode; onClick: () => void; selected: boolean }) {
  const color = node.status === "offline" ? "#60717E" : RISK_COLOR[node.risk];
  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      transform={`translate(${(node.position.x / 100) * 480 + 20}, ${(node.position.y / 100) * 280 + 30})`}
    >
      {node.risk === "high" || node.risk === "critical" ? (
        <>
          <circle r="14" fill={color} fillOpacity="0.08">
            <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="fill-opacity" values="0.12;0.02;0.12" dur="2s" repeatCount="indefinite"/>
          </circle>
        </>
      ) : null}
      <circle r="9" fill={selected ? color : "#111A23"} stroke={color} strokeWidth={selected ? 2 : 1.5} fillOpacity={selected ? 0.25 : 1}/>
      <circle r="4" fill={color}/>
      <text y={-16} textAnchor="middle" fill="#E8EEF2" fontSize="10" fontFamily="JetBrains Mono" fontWeight="600">{node.id}</text>
    </g>
  );
}

function NodeGrid() {
  const cols = [20, 50, 80];
  const rows = [20, 50, 80];
  const lines: JSX.Element[] = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols.length - 1; c++) {
      const x1 = (cols[c] / 100) * 480 + 20;
      const x2 = (cols[c + 1] / 100) * 480 + 20;
      const y = (rows[r] / 100) * 280 + 30;
      lines.push(<line key={`h${r}${c}`} x1={x1} y1={y} x2={x2} y2={y} stroke="#263542" strokeWidth="1" strokeDasharray="4 3"/>);
    }
  }
  for (let c = 0; c < cols.length; c++) {
    for (let r = 0; r < rows.length - 1; r++) {
      const x = (cols[c] / 100) * 480 + 20;
      const y1 = (rows[r] / 100) * 280 + 30;
      const y2 = (rows[r + 1] / 100) * 280 + 30;
      lines.push(<line key={`v${r}${c}`} x1={x} y1={y1} x2={x2} y2={y2} stroke="#263542" strokeWidth="1" strokeDasharray="4 3"/>);
    }
  }
  return <>{lines}</>;
}

export default function GISMap({ nodes, onNodeSelect }: { nodes: MapNode[]; onNodeSelect: (n: MapNode | null) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  function select(node: MapNode) {
    const next = selected === node.id ? null : node.id;
    setSelected(next);
    onNodeSelect(next ? node : null);
  }

  const hovNode = hovered ? nodes.find(n => n.id === hovered) : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 380, flex: 1, display: "flex", flexDirection: "column" }}>
      <svg width="100%" height="100%" viewBox="0 0 520 340" style={{ display: "block", flex: 1, minHeight: 380 }}>
        {/* Background terrain */}
        <rect width="520" height="340" fill="#0B1117"/>
        {/* Grid lines faint */}
        <line x1="0" y1="113" x2="520" y2="113" stroke="#1B2733" strokeWidth="0.5"/>
        <line x1="0" y1="227" x2="520" y2="227" stroke="#1B2733" strokeWidth="0.5"/>
        <line x1="173" y1="0" x2="173" y2="340" stroke="#1B2733" strokeWidth="0.5"/>
        <line x1="347" y1="0" x2="347" y2="340" stroke="#1B2733" strokeWidth="0.5"/>

        {/* Panel boundary */}
        <rect x="18" y="14" width="484" height="312" rx="2" fill="none" stroke="#263542" strokeWidth="1.5" strokeDasharray="8 4"/>

        {/* Panel label */}
        <text x="28" y="28" fill="#2F80ED" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600">PANEL A — JHARIA COALFIELD</text>

        {/* Risk heatmap */}
        <ellipse cx="260" cy="170" rx="75" ry="55" fill="rgba(242,140,56,0.07)"/>
        <ellipse cx="260" cy="170" rx="45" ry="33" fill="rgba(242,140,56,0.08)"/>

        {/* Underground panel outline */}
        <rect x="60" y="60" width="400" height="220" rx="2" fill="none" stroke="#1B2733" strokeWidth="1" strokeDasharray="12 6"/>
        <text x="68" y="76" fill="#30404D" fontSize="9" fontFamily="JetBrains Mono">UNDERGROUND PANEL BOUNDARY</text>

        {/* Road-like feature */}
        <path d="M0 290 Q150 280 260 285 Q380 292 520 278" stroke="#1B2733" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <text x="60" y="304" fill="#263542" fontSize="8" fontFamily="JetBrains Mono">MINE ACCESS ROAD</text>

        {/* Infrastructure marker */}
        <rect x="440" y="20" width="60" height="22" rx="2" fill="#16212C" stroke="#263542" strokeWidth="1"/>
        <text x="445" y="34" fill="#60717E" fontSize="8" fontFamily="JetBrains Mono">SHAFT NO.2</text>

        {/* Connection grid */}
        <NodeGrid/>

        {/* Sensor nodes */}
        {nodes.map(node => (
          <g key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <NodeMarker node={node} selected={selected === node.id} onClick={() => select(node)}/>
          </g>
        ))}

        {/* Legend */}
        {(["normal","warning","high","critical"] as RiskLevel[]).map((r, i) => (
          <g key={r} transform={`translate(${22 + i * 110}, 322)`}>
            <circle cx="6" cy="-3" r="4" fill={RISK_COLOR[r]}/>
            <text x="14" y="0" fill="#60717E" fontSize="9" fontFamily="JetBrains Mono" textAnchor="start">
              {r.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>

      {/* Hover tooltip */}
      {hovNode && (
        <div style={{
          position: "absolute",
          left: `${(hovNode.position.x / 100) * 100}%`,
          top: `${Math.max(0, (hovNode.position.y / 100) * 100 - 18)}%`,
          transform: "translate(-50%, -100%)",
          background: "#16212C", border: "1px solid #30404D",
          borderRadius: 6, padding: "6px 10px", pointerEvents: "none",
          fontSize: 11, color: "#E8EEF2", whiteSpace: "nowrap",
          zIndex: 10,
        }}>
          <div style={{ fontFamily: "JetBrains Mono", fontWeight: 600 }}>{hovNode.id}</div>
          <div style={{ color: "#94A3AE" }}>Tilt: {hovNode.tilt}° · Risk: {hovNode.riskScore}</div>
        </div>
      )}
    </div>
  );
}
