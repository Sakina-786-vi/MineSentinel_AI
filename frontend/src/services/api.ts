export type Reading = { id: number; node_id: string; timestamp: string; tilt_x: number; tilt_y: number; tilt_angle: number; distance: number; vibration: number; temperature: number; humidity: number; pressure: number | null };
export type ThresholdResult = { value: number; severity: string; severity_score: number; thresholds: Record<string, number> };
export type RiskComponents = { tilt: number; displacement: number; vibration: number; pressure?: number; trend: number; ai_anomaly: number };
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
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    },
  });
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
  return response.json() as Promise<T>;
}
async function patch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}?_t=${Date.now()}`, { method: "PATCH", cache: "no-store", headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } });
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
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
};
