import type { MapNode } from "./GISMap";
import RiskBadge from "./RiskBadge";

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1B2733" }}>
      <span style={{ fontSize: 11, color: "#60717E" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#E8EEF2", fontFamily: mono ? "JetBrains Mono" : undefined, fontWeight: mono ? 500 : 400 }}>{value}</span>
    </div>
  );
}

export default function NodeDetailPanel({ node, onClose }: { node: MapNode; onClose: () => void }) {
  return (
    <div className="slide-in" style={{
      width: 260, background: "#111A23",
      border: "1px solid #263542", borderRadius: 10,
      padding: 16, flexShrink: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 16, color: "#E8EEF2" }}>NODE {node.id}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="blink" style={{ width: 6, height: 6, borderRadius: "50%", background: node.status === "online" ? "#32D583" : "#FF4D5A", display: "inline-block" }}/>
              <span style={{ fontSize: 10, color: node.status === "online" ? "#32D583" : "#FF4D5A", fontWeight: 600 }}>{node.status.toUpperCase()}</span>
            </span>
          </div>
          <div style={{ marginTop: 6 }}><RiskBadge level={node.risk} size="sm"/></div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#60717E", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {/* Risk score */}
      <div style={{ background: "#16212C", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#60717E", letterSpacing: "0.06em" }}>RISK SCORE</div>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 28, fontWeight: 700, color: node.riskScore > 60 ? "#F28C38" : node.riskScore > 30 ? "#F5C451" : "#32D583" }}>
            {node.riskScore}
            <span style={{ fontSize: 12, color: "#60717E", fontWeight: 400 }}> / 100</span>
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${node.riskScore > 60 ? "#F28C38" : node.riskScore > 30 ? "#F5C451" : "#32D583"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: "#94A3AE" }}>{node.riskScore}%</span>
        </div>
      </div>

      <Row label="Tilt" value={`${node.tilt}°`} mono/>
      <Row label="Displacement" value={`${node.displacement} mm`} mono/>
      <Row label="Vibration" value={<span style={{ color: "#32D583", fontWeight: 600, fontSize: 11 }}>{node.vibration.toFixed(3)} g</span>}/>
      <Row label="Temperature" value={`${node.temperature}°C`} mono/>
      <Row label="Humidity" value={`${node.humidity}%`} mono/>
      <Row label="Last Update" value={node.lastUpdate} mono/>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: "7px 0", background: "#2F80ED",
          border: "none", borderRadius: 6,
          color: "#fff", fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
          letterSpacing: "0.04em",
        }}>CLOSE</button>
      </div>
    </div>
  );
}
