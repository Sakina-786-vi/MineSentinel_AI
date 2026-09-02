"""Threshold-based sensor severity evaluation."""

from __future__ import annotations

import math
from typing import Any

from config import BASELINE_DEVIATION_THRESHOLDS, RATE_OF_CHANGE_THRESHOLDS, THRESHOLDS


def _finite_or_zero(value: Any) -> float:
    """Keep an optional/missing sensor field from breaking all risk scoring."""
    try:
        number = float(value)
        return number if math.isfinite(number) else 0.0
    except (TypeError, ValueError):
        return 0.0


def calculate_continuous_score(value: float, warning: float, critical: float) -> float:
    """Calculate a continuous 0-100 severity score based on warning and critical thresholds."""
    if value <= 0:
        return 0.0
    if value < warning:
        return (value / warning) * 25.0
    if value < critical:
        return 25.0 + ((value - warning) / (critical - warning)) * 50.0
    return min(100.0, 75.0 + ((value - critical) / critical) * 25.0)


def classify(value: float, thresholds: dict[str, float]) -> str:
    """Return a categorical severity level based on thresholds."""
    # Warning includes the configured upper boundary (e.g. 30–40° tilt);
    # critical begins only once the value exceeds it.
    if value > thresholds["critical"]:
        return "CRITICAL"
    if value >= thresholds["warning"]:
        return "WARNING"
    return "NORMAL"


def evaluate_thresholds(features: dict[str, Any]) -> dict[str, dict[str, float | str]]:
    """Evaluate configured thresholds and compute severity scores for all incoming parameters."""
    values = {
        "tilt": float(features.get("tilt_angle", features.get("tilt_magnitude", 0.0))),
        "displacement": abs(float(features.get("displacement_change", 0.0))),
        "vibration": float(features.get("vibration", 0.0)),
        "temperature": float(features.get("temperature", 0.0)),
        "humidity": float(features.get("humidity", 0.0)),
        "pressure": features.get("pressure"),
    }
    result: dict[str, dict[str, float | str]] = {}
    config_keys = {
        "tilt": "tilt_angle",
        "displacement": "displacement_change",
        "vibration": "vibration",
        "temperature": "temperature",
        "humidity": "humidity",
        "pressure": "pressure",
    }
    for sensor, value in values.items():
        if value is None:
            continue
        value = float(value)
        th = THRESHOLDS[config_keys[sensor]]
        severity = classify(value, th)
        severity_score = calculate_continuous_score(value, th["warning"], th["critical"])
        deviation = abs(_finite_or_zero(features.get(f"{sensor}_deviation")))
        deviation_limits = BASELINE_DEVIATION_THRESHOLDS.get(sensor)
        deviation_score = (
            calculate_continuous_score(deviation, deviation_limits["warning"], deviation_limits["critical"])
            if deviation_limits else 0.0
        )
        rate = abs(_finite_or_zero(features.get(
            f"{sensor}_rate",
            features.get("displacement_rate", 0.0) if sensor == "displacement" else 0.0,
        )))
        rate_limits = RATE_OF_CHANGE_THRESHOLDS.get(sensor)
        rate_score = calculate_continuous_score(rate, rate_limits["warning"], rate_limits["critical"]) if rate_limits else 0.0
        trigger = "absolute value"
        if deviation_limits and deviation_score > severity_score:
            severity_score = deviation_score
            severity = classify(deviation, deviation_limits)
            trigger = "baseline deviation"
        if rate_limits and rate_score > severity_score:
            severity_score = rate_score
            severity = classify(rate, rate_limits)
            trigger = "rate of change"
        result[sensor] = {
            "value": value,
            "deviation": deviation,
            "severity": severity,
            "severity_score": round(severity_score, 2),
            "thresholds": th,
            "deviation_thresholds": deviation_limits,
            "rate": rate,
            "rate_thresholds": rate_limits,
            "trigger": trigger,
        }
    return result
