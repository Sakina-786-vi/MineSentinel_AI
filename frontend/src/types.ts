export type RiskLevel = "normal" | "warning" | "high" | "critical";
export function toRiskLevel(value?: string): RiskLevel { const v = value?.toLowerCase().replace("_risk", ""); return v === "critical" || v === "high" || v === "warning" ? v : "normal"; }
