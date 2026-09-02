"""Pydantic API contracts for sensor ingestion and monitoring responses."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class SensorReadingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    node_id: str = Field(min_length=1, max_length=64)
    timestamp: datetime
    tilt_x: float
    tilt_y: float
    distance: float
    vibration: float
    temperature: float
    humidity: float
    pressure: float | None = Field(default=None, description="Atmospheric pressure in hPa, when supplied by the gateway")

    @field_validator("node_id")
    @classmethod
    def clean_node_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("node_id must not be blank")
        return value

    @field_validator("timestamp")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        # The example payload is timezone-naive. Treat it as UTC rather than
        # silently mixing local and UTC timestamps in trend calculations.
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

    @field_validator(
        "tilt_x", "tilt_y", "distance", "vibration", "temperature", "humidity", "pressure"
    )
    @classmethod
    def finite_sensor_value(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not math.isfinite(value):
            raise ValueError("sensor values must be finite numbers")
        return value


class SensorReadingOut(SensorReadingIn):
    # Database metadata such as created_at is intentionally not part of the public API.
    model_config = ConfigDict(extra="ignore")
    id: int

    @computed_field
    @property
    def tilt_angle(self) -> float:
        """Physical inclination from level, derived from pitch/roll in degrees."""
        vertical = math.cos(math.radians(self.tilt_x)) * math.cos(math.radians(self.tilt_y))
        return round(math.degrees(math.acos(max(-1.0, min(1.0, vertical)))), 4)


class ThresholdResult(BaseModel):
    value: float
    severity: str
    severity_score: float
    thresholds: dict[str, float]


class AnalysisOut(BaseModel):
    features: dict[str, Any]
    thresholds: dict[str, ThresholdResult]
    anomaly: bool
    anomaly_score: float | None
    ai_available: bool
    ai_message: str | None = None


class IngestResponse(BaseModel):
    reading: SensorReadingOut
    analysis: AnalysisOut
    risk: dict[str, Any]


class RiskResponse(BaseModel):
    node_id: str
    timestamp: datetime
    risk_score: float
    risk_level: str
    anomaly: bool
    anomaly_score: float | None
    ai_available: bool
    reasons: list[str]
    alert: bool
    alert_status: str
    features: dict[str, Any]
    thresholds: dict[str, ThresholdResult]
    prototype_notice: str


class NodeListResponse(BaseModel):
    nodes: list[str]


class HealthResponse(BaseModel):
    status: str
    ai_available: bool
    ai_message: str | None = None
