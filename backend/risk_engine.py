"""Transparent weighted risk scoring and alert logic."""

from __future__ import annotations

from typing import Any

from config import RISK_LEVEL_THRESHOLDS, RISK_WEIGHTS


def _level_for_score(score: float) -> str:
    if score >= RISK_LEVEL_THRESHOLDS["critical"]:
        return "CRITICAL"
    if score >= RISK_LEVEL_THRESHOLDS["high_risk"]:
        return "HIGH_RISK"
    if score >= RISK_LEVEL_THRESHOLDS["warning"]:
        return "WARNING"
    return "NORMAL"


def _trend_score(features: dict[str, Any]) -> float:
    trend = abs(float(features.get("recent_trend", 0.0)))
    # Scaling: rate of change / gradient over moving window
    return min(100.0, trend * 100.0)


def _reasons(
    thresholds: dict[str, dict[str, Any]],
    features: dict[str, Any],
    anomaly: dict[str, Any],
) -> list[str]:
    reasons: list[str] = []
    labels = {
        "tilt": "tilt",
        "displacement": "displacement",
        "vibration": "vibration",
        "temperature": "temperature",
        "humidity": "humidity",
        "pressure": "pressure",
    }
    for key, label in labels.items():
        th = thresholds.get(key)
        if th:
            severity = th["severity"]
            if severity == "CRITICAL":
                reasons.append(f"Critical {label} {th.get('trigger', 'threshold')} ({th['value']})")
            elif severity == "WARNING":
                reasons.append(f"Elevated {label} {th.get('trigger', 'threshold')} ({th['value']})")
    if features.get("trend_label") == "INCREASING":
        reasons.append("Increasing deformation trend")
    if anomaly.get("anomaly"):
        reasons.append("Isolation Forest anomaly detected")
    return reasons


def calculate_risk(
    thresholds: dict[str, dict[str, Any]],
    features: dict[str, Any],
    anomaly: dict[str, Any],
) -> dict[str, Any]:
    """Return a bounded continuous score and alert state using transparent weights."""
    weights = dict(RISK_WEIGHTS)
    total_weight = sum(weights.values()) or 1.0
    weights = {key: value / total_weight for key, value in weights.items()}

    tilt_score = float(thresholds.get("tilt", {}).get("severity_score", 0.0))
    displacement_score = float(thresholds.get("displacement", {}).get("severity_score", 0.0))
    vibration_score = float(thresholds.get("vibration", {}).get("severity_score", 0.0))
    temp_score = float(thresholds.get("temperature", {}).get("severity_score", 0.0))
    humidity_score = float(thresholds.get("humidity", {}).get("severity_score", 0.0))
    pressure_score = float(thresholds.get("pressure", {}).get("severity_score", 0.0))
    trend_score = _trend_score(features)
    ai_score = float(anomaly.get("anomaly_score") or 0.0) * 100.0

    raw_score = (
        weights["tilt"] * tilt_score
        + weights["displacement"] * displacement_score
        + weights["vibration"] * vibration_score
        + weights.get("temperature", 0.05) * temp_score
        + weights.get("humidity", 0.05) * humidity_score
        + weights.get("pressure", 0.05) * pressure_score
        + weights["trend"] * trend_score
        + weights["ai_anomaly"] * ai_score
    )

    # Multiple independently critical real sensors must be reflected in the
    # composite score.  The floor is derived from their measured severities,
    # not a fabricated fixed risk value.
    critical_scores = [
        float(item.get("severity_score", 0.0))
        for item in thresholds.values()
        if item.get("severity") == "CRITICAL"
    ]
    if critical_scores:
        # An explicit physical danger limit is never overridden by a normal ML
        # result or diluted by unrelated safe sensors.
        raw_score = max(raw_score, max(critical_scores))
    elif any(item.get("severity") == "WARNING" for item in thresholds.values()):
        # The configured backend warning boundary represents a real threshold
        # crossing, regardless of the weighted aggregate of other sensors.
        raw_score = max(raw_score, RISK_LEVEL_THRESHOLDS["warning"])

    score = round(max(0.0, min(100.0, raw_score)), 2)
    risk_level = _level_for_score(score)
    return {
        "risk_score": score,
        "risk_level": risk_level,
        "alert": risk_level != "NORMAL",
        "alert_status": "none" if risk_level == "NORMAL" else risk_level.lower(),
        "reasons": _reasons(thresholds, features, anomaly),
        "components": {
            "tilt": round(tilt_score, 2),
            "displacement": round(displacement_score, 2),
            "vibration": round(vibration_score, 2),
            "temperature": round(temp_score, 2),
            "humidity": round(humidity_score, 2),
            "pressure": round(pressure_score, 2),
            "trend": round(trend_score, 2),
            "ai_anomaly": round(ai_score, 2),
        },
        "weights": weights,
        "prototype_notice": "Explainable continuous multivariate risk scoring based on real sensor baselines.",
    }
