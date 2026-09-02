import { useLiveSensorData } from "../hooks/SensorDataContext";

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 8, background: "#16212C", borderRadius: 4 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }}/>
    </div>
  );
}

const PIPELINE = [
  { step: "SENSOR DATA",        sub: "IoT nodes · 2-sec intervals", icon: "◉", color: "#27B7D7" },
  { step: "FEATURE EXTRACTION", sub: "Tilt · displacement · vibration", icon: "≣", color: "#2F80ED" },
  { step: "ANOMALY DETECTION",  sub: "Isolation Forest (scikit-learn)", icon: "◈", color: "#F5C451" },
  { step: "RISK ASSESSMENT",    sub: "Weighted severity & trends", icon: "⊕", color: "#F28C38" },
  { step: "EARLY WARNING",      sub: "Threshold triggers · AI alerts", icon: "△", color: "#FF4D5A" },
  { step: "OPERATOR ACTION",    sub: "Dashboard · Alerts · Reports", icon: "⚡", color: "#32D583" },
];

export default function AIAnalysis() {
  const live = useLiveSensorData();
  const risk = live.risk;
  const health = live.health;
  const reading = live.latest;

  const isAiActive = risk?.ai_available ?? health?.ai_available ?? false;
  const comp = risk?.components || { tilt: 0, displacement: 0, vibration: 0, trend: 0, ai_anomaly: 0 };

  const features = [
    { label: "Displacement Rate Severity", value: Math.round(comp.displacement ?? 0), color: "#F28C38" },
    { label: "Tilt Magnitude Severity",    value: Math.round(comp.tilt ?? 0), color: "#F5C451" },
    { label: "Vibration FFT Severity",     value: Math.round(comp.vibration ?? 0), color: "#27B7D7" },
    { label: "Recent Deformation Trend",   value: Math.round(comp.trend ?? 0), color: "#2F80ED" },
    { label: "AI Anomaly Contribution",    value: Math.round(comp.ai_anomaly ?? 0), color: "#32D583" },
  ];

  const insights = risk?.reasons && risk.reasons.length > 0
    ? risk.reasons.map((reason, i) => ({
        time: reading ? new Date(reading.timestamp).toLocaleTimeString() : "Live",
        msg: `${reason} at Node ${risk.node_id}. Calculated risk level is ${risk.risk_level}.`,
        level: risk.risk_level === "CRITICAL" ? "high" as const : risk.risk_level === "HIGH_RISK" ? "high" as const : "warning" as const,
      }))
    : [
        {
          time: reading ? new Date(reading.timestamp).toLocaleTimeString() : "Live",
          msg: isAiActive
            ? `All sensor readings for Node ${live.selectedNode || "MS-1"} are within normal baseline tolerances.`
            : (health?.ai_message || "Baseline model active. Collecting historical sensor readings for model validation."),
          level: "normal" as const,
        },
      ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>AI Analysis</h1>
        <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>Subsidence anomaly detection and risk estimation engine</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Model status */}
        <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#60717E", letterSpacing: "0.1em", marginBottom: 14 }}>AI MODEL STATUS</div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#60717E", marginBottom: 2 }}>Model</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EEF2" }}>Isolation Forest Anomaly Detector</div>
              <div style={{ fontSize: 11, color: "#94A3AE", marginTop: 2 }}>Backend scikit-learn · Node {live.selectedNode || "MS-1"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="blink" style={{ width: 7, height: 7, borderRadius: "50%", background: isAiActive ? "#32D583" : "#F5C451", display: "inline-block" }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: isAiActive ? "#32D583" : "#F5C451" }}>
                {isAiActive ? "ACTIVE" : "BASELINE"}
              </span>
            </div>
          </div>

          {[
            { label: "Model Status", value: isAiActive ? "Inference Active" : "Threshold Fallback", color: isAiActive ? "#32D583" : "#F5C451" },
            { label: "Current Anomaly Score", value: risk?.anomaly_score !== null && risk?.anomaly_score !== undefined ? `${(risk.anomaly_score * 100).toFixed(1)}%` : "Insufficient data", color: "#F28C38" },
            { label: "Anomaly Classification", value: risk?.anomaly ? "ANOMALOUS" : "NORMAL", color: risk?.anomaly ? "#FF4D5A" : "#32D583" },
            { label: "Backend Risk Score", value: risk ? `${risk.risk_score} / 100` : "Insufficient data", color: (risk?.risk_score ?? 0) > 60 ? "#FF4D5A" : "#32D583" },
            { label: "Last Evaluated Timestamp", value: reading ? new Date(reading.timestamp).toLocaleTimeString() : "Waiting for packet", color: "#94A3AE" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1B2733" }}>
              <span style={{ fontSize: 12, color: "#60717E" }}>{label}</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color }}>{value}</span>
            </div>
          ))}

          <div style={{ marginTop: 14, background: "#0B1117", border: "1px solid #1B2733", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#2F80ED", fontWeight: 700, marginBottom: 6 }}>MODEL INTERPRETATION</div>
            <p style={{ fontSize: 12, color: "#94A3AE", margin: 0, lineHeight: 1.6 }}>
              {isAiActive
                ? "Isolation Forest evaluates multivariate sensor vectors (tilt, displacement, vibration, temperature) against the learned normal distribution to identify multidimensional outliers."
                : "Real data collection active. Baseline is established directly from genuine ESP32 gateway sensor history."}
            </p>
          </div>
        </div>

        {/* Feature contribution */}
        <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#60717E", letterSpacing: "0.1em", marginBottom: 14 }}>RISK COMPONENT SEVERITY SCORES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {features.map(f => (
              <div key={f.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "#94A3AE" }}>{f.label}</span>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: f.color }}>{f.value}%</span>
                </div>
                <ProgressBar value={f.value} color={f.color}/>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: "12px", background: "#0B1117", borderRadius: 8, border: "1px solid #1B2733" }}>
            <div style={{ fontSize: 10, color: "#F5C451", fontWeight: 700, marginBottom: 6 }}>IMPORTANT NOTICE</div>
            <p style={{ fontSize: 11, color: "#60717E", margin: 0, lineHeight: 1.5 }}>
              This AI system provides anomaly detection and subsidence-risk estimation only. It does not predict ground collapse with certainty. All high-risk alerts must be verified by qualified personnel.
            </p>
          </div>
        </div>
      </div>

      {/* Early warning pipeline */}
      <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#60717E", letterSpacing: "0.1em", marginBottom: 16 }}>EARLY WARNING PIPELINE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
          {PIPELINE.map((step, i, arr) => (
            <div key={step.step} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ background: "#16212C", border: `1px solid ${step.color}44`, borderRadius: 8, padding: "12px 16px", textAlign: "center", minWidth: 120 }}>
                <div style={{ fontSize: 20, color: step.color, marginBottom: 6 }}>{step.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#E8EEF2", letterSpacing: "0.04em" }}>{step.step}</div>
                <div style={{ fontSize: 10, color: "#60717E", marginTop: 3, lineHeight: 1.4 }}>{step.sub}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px" }}>
                  <div style={{ width: 24, height: 1, background: "#263542" }}/>
                  <span style={{ fontSize: 14, color: "#30404D" }}>›</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current AI insights */}
      <div style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#60717E", letterSpacing: "0.1em", marginBottom: 12 }}>CURRENT AI INSIGHTS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((ins, i) => {
            const colors: Record<string, string> = { high: "#F28C38", warning: "#F5C451", normal: "#32D583" };
            return (
              <div key={i} style={{ display: "flex", gap: 12, padding: "10px 12px", background: "#16212C", borderRadius: 6, border: `1px solid ${colors[ins.level]}22` }}>
                <div style={{ width: 3, borderRadius: 2, background: colors[ins.level], flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#94A3AE", lineHeight: 1.5 }}>{ins.msg}</p>
                </div>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#60717E", flexShrink: 0 }}>{ins.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
