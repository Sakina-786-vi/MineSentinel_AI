"""Internal dataclasses shared by preprocessing and risk calculations."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class SensorReading:
    node_id: str
    timestamp: datetime
    tilt_x: float
    tilt_y: float
    distance: float
    vibration: float
    temperature: float
    humidity: float
    pressure: float | None = None
    id: int | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "SensorReading":
        timestamp = row["timestamp"]
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        return cls(
            id=row.get("id"),
            node_id=row["node_id"],
            timestamp=timestamp,
            tilt_x=float(row["tilt_x"]),
            tilt_y=float(row["tilt_y"]),
            distance=float(row["distance"]),
            vibration=float(row["vibration"]),
            temperature=float(row["temperature"]),
            humidity=float(row["humidity"]),
            pressure=float(row["pressure"]) if row.get("pressure") is not None else None,
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "node_id": self.node_id,
            "timestamp": self.timestamp.isoformat(),
            "tilt_x": self.tilt_x,
            "tilt_y": self.tilt_y,
            "distance": self.distance,
            "vibration": self.vibration,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "pressure": self.pressure,
        }


@dataclass
class FeatureSet:
    tilt_magnitude: float
    tilt_angle: float
    tilt_deviation: float
    vibration_deviation: float
    temperature_deviation: float
    humidity_deviation: float
    pressure_deviation: float | None
    tilt_rate: float
    vibration_rate: float
    temperature_rate: float
    humidity_rate: float
    pressure_rate: float | None
    tilt_baseline_std: float
    vibration_baseline_std: float
    displacement_change: float
    displacement_rate: float
    vibration: float
    temperature: float
    humidity: float
    pressure: float | None
    tilt_x: float
    tilt_y: float
    tilt_moving_average: float
    displacement_moving_average: float
    vibration_moving_average: float
    recent_trend: float
    trend_label: str
    imputed_fields: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "tilt_magnitude": self.tilt_magnitude,
            "tilt_angle": self.tilt_angle,
            "tilt_deviation": self.tilt_deviation,
            "vibration_deviation": self.vibration_deviation,
            "temperature_deviation": self.temperature_deviation,
            "humidity_deviation": self.humidity_deviation,
            "pressure_deviation": self.pressure_deviation,
            "tilt_rate": self.tilt_rate,
            "vibration_rate": self.vibration_rate,
            "temperature_rate": self.temperature_rate,
            "humidity_rate": self.humidity_rate,
            "pressure_rate": self.pressure_rate,
            "tilt_baseline_std": self.tilt_baseline_std,
            "vibration_baseline_std": self.vibration_baseline_std,
            "displacement_change": self.displacement_change,
            "displacement_rate": self.displacement_rate,
            "vibration": self.vibration,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "pressure": self.pressure,
            "tilt_x": self.tilt_x,
            "tilt_y": self.tilt_y,
            "tilt_moving_average": self.tilt_moving_average,
            "displacement_moving_average": self.displacement_moving_average,
            "vibration_moving_average": self.vibration_moving_average,
            "recent_trend": self.recent_trend,
            "trend_label": self.trend_label,
            "imputed_fields": self.imputed_fields,
        }
