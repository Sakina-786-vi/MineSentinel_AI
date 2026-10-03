export type Reading = { id: number; node_id: string; timestamp: string; received_at?: string | null; tilt_x: number; tilt_y: number; tilt_angle: number; distance: number; vibration: number; temperature: number; humidity: number; pressure: number | null };
export type ThresholdResult = { value: number; severity: string; severity_score: number; thresholds: Record<string, number> };
export type RiskComponents = { tilt: number; displacement: number; vibration: number; temperature: number; humidity: number; pressure?: number; trend: number; ai_anomaly: number };
export type Risk = {
  node_id: string; timestamp: string; risk_score: number; risk_level: string;
  anomaly: boolean; anomaly_score: number | null; ai_available: boolean;
  reasons: string[]; alert: boolean; alert_status: string;
  features: Record<string, unknown>;
  thresholds: Record<string, ThresholdResult>;
  components?: RiskComponents;
  weights?: Record<string, number>;
  prototype_notice?: string;
};
export type Health = { status: string; ai_available: boolean; ai_message?: string | null };
export type StoredAlert = { id: number; node_id: string; timestamp: string; severity: string; risk_score: number; trigger: string; reasons: string[]; sensor_snapshot: Reading; acknowledged: boolean; acknowledged_at?: string | null };
export type NodeLocation = {
  node_id: string; location_source: "geographic" | "local_mine_plan";
  latitude: number | null; longitude: number | null; local_x: number | null; local_y: number | null;
  elevation_or_depth: number | null; coordinate_system: string | null;
  installation_description: string | null; location_accuracy: number | null;
  location_verified: boolean; last_updated: string;
};
export type NodeLocationInput = Omit<NodeLocation, "node_id" | "last_updated">;
export type SimulatorNode = {
  node_id: string; timestamp: string; tilt_x_deg: number; tilt_y_deg: number;
  tilt_magnitude_deg: number; cumulative_displacement_mm: number;
  displacement_rate_mm_per_hour: number; vibration_rms_g: number;
  temperature_c: number; anomaly_score: number | null;
  predicted_future_tilt_deg: number | null; sensor_health: string;
  sensor_fault: boolean; communication_health_score: number;
  link_status: string; rssi_dbm: number; packet_loss_pct: number;
  persistence_duration_min: number; neighbour_anomaly_count: number;
  spatial_deformation_index: number;
};
export type SimulatorPoint = Record<string, number | string>;
export type SimulatorState = {
  synthetic: boolean; status: string; scenario: string; scenario_label: string;
  step: number; elapsed_minutes: number; node_count?: number;
  models?: {
    isolation_forest: { available: boolean; version?: string; message?: string | null };
    xgboost: { available: boolean; version?: string; horizon_hours?: number; message?: string | null; test_metrics?: { mae?: number; rmse?: number; r2?: number; baseline_mae?: number } };
    minimum_history_count: number;
  };
  anomaly?: { status: string; detected: boolean; score: number | null; detected_nodes: string[]; explanation: string };
  prediction?: { available: boolean; current_tilt_deg: number; future_tilt_deg: number | null; change_deg: number | null; horizon_hours: number; model_version?: string; message?: string | null; test_metrics?: { mae?: number; rmse?: number; r2?: number; baseline_mae?: number } };
  spatial?: { affected_nodes: number; persistent_nodes: number; neighbour_count: number; deformation_index: number; correlation: number; persistence_minutes: number; confirmed: boolean };
  risk?: { score: number; level: string; reasons: string[] };
  physics?: { label: string; expected_tilt_deg: number; expected_displacement_mm: number };
  nodes: SimulatorNode[];
  charts: SimulatorPoint[];
  events: { time: string; title: string; detail: string }[];
};
function getApiUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}
const API_URL = getApiUrl();
async function request<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${API_URL}${path}${sep}_t=${Date.now()}`;
  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
  return response.json() as Promise<T>;
}
async function patch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}?_t=${Date.now()}`, { method: "PATCH", cache: "no-store", headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } });
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
  return response.json() as Promise<T>;
}
async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store, must-revalidate" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
  return response.json() as Promise<T>;
}
async function put<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store, must-revalidate" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = `Backend request failed (${response.status})`;
    try {
      const payload = await response.json() as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch { /* Keep the status-based message when the response is not JSON. */ }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}
export const api = {
  health: () => request<Health>("/api/health"),
  nodes: () => request<{ nodes: string[] }>("/api/nodes"),
  latest: (nodeId?: string) => request<Reading | Reading[]>(`/api/latest${nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : ""}`),
  history: (nodeId: string, limit = 500) => request<Reading[]>(`/api/history?node_id=${encodeURIComponent(nodeId)}&limit=${limit}`),
  risk: (nodeId?: string) => request<Risk | Risk[]>(`/api/risk${nodeId ? `?node_id=${encodeURIComponent(nodeId)}` : ""}`),
  alerts: (nodeId = "MS-1") => request<StoredAlert[]>(`/api/alerts?node_id=${encodeURIComponent(nodeId)}`),
  acknowledgeAlert: (alertId: number) => patch<StoredAlert>(`/api/alerts/${alertId}/acknowledge`),
  nodeLocation: (nodeId: string) => request<{ node_id: string; location: NodeLocation | null }>(`/api/nodes/${encodeURIComponent(nodeId)}/location`),
  saveNodeLocation: (nodeId: string, location: NodeLocationInput, replaceVerified = false) => put<{ node_id: string; location: NodeLocation }>(`/api/nodes/${encodeURIComponent(nodeId)}/location${replaceVerified ? "?replace_verified=true" : ""}`, location),
  simulatorState: () => request<SimulatorState>("/api/ml-simulator/state"),
  simulatorStart: (settings: { scenario: string; node_count: number; duration_hours: number; deformation_intensity: number; noise_level: number; seed: number }) => post<SimulatorState>("/api/ml-simulator/start", settings),
  simulatorPause: () => post<SimulatorState>("/api/ml-simulator/pause"),
  simulatorResume: () => post<SimulatorState>("/api/ml-simulator/resume"),
  simulatorReset: () => post<SimulatorState>("/api/ml-simulator/reset"),
  simulatorStep: () => post<SimulatorState>("/api/ml-simulator/step"),
};
