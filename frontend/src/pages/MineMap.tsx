import { useState, useMemo } from "react";
import { useLiveSensorData } from "../hooks/SensorDataContext";
import { type MapNode } from "../components/GISMap";
import MineTerrain3D from "../components/MineTerrain3D";
import NodeDetailPanel from "../components/NodeDetailPanel";
import { toRiskLevel } from "../types";

const POSITIONS = [
  { x: 20, y: 20 },
  { x: 50, y: 20 },
  { x: 80, y: 20 },
  { x: 20, y: 50 },
  { x: 50, y: 50 },
  { x: 80, y: 50 },
  { x: 20, y: 80 },
  { x: 50, y: 80 },
  { x: 80, y: 80 },
];

export default function MineMap() {
  const live = useLiveSensorData();
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);

  const mapNodes: MapNode[] = useMemo(() => {
    const list = live.latest?.node_id === "MS-1" ? [live.latest] : [];

    return list.map((reading, i) => {
      const risk = live.allNodesRisk.find(r => r.node_id === reading.node_id) || live.risk;
      const isOnline = Date.now() - new Date(reading.timestamp).getTime() <= 30000;
      const riskLevel = toRiskLevel(risk?.risk_level);
      return {
        id: reading.node_id,
        label: reading.node_id,
        status: isOnline ? "online" : "offline",
        tilt: reading.tilt_angle,
        displacement: parseFloat(reading.distance.toFixed(1)),
        vibration: reading.vibration,
        temperature: parseFloat(reading.temperature.toFixed(1)),
        humidity: parseFloat(reading.humidity.toFixed(1)),
        risk: riskLevel,
        riskScore: risk?.risk_score ?? 0,
        lastUpdate: new Date(reading.timestamp).toLocaleTimeString(),
        position: { x: 50, y: 50 },
      };
    });
  }, [live.allNodesLatest, live.allNodesRisk, live.latest, live.risk]);

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", padding: "16px", gap: 12, minHeight: 450 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>Mine Map</h1>
          <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>Jharia Coalfield · Panel A · Real-time GIS Sensor Map</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["normal","warning","high","critical"] as const).map(r => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: { normal: "#32D583", warning: "#F5C451", high: "#F28C38", critical: "#FF4D5A" }[r], display: "inline-block" }}/>
              <span style={{ fontSize: 10, color: "#60717E", textTransform: "uppercase" }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", gap: 12, overflow: "hidden", minHeight: 380 }}>
        {/* Node list */}
        <div style={{ width: 180, flexShrink: 0, background: "#111A23", border: "1px solid #263542", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #1B2733", fontSize: 10, fontWeight: 600, color: "#60717E", letterSpacing: "0.08em" }}>NODE LIST ({mapNodes.length})</div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {mapNodes.length > 0 ? mapNodes.map(node => {
              const riskColor: Record<string, string> = { normal: "#32D583", warning: "#F5C451", high: "#F28C38", critical: "#FF4D5A" };
              return (
                <div key={node.id} onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                  style={{
                    padding: "10px 12px", cursor: "pointer",
                    background: selectedNode?.id === node.id ? "#16212C" : "transparent",
                    borderLeft: `2px solid ${selectedNode?.id === node.id ? riskColor[node.risk] : "transparent"}`,
                    borderBottom: "1px solid #1B2733",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#E8EEF2" }}>{node.id}</div>
                    <div style={{ fontSize: 10, color: "#60717E" }}>{node.tilt}° · {node.displacement}mm</div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: riskColor[node.risk] }}/>
                </div>
              );
            }) : (
              <div style={{ padding: 12, color: "#60717E", fontSize: 11 }}>No active nodes</div>
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: 380, background: "#0B1117", border: "1px solid #263542", borderRadius: 10, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
          <MineTerrain3D nodes={mapNodes} selectedId={selectedNode?.id ?? null} onNodeSelect={setSelectedNode} />
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)}/>
        )}
      </div>
    </div>
  );
}
