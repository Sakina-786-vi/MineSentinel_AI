"""Feature engineering for incoming sensor readings.

This module keeps preprocessing independent from FastAPI so the same logic can
be used by the API, model training script, and offline demo.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd

from config import MOVING_AVERAGE_WINDOW, RECENT_TREND_WINDOW
from models import FeatureSet, SensorReading


NUMERIC_FIELDS = [
    "tilt_x",
    "tilt_y",
    "distance",
    "vibration",
    "temperature",
    "humidity",
    "pressure",
]


def _safe_float(value: Any, default: float = 0.0) -> tuple[float, bool]:
    try:
        number = float(value)
        if not math.isfinite(number):
            raise ValueError
        return number, False
    except (TypeError, ValueError):
        return default, True


def _normalized_rows(history: list[SensorReading]) -> pd.DataFrame:
    rows = []
    for reading in history:
        row = reading.as_dict()
        for field in NUMERIC_FIELDS:
            if field == "pressure" and row.get(field) is None:
                continue
            row[field], _ = _safe_float(row.get(field))
        rows.append(row)
    if not rows:
        return pd.DataFrame(columns=["timestamp", *NUMERIC_FIELDS])
    frame = pd.DataFrame(rows)
    # Gateway timestamps are valid ISO-8601 both with and without fractional
    # seconds.  Parse per row so historic packets cannot break live scoring.
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], format="mixed", utc=True)
    return frame.sort_values(["timestamp", "id"], na_position="last").reset_index(drop=True)


def build_features(
    current: SensorReading,
    history: list[SensorReading],
) -> FeatureSet:
    """Build safe, deterministic features for one reading.

    A reading is expected to already have passed the API schema validation. The
    fallback handling remains defensive for database rows or offline callers.
    Missing/invalid numeric values are replaced with a neutral value and listed
    in ``imputed_fields`` so callers can surface data quality information.
    """

    all_readings = [*history, current]
    frame = _normalized_rows(all_readings)
    current_row = frame.iloc[-1]
    imputed_fields: list[str] = []
    values: dict[str, float] = {}
    for field in NUMERIC_FIELDS:
        if field == "pressure" and current_row[field] is None:
            values[field] = None
            continue
        values[field], was_imputed = _safe_float(current_row[field])
        if was_imputed:
            imputed_fields.append(field)

    # Gateway contract: tilt_x = pitch degrees and tilt_y = roll degrees.
    # For two rotations, physical inclination from level is not sqrt(x²+y²).
    # The vertical gravity component is cos(pitch) * cos(roll), so inclination
    # is acos(vertical component), expressed in degrees.
    vertical_component = np.cos(np.radians(frame["tilt_x"])) * np.cos(np.radians(frame["tilt_y"]))
    frame["tilt_angle"] = np.degrees(np.arccos(np.clip(vertical_component, -1.0, 1.0)))
    # Keep the legacy name for the model artifact feature contract.
    frame["tilt_magnitude"] = frame["tilt_angle"]
    previous_distance = frame["distance"].shift(1)
    frame["displacement_change"] = frame["distance"].diff().fillna(0.0)
    frame["time_delta_seconds"] = (
        frame["timestamp"].diff().dt.total_seconds().fillna(0.0).clip(lower=0.0)
    )
    frame["displacement_rate"] = (
        frame["displacement_change"]
        / frame["time_delta_seconds"].replace(0, np.nan)
    ).replace([np.inf, -np.inf], np.nan).fillna(0.0)

    window = min(MOVING_AVERAGE_WINDOW, len(frame))
    frame["tilt_moving_average"] = frame["tilt_angle"].rolling(window, min_periods=1).mean()
    frame["displacement_moving_average"] = (
        frame["displacement_change"].abs().rolling(window, min_periods=1).mean()
    )
    frame["vibration_moving_average"] = frame["vibration"].rolling(window, min_periods=1).mean()

    trend_window = min(RECENT_TREND_WINDOW, len(frame))
    recent = frame.tail(trend_window)
    if len(recent) >= 2:
        x = np.arange(len(recent), dtype=float)
        tilt_slope = float(np.polyfit(x, recent["tilt_angle"], 1)[0])
        displacement_slope = float(np.polyfit(x, recent["distance"], 1)[0])
        recent_trend = max(0.0, tilt_slope + abs(displacement_slope))
    else:
        recent_trend = 0.0

    trend_label = "INCREASING" if recent_trend > 0.05 else "STABLE"
    previous = (
        float(frame["distance"].iloc[-2])
        if len(frame) >= 2
        else values["distance"]
    )
    displacement_change = values["distance"] - previous

    baseline_frame = frame.iloc[max(0, len(frame) - window - 1):-1]
    if baseline_frame.empty:
        baseline_frame = frame.iloc[[-1]]
    tilt_deviation = float(frame["tilt_angle"].iloc[-1] - baseline_frame["tilt_angle"].mean())
    vibration_deviation = float(values["vibration"] - baseline_frame["vibration"].mean())
    temperature_deviation = float(values["temperature"] - baseline_frame["temperature"].mean())
    humidity_deviation = float(values["humidity"] - baseline_frame["humidity"].mean())
    pressure_deviation = float(values["pressure"] - baseline_frame["pressure"].dropna().mean()) if values["pressure"] is not None and baseline_frame["pressure"].notna().any() else None
    previous_row = frame.iloc[-2] if len(frame) >= 2 else frame.iloc[-1]
    seconds = max(1.0, float((frame["timestamp"].iloc[-1] - previous_row["timestamp"]).total_seconds()))
    tilt_rate = float((frame["tilt_angle"].iloc[-1] - previous_row["tilt_angle"]) / seconds)
    vibration_rate = float((values["vibration"] - previous_row["vibration"]) / seconds)
    temperature_rate = float((values["temperature"] - previous_row["temperature"]) / seconds)
    humidity_rate = float((values["humidity"] - previous_row["humidity"]) / seconds)
    pressure_rate = float((values["pressure"] - previous_row["pressure"]) / seconds) if values["pressure"] is not None and previous_row["pressure"] is not None else None

    # The current row's engineered values are taken from normalized data. This
    # protects the downstream model from NaN/Infinity even for offline callers.
    return FeatureSet(
        tilt_magnitude=float(frame["tilt_magnitude"].iloc[-1]),
        tilt_angle=float(frame["tilt_angle"].iloc[-1]),
        tilt_deviation=tilt_deviation,
        vibration_deviation=vibration_deviation,
        temperature_deviation=temperature_deviation,
        humidity_deviation=humidity_deviation,
        pressure_deviation=pressure_deviation,
        tilt_rate=tilt_rate,
        vibration_rate=vibration_rate,
        temperature_rate=temperature_rate,
        humidity_rate=humidity_rate,
        pressure_rate=pressure_rate,
        tilt_baseline_std=float(baseline_frame["tilt_angle"].std(ddof=0)),
        vibration_baseline_std=float(baseline_frame["vibration"].std(ddof=0)),
        displacement_change=float(displacement_change),
        displacement_rate=float(frame["displacement_rate"].iloc[-1]),
        vibration=values["vibration"],
        temperature=values["temperature"],
        humidity=values["humidity"],
        pressure=values["pressure"],
        tilt_x=values["tilt_x"],
        tilt_y=values["tilt_y"],
        tilt_moving_average=float(frame["tilt_moving_average"].iloc[-1]),
        displacement_moving_average=float(frame["displacement_moving_average"].iloc[-1]),
        vibration_moving_average=float(frame["vibration_moving_average"].iloc[-1]),
        recent_trend=float(recent_trend),
        trend_label=trend_label,
        imputed_fields=imputed_fields,
    )
