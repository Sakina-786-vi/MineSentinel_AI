import type { RiskLevel } from "../data/mockData";

const CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  normal:   { label: "NORMAL",   color: "#32D583", bg: "rgba(50,213,131,0.10)" },
  warning:  { label: "WARNING",  color: "#F5C451", bg: "rgba(245,196,81,0.10)" },
  high:     { label: "HIGH RISK",color: "#F28C38", bg: "rgba(242,140,56,0.10)" },
  critical: { label: "CRITICAL", color: "#FF4D5A", bg: "rgba(255,77,90,0.10)" },
};

export default function RiskBadge({ level, size = "sm" }: { level: RiskLevel; size?: "xs" | "sm" | "md" }) {
  const c = CONFIG[level];
  const px = size === "xs" ? "4px 6px" : size === "sm" ? "3px 8px" : "5px 12px";
  const fs = size === "xs" ? 10 : size === "sm" ? 11 : 12;
  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.color}33`,
      padding: px, borderRadius: 4,
      fontSize: fs, fontWeight: 600,
      letterSpacing: "0.06em", fontFamily: "inherit",
      whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}
