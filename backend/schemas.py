"""Pydantic API contracts for sensor ingestion and monitoring responses."""

from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator


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
        if value.upper().startswith("MS-") and re.fullmatch(r"MS-[1-9][0-9]*", value) is None:
            raise ValueError("physical node IDs must use the canonical format MS-<positive integer>, e.g. MS-1")
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
    # Expose database receipt time separately from the device measurement time.
    model_config = ConfigDict(extra="ignore")
    id: int
    received_at: datetime | None = Field(default=None, validation_alias="created_at")

    @field_validator("received_at", mode="before")
    @classmethod
    def normalize_received_at(cls, value: datetime | str | None) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

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


class NodeLocationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location_source: Literal["geographic", "local_mine_plan"]
    latitude: float | None = None
    longitude: float | None = None
    local_x: float | None = None
    local_y: float | None = None
    elevation_or_depth: float | None = None
    coordinate_system: str | None = Field(default=None, max_length=120)
    installation_description: str | None = Field(default=None, max_length=300)
    location_accuracy: float | None = Field(default=None, ge=0)
    location_verified: bool = False

    @field_validator("latitude", "longitude", "local_x", "local_y", "elevation_or_depth", "location_accuracy")
    @classmethod
    def finite_location_value(cls, value: float | None) -> float | None:
        if value is not None and not math.isfinite(value):
            raise ValueError("location values must be finite numbers")
        return value

    @model_validator(mode="after")
    def validate_coordinate_pair(self) -> "NodeLocationIn":
        if self.location_source == "geographic":
            if self.latitude is None or self.longitude is None:
                raise ValueError("geographic locations require latitude and longitude")
            if not -90 <= self.latitude <= 90 or not -180 <= self.longitude <= 180:
                raise ValueError("latitude or longitude is outside its valid range")
            if self.local_x is not None or self.local_y is not None:
                raise ValueError("geographic locations must not include local mine-plan coordinates")
        else:
            if self.local_x is None or self.local_y is None:
                raise ValueError("local mine-plan locations require X and Y coordinates")
            if not self.coordinate_system or not self.coordinate_system.strip():
                raise ValueError("local mine-plan coordinates require a coordinate system")
            if self.latitude is not None or self.longitude is not None:
                raise ValueError("local mine-plan locations must not include geographic coordinates")
        return self


class HealthResponse(BaseModel):
    status: str
    ai_available: bool
    ai_message: str | None = None
