import { useEffect, useState } from "react";
import { Activity, Pause, Play, RotateCcw } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type SimulatorState } from "../services/api";
import "./MLSimulator.css";

const SCENARIOS = [
  ["normal_baseline", "Normal Baseline"],
  ["temporary_vibration", "Temporary Vibration"],
  ["sensor_fault", "Sensor Fault"],
  ["communication_failure", "Communication Failure"],
  ["developing_deformation", "Developing Deformation"],
  ["progressive_subsidence", "Progressive Subsidence"],
] as const;
const SERIES_COLORS = ["#27b7d7", "#f28c38", "#32d583", "#f5c451"];
const MODEL_FEATURES = "tilt, robust tilt rate, vibration RMS, vibration peak, temperature, history count, temporal span, temporal tilt deviation";

function MetricChart({ title, unit, dataKey, state }: { title: string; unit: string; dataKey: string; state: SimulatorState | null }) {
  return (
    <section className="sim-panel sim-chart-panel">
      <div className="sim-panel-heading"><h2>{title}</h2><span>{unit}</span></div>
      <div className="sim-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={state?.charts ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#263542" strokeDasharray="3 4" />
            <XAxis dataKey="time" tick={{ fill: "#60717e", fontSize: 9 }} minTickGap={28} />
            <YAxis tick={{ fill: "#60717e", fontSize: 9 }} width={42} />
            <Tooltip contentStyle={{ background: "#111a23", border: "1px solid #30404d", borderRadius: 4, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 9, color: "#94a3ae" }} />
            <Line dataKey={dataKey} name={`Field maximum (${unit})`} stroke="#e8eef2" strokeWidth={2} dot={false} isAnimationActive={false} />
            {[1, 2, 3].map((node, index) => (
              <Line key={node} dataKey={`node_${node}_${dataKey}`} name={`Node ${node}`} stroke={SERIES_COLORS[index]} strokeWidth={1.4} dot={false} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Evidence({ label, confirmed }: { label: string; confirmed: boolean }) {
  return <div className="sim-evidence"><span className={confirmed ? "is-confirmed" : "is-pending"}>{confirmed ? "YES" : "NO"}</span><span>{label}</span></div>;
}

export default function MLSimulator() {
  const [scenario, setScenario] = useState("developing_deformation");
  const [nodeCount, setNodeCount] = useState(21);
  const [durationHours, setDurationHours] = useState(72);
  const [speedMs, setSpeedMs] = useState(1000);
  const [intensity, setIntensity] = useState(1);
  const [noise, setNoise] = useState(0.7);
  const [state, setState] = useState<SimulatorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.simulatorState().then(setState).catch((cause: Error) => setError(cause.message));
  }, []);

  useEffect(() => {
    if (state?.status !== "running") return;
    let inFlight = false;
    const interval = window.setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        setState(await api.simulatorStep());
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Simulator request failed");
      } finally {
        inFlight = false;
      }
    }, speedMs);
    return () => window.clearInterval(interval);
  }, [state?.status, speedMs]);

  const runAction = async (action: () => Promise<SimulatorState>) => {
    setBusy(true);
    setError(null);
    try {
      setState(await action());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Simulator request failed");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.simulatorStart({ scenario, node_count: nodeCount, duration_hours: durationHours, deformation_intensity: intensity, noise_level: noise, seed: 42 });
      setState(await api.simulatorStep());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start simulation");
    } finally {
      setBusy(false);
    }
  };

  const latest = state?.nodes ?? [];
  const displacementExpectedZero = ["normal_baseline", "temporary_vibration", "sensor_fault", "communication_failure"].includes(state?.scenario ?? "");
  const maxVibration = Math.max(0, ...latest.map((node) => node.vibration_rms_g));
  const affected = state?.spatial?.affected_nodes ?? 0;
  const persistent = (state?.spatial?.persistence_minutes ?? 0) >= 30;
  const futureTilt = state?.prediction?.future_tilt_deg;

  return (
    <div className="ml-simulator-page">
      <header className="sim-page-header">
        <div>
          <div className="sim-eyebrow"><Activity size={13} /> MINE SENTINEL / MODEL LAB</div>
          <h1>MineSentinel AI Simulator</h1>
          <p>Physics-inspired synthetic mine monitoring and prototype risk simulation</p>
        </div>
        <span className="synthetic-badge"><span /> SYNTHETIC SIMULATION</span>
      </header>

      {error && <div className="sim-error" role="alert">Backend unavailable: {error}. Start the MineSentinel backend to run simulations.</div>}

      <div className="sim-layout">
        <aside className="sim-controls sim-panel">
          <div className="sim-panel-heading"><h2>Simulation Controls</h2><span className={`sim-state state-${state?.status ?? "idle"}`}>{state?.status ?? "idle"}</span></div>
          <label>Scenario
            <select value={scenario} onChange={(event) => setScenario(event.target.value)} disabled={state?.status === "running"}>
              {SCENARIOS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>Sensor nodes <strong>{nodeCount}</strong>
            <input type="range" min="20" max="100" step="1" value={nodeCount} onChange={(event) => setNodeCount(Number(event.target.value))} disabled={state?.status === "running"} />
          </label>
          <label>Duration <strong>{durationHours} h</strong>
            <input type="range" min="24" max="240" step="24" value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))} disabled={state?.status === "running"} />
          </label>
          <label>Deformation intensity <strong>{intensity.toFixed(1)}×</strong>
            <input type="range" min="0.1" max="1.5" step="0.1" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} disabled={state?.status === "running"} />
          </label>
          <label>Sensor noise <strong>{noise.toFixed(1)}×</strong>
            <input type="range" min="0" max="2" step="0.1" value={noise} onChange={(event) => setNoise(Number(event.target.value))} disabled={state?.status === "running"} />
          </label>
          <label>Playback speed
            <select value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))}>
              <option value={2000}>0.5×</option><option value={1000}>1×</option><option value={500}>2×</option>
            </select>
          </label>
          <div className="sim-control-actions">
            <button className="sim-button sim-start" onClick={start} disabled={busy || state?.status === "running"}><Play size={14} fill="currentColor" /> Start</button>
            {state?.status === "running"
              ? <button className="sim-button" onClick={() => runAction(api.simulatorPause)} disabled={busy}><Pause size={14} /> Pause</button>
              : state?.status === "paused"
                ? <button className="sim-button" onClick={() => runAction(api.simulatorResume)} disabled={busy}><Play size={14} /> Resume</button>
                : null}
            <button className="sim-icon-button" onClick={() => runAction(api.simulatorReset)} title="Reset simulation" aria-label="Reset simulation"><RotateCcw size={15} /></button>
          </div>
          <div className="sim-clock"><span>SIMULATION CLOCK</span><strong>T+{Math.floor((state?.elapsed_minutes ?? 0) / 60)}h {(state?.elapsed_minutes ?? 0) % 60}m</strong><small>{state?.step ?? 0} samples · 15-minute interval</small></div>
          <p className="sim-safety-note">Synthetic outputs are for demonstration only. They are not live readings, validated safety thresholds, or proof of subsidence.</p>
        </aside>

        <div className="sim-main-column">
          <section className="sim-pipeline sim-panel" aria-label="Simulation pipeline">
            {["SYNTHETIC SENSORS", "FEATURE ENGINEERING", "ISOLATION FOREST", "XGBOOST FORECAST", "SPATIAL + TEMPORAL", "PROTOTYPE RISK"].map((stage, index) => (
              <div className="sim-pipeline-stage" key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong>{index < 5 && <i />}</div>
            ))}
          </section>

          <div className="sim-chart-grid">
            <MetricChart title="Tilt magnitude" unit="°" dataKey="tilt" state={state} />
            <MetricChart title={displacementExpectedZero ? "Cumulative displacement (0 expected)" : "Cumulative displacement"} unit="mm" dataKey="displacement" state={state} />
            <MetricChart title="Vibration RMS" unit="g" dataKey="vibration" state={state} />
            <MetricChart title="Temperature" unit="°C" dataKey="temperature" state={state} />
          </div>

          <section className="sim-ai-grid">
            <div className="sim-panel sim-ai-panel">
              <div className="sim-panel-heading"><h2>Isolation Forest</h2><span className="sim-model-chip">ANOMALY DETECTION</span></div>
              <div className="sim-score-line"><strong>{state?.anomaly?.score?.toFixed(3) ?? "--"}</strong><span className={state?.anomaly?.detected ? "sim-warn" : "sim-ok"}>{state?.anomaly?.status ?? "WAITING"}</span></div>
              <p>An unusual pattern is not automatically subsidence. Vibration, faults, and data quality can also trigger anomalies.</p>
              {!state?.models?.isolation_forest.available && <small className="sim-model-warning">{state?.models?.isolation_forest.message ?? "Model is warming up or unavailable."}</small>}
            </div>
            <div className="sim-panel sim-ai-panel">
              <div className="sim-panel-heading"><h2>XGBoost</h2><span className="sim-model-chip">MODEL PREDICTION</span></div>
              <div className="sim-forecast"><div><small>Current tilt</small><strong>{state?.prediction?.current_tilt_deg?.toFixed(3) ?? "--"}°</strong></div><b>→</b><div><small>Next {state?.prediction?.horizon_hours ?? 1} hour</small><strong>{futureTilt?.toFixed(3) ?? "--"}°</strong></div></div>
              <p>Prediction change: {state?.prediction?.change_deg == null ? "--" : `${state.prediction.change_deg >= 0 ? "+" : ""}${state.prediction.change_deg.toFixed(3)}°`}. Not a guarantee of an event.</p>
              {state?.prediction?.test_metrics?.mae != null && <small className="sim-model-warning">Synthetic test MAE {state.prediction.test_metrics.mae.toFixed(3)}°; persistence baseline {state.prediction.test_metrics.baseline_mae?.toFixed(3) ?? "n/a"}°. Synthetic evaluation only.</small>}
              {!state?.models?.xgboost.available && <small className="sim-model-warning">{state?.models?.xgboost.message ?? "Waiting for sufficient history."}</small>}
            </div>
          </section>

          <section className="sim-panel sim-risk-panel">
            <div className="sim-risk-summary">
              <div><div className="sim-panel-heading"><h2>MineSentinel Risk Assessment</h2><span className="sim-model-chip">PROTOTYPE DECISION LAYER</span></div><p>Combines telemetry anomaly, persistence, deformation trend, spatial support, and sensor/link health.</p></div>
              <div className={`sim-risk-badge risk-${(state?.risk?.level ?? "safe").toLowerCase()}`}><small>RISK LEVEL</small><strong>{state?.risk?.level ?? "SAFE"}</strong><span>{state?.risk?.score?.toFixed(1) ?? "0.0"} / 100</span></div>
            </div>
            <div className="sim-evidence-grid">
              <Evidence label="Persistent deformation" confirmed={persistent} />
              <Evidence label="Neighbour nodes responding" confirmed={affected > 1} />
              <Evidence label="Spatial pattern supported" confirmed={(state?.spatial?.deformation_index ?? 0) >= 0.1} />
              <Evidence label="Vibration elevated" confirmed={maxVibration >= 0.25} />
              <Evidence label="Sensor fault present" confirmed={latest.some((node) => node.sensor_fault)} />
              <Evidence label="Communication degraded" confirmed={latest.some((node) => node.link_status !== "CONNECTED")} />
            </div>
            <div className="sim-reasons">{(state?.risk?.reasons ?? ["Start a simulation to see evidence-based risk reasoning."]).map((reason) => <span key={reason}>{reason}</span>)}</div>
          </section>

          <section className="sim-panel sim-physics-panel">
            <div className="sim-panel-heading"><h2>Physics vs AI</h2><span className="sim-model-chip">EXPECTED PATTERN ≠ MEASURED GROUND TRUTH</span></div>
            <div className="sim-physics-grid">
              <div><small>PHYSICS SIMULATION</small><strong>{state?.physics?.expected_tilt_deg?.toFixed(3) ?? "--"}°</strong><span>Expected deformation profile</span></div>
              <div><small>SENSOR OBSERVATION</small><strong>{state?.prediction?.current_tilt_deg?.toFixed(3) ?? "--"}°</strong><span>Noisy synthetic telemetry</span></div>
              <div><small>AI DETECTION</small><strong>{state?.anomaly?.score?.toFixed(3) ?? "--"}</strong><span>{state?.anomaly?.detected ? "Unusual pattern detected" : "No confirmed anomaly"}</span></div>
              <div><small>AI PREDICTION</small><strong>{futureTilt?.toFixed(3) ?? "--"}°</strong><span>Future tilt model output</span></div>
            </div>
            <small className="sim-footnote">{state?.physics?.label ?? "The Knothe-style physics module provides a prototype expected pattern, not mine ground truth."}</small>
          </section>

          <section className="sim-panel sim-table-panel">
            <div className="sim-panel-heading"><h2>Live Synthetic Node Telemetry</h2><span>{latest.length} reporting / configured nodes</span></div>
            <div className="sim-table-wrap"><table><thead><tr><th>Node</th><th>Tilt</th><th>Displacement</th><th>Vibration</th><th>Anomaly</th><th>Prediction</th><th>Risk</th><th>Sensor</th><th>Link</th></tr></thead>
              <tbody>{latest.slice(0, 15).map((node) => <tr key={node.node_id}>
                <td className="sim-node-id">{node.node_id}</td><td>{node.tilt_magnitude_deg.toFixed(3)}°</td><td>{node.cumulative_displacement_mm.toFixed(2)} mm</td><td>{node.vibration_rms_g.toFixed(3)} g</td><td>{node.anomaly_score?.toFixed(3) ?? "--"}</td><td>{node.predicted_future_tilt_deg?.toFixed(3) ?? "--"}°</td><td><span className={`sim-table-risk ${node.sensor_fault ? "risk-warning" : node.spatial_deformation_index >= 0.5 ? "risk-high" : "risk-safe"}`}>{node.sensor_fault ? "FAULT" : node.spatial_deformation_index >= 0.5 ? "WATCH" : "SAFE"}</span></td><td>{node.sensor_health}</td><td className={node.link_status === "CONNECTED" ? "sim-ok" : "sim-warn"}>{node.link_status}</td>
              </tr>)}</tbody></table>{latest.length === 0 && <div className="sim-empty">Start a scenario to generate synthetic sensor telemetry.</div>}</div>
          </section>

          <section className="sim-panel sim-log-panel">
            <div className="sim-panel-heading"><h2>Simulation Event Log</h2><span>Scenario-derived events</span></div>
            <div className="sim-event-list">{[...(state?.events ?? [])].reverse().slice(0, 8).map((event, index) => <div className="sim-event" key={`${event.time}-${event.title}-${index}`}><span className="sim-event-dot" /><div><strong>{event.title}</strong><p>{event.detail}</p></div><time>{new Date(event.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>)}{!state?.events?.length && <div className="sim-empty">No events yet.</div>}</div>
          </section>
          <details className="sim-model-details"><summary>Model input contract</summary><p>Training and inference feature order is validated against artifact metadata: {MODEL_FEATURES}.</p></details>
        </div>
      </div>
    </div>
  );
}