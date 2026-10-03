"""Synthetic MineSentinel telemetry simulation and isolated ML inference."""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field


ML_ROOT = Path(__file__).resolve().parents[2] / "ml"
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

from simulator.field import SITE_PRESETS, build_transect_field
from simulator.physics import SubsidenceModel
from training.anomaly import FEATURE_NAMES, FeatureEncoder


ScenarioName = Literal[
    "normal_baseline",
    "temporary_vibration",
    "sensor_fault",
    "communication_failure",
    "developing_deformation",
    "progressive_subsidence",
]

SCENARIO_LABELS = {
    "normal_baseline": "Normal Baseline",
    "temporary_vibration": "Temporary Vibration",
    "sensor_fault": "Sensor Fault",
    "communication_failure": "Communication Failure",
    "developing_deformation": "Developing Deformation",
    "progressive_subsidence": "Progressive Subsidence",
}
SAMPLE_MINUTES = 15
MAX_HISTORY = 96


class SimulationStart(BaseModel):
    scenario: ScenarioName = "normal_baseline"
    node_count: int = Field(default=21, ge=20, le=100)
    duration_hours: int = Field(default=72, ge=1, le=720)
    deformation_intensity: float = Field(default=1.0, ge=0.1, le=1.5)
    noise_level: float = Field(default=0.7, ge=0.0, le=2.0)
    seed: int = Field(default=42, ge=0, le=2**31 - 1)


class ModelArtifacts:
    def __init__(self) -> None:
        self.encoder = FeatureEncoder()
        self.anomaly_model = None
        self.anomaly_threshold = 0.0
        self.anomaly_score_upper = 1.0
        self.anomaly_metadata: dict = {}
        self.xgboost_model = None
        self.xgboost_metadata: dict = {}
        self.anomaly_error: str | None = None
        self.xgboost_error: str | None = None
        self._load_anomaly()
        self._load_xgboost()

    def _validate_schema(self, metadata: dict, model, label: str) -> None:
        expected = list(FEATURE_NAMES)
        recorded = metadata.get("feature_names")
        feature_count = getattr(model, "n_features_in_", None)
        if recorded != expected:
            raise ValueError(f"{label} feature names/order do not match the MineSentinel adapter")
        if feature_count is not None and int(feature_count) != len(expected):
            raise ValueError(f"{label} expects {feature_count} features; adapter provides {len(expected)}")

    def _load_anomaly(self) -> None:
        artifact_dir = ML_ROOT / "artifacts" / "anomaly"
        try:
            self.anomaly_metadata = json.loads((artifact_dir / "metadata.json").read_text(encoding="utf-8"))
            artifact = joblib.load(artifact_dir / "model.joblib")
            if not isinstance(artifact, dict) or "model" not in artifact:
                raise ValueError("Isolation Forest artifact has an unsupported format")
            model = artifact["model"]
            self._validate_schema(self.anomaly_metadata, model, "Isolation Forest")
            self.anomaly_model = model
            self.anomaly_threshold = float(artifact.get("threshold", self.anomaly_metadata["threshold"]))
            self.anomaly_score_upper = max(float(self.anomaly_metadata.get("score_upper", 1.0)), 1e-9)
        except Exception as exc:
            self.anomaly_error = f"Isolation Forest unavailable: {exc}"

    def _load_xgboost(self) -> None:
        artifact_dir = ML_ROOT / "artifacts" / "xgboost"
        try:
            self.xgboost_metadata = json.loads((artifact_dir / "metadata.json").read_text(encoding="utf-8"))
            model = joblib.load(artifact_dir / "model.joblib")
            self._validate_schema(self.xgboost_metadata, model, "XGBoost")
            self.xgboost_model = model
        except Exception as exc:
            self.xgboost_error = f"XGBoost unavailable: {exc}"

    def status(self) -> dict:
        return {
            "isolation_forest": {
                "available": self.anomaly_model is not None,
                "version": self.anomaly_metadata.get("model_version"),
                "feature_names": self.anomaly_metadata.get("feature_names", []),
                "message": self.anomaly_error,
            },
            "xgboost": {
                "available": self.xgboost_model is not None,
                "version": self.xgboost_metadata.get("model_version"),
                "feature_names": self.xgboost_metadata.get("feature_names", []),
                "horizon_hours": self.xgboost_metadata.get("horizon_hours"),
                "test_metrics": self.xgboost_metadata.get("metrics", {}).get("test", {}),
                "message": self.xgboost_error,
            },
            "minimum_history_count": int(self.anomaly_metadata.get("minimum_history_count", 9)),
        }


class MineSentinelSimulation:
    def __init__(self) -> None:
        self.models = ModelArtifacts()
        self.encoder = self.models.encoder
        self.reset()

    def reset(self) -> dict:
        self.status = "idle"
        self.scenario = "normal_baseline"
        self.started_at: datetime | None = None
        self.step_number = 0
        self.duration_hours = 72
        self.node_count = 21
        self.intensity = 1.0
        self.noise_level = 0.7
        self.nodes = []
        self.rng = np.random.default_rng(42)
        self.histories: dict[int, list[dict]] = {}
        self.node_state: dict[int, dict] = {}
        self.events: list[dict] = []
        self.chart_history: list[dict] = []
        self.latest: dict | None = None
        return self.snapshot()

    def start(self, settings: SimulationStart) -> dict:
        preset = SITE_PRESETS["jharia"]
        self.scenario = settings.scenario
        self.status = "running"
        self.started_at = datetime.now(timezone.utc)
        self.step_number = 0
        self.duration_hours = settings.duration_hours
        self.node_count = settings.node_count
        self.intensity = settings.deformation_intensity
        self.noise_level = settings.noise_level
        self.rng = np.random.default_rng(settings.seed)
        self.nodes = build_transect_field(preset, n_nodes=settings.node_count)
        self.histories = {node.addr: [] for node in self.nodes}
        self.node_state = {
            node.addr: {
                "battery_v": float(self.rng.uniform(3.78, 4.12)),
                "persistence_ticks": 0,
                "previous_tilt": 0.0,
                "previous_displacement": 0.0,
                "previous_vibration": 0.0,
                "fault_stuck_tilt": None,
            }
            for node in self.nodes
        }
        self.events = []
        self.chart_history = []
        self.latest = None
        self._event("Simulation started", "Synthetic scenario initialized; no live mine telemetry is used.")
        return self.snapshot()

    def pause(self) -> dict:
        if self.status == "running":
            self.status = "paused"
            self._event("Simulation paused", "The synthetic simulation clock is paused.")
        return self.snapshot()

    def resume(self) -> dict:
        if self.status == "paused":
            self.status = "running"
            self._event("Simulation resumed", "The synthetic simulation clock is running again.")
        return self.snapshot()

    def step(self) -> dict:
        if self.status != "running":
            return self.snapshot()
        if self.step_number * SAMPLE_MINUTES >= self.duration_hours * 60:
            self.status = "completed"
            self._event("Simulation completed", "Configured synthetic duration reached.")
            return self.snapshot()

        self.step_number += 1
        timestamp = self.started_at + timedelta(minutes=self.step_number * SAMPLE_MINUTES)
        elapsed_hours = self.step_number * SAMPLE_MINUTES / 60.0
        day = elapsed_hours / 24.0
        preset = SITE_PRESETS["jharia"]
        panel = preset.panel
        face_x, completion = self._face_state(day, panel.x_start)
        model = SubsidenceModel(panel)
        x_values = np.asarray([node.x_m for node in self.nodes])
        y_values = np.asarray([node.y_m for node in self.nodes])
        movement = model.evaluate(x_values, y_values, face_x=face_x, completion=completion)
        previous_day = max(0.0, day - SAMPLE_MINUTES / 1440.0)
        previous_face, previous_completion = self._face_state(previous_day, panel.x_start)
        previous_movement = model.evaluate(x_values, y_values, face_x=previous_face,
                                           completion=previous_completion)
        temperature = 28.0 + 7.0 * math.cos(2.0 * math.pi * ((elapsed_hours + 9.0) % 24.0) / 24.0)
        rows: list[dict] = []
        model_inputs: list[dict] = []
        minimum_history = self.models.status()["minimum_history_count"]

        for index, node in enumerate(self.nodes):
            memory = self.node_state[node.addr]
            expected_subsidence = float(movement.subsidence_mm[index]) * self.intensity
            previous_subsidence = float(previous_movement.subsidence_mm[index]) * self.intensity
            displacement_rate = (expected_subsidence - previous_subsidence) / (SAMPLE_MINUTES / 60.0)
            expected_tilt_x = math.degrees(math.atan(float(movement.tilt_x_mm_per_m[index]) * self.intensity / 1000.0))
            expected_tilt_y = math.degrees(math.atan(float(movement.tilt_y_mm_per_m[index]) * self.intensity / 1000.0))
            thermal_drift = (temperature - 28.0) * 0.018
            tilt_x = expected_tilt_x + thermal_drift + float(self.rng.normal(0.0, 0.018 * self.noise_level))
            tilt_y = expected_tilt_y + thermal_drift * 0.6 + float(self.rng.normal(0.0, 0.018 * self.noise_level))
            fault_active = self.scenario == "sensor_fault" and index == len(self.nodes) // 2 and self.step_number >= 4
            if fault_active:
                tilt_x += 0.12 * (self.step_number - 3)
                if self.step_number == 8:
                    tilt_x += 1.2
                if memory["fault_stuck_tilt"] is None:
                    memory["fault_stuck_tilt"] = tilt_x
                if self.step_number >= 10:
                    tilt_x = float(memory["fault_stuck_tilt"])

            vibration_mg = 12.0 + abs(float(self.rng.normal(0.0, 4.0 * self.noise_level)))
            vibration_mg += 3.0 * abs(displacement_rate)
            if self.scenario == "temporary_vibration" and 4 <= self.step_number <= 6:
                vibration_mg += float(self.rng.uniform(450.0, 800.0))
            if fault_active:
                vibration_mg += float(self.rng.uniform(25.0, 100.0))
            vibration_g = vibration_mg / 1000.0

            gateway_x = panel.x_start - panel.radius_of_influence_m * 0.5
            distance_to_gateway = math.hypot(node.x_m - gateway_x, node.y_m)
            rssi = float(np.clip(-45.0 - 20.0 * math.log10(max(1.0, distance_to_gateway))
                                 + self.rng.normal(0.0, 2.5), -125.0, -35.0))
            packet_loss = float(self.rng.uniform(0.5, 4.0))
            latency = float(max(20.0, 35.0 + distance_to_gateway * 0.08 + self.rng.normal(0.0, 5.0)))
            offline = False
            if self.scenario == "communication_failure" and index >= int(len(self.nodes) * 0.65):
                offline = self.step_number % 5 in {2, 3}
                packet_loss = 100.0 if offline else float(self.rng.uniform(45.0, 92.0))
                rssi = float(self.rng.uniform(-122.0, -106.0))
                latency = float(self.rng.uniform(180.0, 900.0))

            displacement = expected_subsidence
            tilt_magnitude = math.hypot(tilt_x, tilt_y)
            prior = self.histories[node.addr]
            previous_tilt = float(memory["previous_tilt"])
            previous_displacement = float(memory["previous_displacement"])
            previous_vibration = float(memory["previous_vibration"])
            tilt_rate = (tilt_magnitude - previous_tilt) / (SAMPLE_MINUTES / 60.0)
            sensor_fault = bool(fault_active)
            communication_health = max(0.0, 1.0 - packet_loss / 100.0)
            telemetry = {
                "node_id": f"MS-{index + 1:03d}",
                "timestamp": timestamp.isoformat(),
                "tilt_x_deg": round(tilt_x, 5),
                "tilt_y_deg": round(tilt_y, 5),
                "tilt_magnitude_deg": round(tilt_magnitude, 5),
                "relative_displacement_mm": round(displacement - previous_displacement, 5),
                "cumulative_displacement_mm": round(displacement, 5),
                "displacement_rate_mm_per_hour": round(displacement_rate, 5),
                "vibration_rms_g": round(vibration_g, 5),
                "peak_vibration_g": round(vibration_g * 1.4, 5),
                "vibration_duration_s": SAMPLE_MINUTES * 60 if vibration_g >= 0.1 else 0,
                "crack_status": "POTENTIAL" if abs(float(movement.strain_mm_per_m[index])) > 3.0 else "NONE",
                "crack_width_mm": round(max(0.0, abs(float(movement.strain_mm_per_m[index])) - 3.0) * 0.05, 4),
                "temperature_c": round(temperature + float(self.rng.normal(0.0, 0.3)), 2),
                "battery_v": round(memory["battery_v"], 3),
                "sensor_health": "FAULTY" if sensor_fault else "HEALTHY",
                "sensor_drift": bool(abs(thermal_drift) > 0.02 or (fault_active and self.step_number > 3)),
                "sensor_fault": sensor_fault,
                "rssi_dbm": round(rssi, 1),
                "packet_loss_pct": round(packet_loss, 2),
                "packet_delivery_rate_pct": round(100.0 - packet_loss, 2),
                "latency_ms": round(latency, 1),
                "link_status": "OFFLINE" if offline else "DEGRADED" if packet_loss >= 25.0 else "CONNECTED",
                "gateway_id": "GW-SIM-01",
                "tilt_rate_deg_per_hour": round(tilt_rate, 6),
                "tilt_change_5min": round(tilt_rate * 5.0 / 60.0, 6),
                "tilt_change_30min": round(tilt_rate * 0.5, 6),
                "displacement_change_5min": round(displacement_rate * 5.0 / 60.0, 5),
                "displacement_change_30min": round(displacement_rate * 0.5, 5),
                "displacement_change_1hr": round(displacement_rate, 5),
                "vibration_change_5min": round((vibration_g - previous_vibration) / 3.0, 5),
                "persistence_duration_min": memory["persistence_ticks"] * SAMPLE_MINUTES,
                "neighbour_anomaly_count": 0,
                "neighbour_mean_tilt": None,
                "neighbour_mean_displacement": None,
                "neighbour_correlation": 0.0,
                "spatial_deformation_index": 0.0,
                "sensor_health_score": 0.25 if sensor_fault else 0.98,
                "communication_health_score": round(communication_health, 3),
                "anomaly_score": None,
                "predicted_future_tilt_deg": None,
                "expected_physics_tilt_deg": round(math.hypot(expected_tilt_x, expected_tilt_y), 5),
                "expected_physics_displacement_mm": round(expected_subsidence, 5),
                "reporting": not offline,
                "_x_m": node.x_m,
                "_expected_tilt": math.hypot(expected_tilt_x, expected_tilt_y),
            }

            physical_candidate = (
                not sensor_fault and not offline
                and abs(tilt_magnitude) >= 0.05
                and abs(displacement) >= 0.05
            )
            memory["persistence_ticks"] = memory["persistence_ticks"] + 1 if physical_candidate else 0
            telemetry["persistence_duration_min"] = memory["persistence_ticks"] * SAMPLE_MINUTES
            memory["previous_tilt"] = tilt_magnitude
            memory["previous_displacement"] = displacement
            memory["previous_vibration"] = vibration_g

            model_record = {
                "node_id": telemetry["node_id"],
                "timestamp": timestamp.isoformat(),
                "pitch_deg": tilt_x,
                "roll_deg": tilt_y,
                "vibration_rms_mg": vibration_mg,
                "vibration_peak_hz": 8.0 if displacement_rate > 0.01 else 32.0,
                "temperature_c": telemetry["temperature_c"],
                "battery_mv": memory["battery_v"] * 1000.0,
                "rssi_dbm": rssi,
                "snr_db": max(-20.0, min(30.0, (rssi + 100.0) * 0.25)),
                "flags": 1 if sensor_fault else 0,
                "x_m": node.x_m,
                "y_m": node.y_m,
                "_physical_candidate": physical_candidate,
                "_fault": sensor_fault,
                "_offline": offline,
                "_expected_tilt": telemetry["_expected_tilt"],
                "_tilt": tilt_magnitude,
                "_displacement": displacement,
            }
            if not offline:
                feature_vector = self.encoder.transform(model_record, prior)[0]
                if self.models.anomaly_model is not None and len(prior) + 1 >= minimum_history:
                    raw_score = -float(self.models.anomaly_model.decision_function(feature_vector.reshape(1, -1))[0])
                    telemetry["anomaly_score"] = round(float(np.clip(raw_score / self.models.anomaly_score_upper, 0.0, 1.0)), 4)
                    model_record["_anomaly_detected"] = raw_score >= self.models.anomaly_threshold
                if self.models.xgboost_model is not None and len(prior) + 1 >= minimum_history:
                    future_tilt = float(self.models.xgboost_model.predict(feature_vector.reshape(1, -1))[0])
                    telemetry["predicted_future_tilt_deg"] = round(max(0.0, future_tilt), 5)
            self.histories[node.addr].append(model_record)
            del self.histories[node.addr][:-MAX_HISTORY]
            model_inputs.append(model_record)
            rows.append(telemetry)

        physical_rows = [item for item in rows if item["reporting"] and not item["sensor_fault"]]
        active_physical = [item for item in physical_rows
                           if item["tilt_magnitude_deg"] >= 0.05
                           and abs(item["cumulative_displacement_mm"]) >= 0.05]
        spatial_index = len(active_physical) / max(1, len(physical_rows))
        active_ids = {item["node_id"] for item in active_physical}
        if len(active_physical) > 1:
            expected_values = np.asarray([item["_expected_tilt"] for item in active_physical])
            observed_values = np.asarray([item["tilt_magnitude_deg"] for item in active_physical])
            if np.std(expected_values) > 1e-9 and np.std(observed_values) > 1e-9:
                spatial_correlation = float(np.clip(np.corrcoef(expected_values, observed_values)[0, 1], -1.0, 1.0))
            else:
                spatial_correlation = 0.0
        else:
            spatial_correlation = 0.0

        for row in rows:
            neighbours = [other for other in rows if other["node_id"] != row["node_id"]
                          and abs(other["_x_m"] - row["_x_m"]) <= 100.0 and other["reporting"]]
            row["neighbour_anomaly_count"] = sum(1 for other in neighbours if other["node_id"] in active_ids)
            row["neighbour_mean_tilt"] = round(float(np.mean([other["tilt_magnitude_deg"] for other in neighbours])), 5) if neighbours else None
            row["neighbour_mean_displacement"] = round(float(np.mean([other["cumulative_displacement_mm"] for other in neighbours])), 5) if neighbours else None
            row["neighbour_correlation"] = round(spatial_correlation, 4)
            row["spatial_deformation_index"] = round(spatial_index, 4)

        for row in rows:
            row.pop("_x_m", None)
            row.pop("_expected_tilt", None)

        anomaly_scores = [item["anomaly_score"] for item in rows if item["anomaly_score"] is not None]
        anomaly_detected = any(bool(record.get("_anomaly_detected")) for record in model_inputs)
        predicted_rows = [item for item in rows if item["predicted_future_tilt_deg"] is not None]
        peak_node = max((item for item in rows if item["reporting"]),
                        key=lambda item: item["tilt_magnitude_deg"], default=None)
        peak_prediction = peak_node.get("predicted_future_tilt_deg") if peak_node else None
        max_tilt = peak_node["tilt_magnitude_deg"] if peak_node else 0.0
        max_rate = max((abs(item["displacement_rate_mm_per_hour"]) for item in rows), default=0.0)
        persistent_nodes = sum(1 for item in rows if item["persistence_duration_min"] >= 30)
        sensor_faults = sum(1 for item in rows if item["sensor_fault"])
        poor_links = sum(1 for item in rows if item["communication_health_score"] < 0.6)
        persistence = max((item["persistence_duration_min"] for item in rows), default=0)
        physical_confirmation = (
            persistent_nodes >= 2 and spatial_index >= 0.1
            and (max_rate >= 0.01 or max_tilt >= 0.15)
            and sensor_faults == 0
        )
        risk_score = 35.0 * min(1.0, max_tilt / 0.35) + 20.0 * min(1.0, max_rate / 0.15)
        risk_score += 25.0 * min(1.0, persistence / 120.0) + 20.0 * spatial_index
        if physical_confirmation:
            risk_score += 10.0 * max(anomaly_scores, default=0.0)
        if sensor_faults or poor_links:
            risk_score = max(risk_score, 25.0)
        risk_score = round(float(np.clip(risk_score, 0.0, 100.0)), 2)
        risk_level = "CRITICAL" if risk_score >= 75 else "HIGH" if risk_score >= 50 else "WARNING" if risk_score >= 25 else "SAFE"
        reasons = []
        if physical_confirmation:
            reasons.extend(["Persistent deformation across multiple nodes", "Neighbouring-node response detected", "Physics-shaped spatial pattern observed"])
        else:
            if max((item["vibration_rms_g"] for item in rows), default=0.0) >= 0.25:
                reasons.append("High short-duration vibration observed")
            if not persistent_nodes:
                reasons.append("No persistent multi-node deformation")
            if not spatial_index:
                reasons.append("No spatial deformation pattern confirmed")
        if sensor_faults:
            reasons.append(f"{sensor_faults} sensor fault(s); deformation inference suppressed for affected node(s)")
        if poor_links:
            reasons.append(f"{poor_links} node link(s) degraded; communication loss is not deformation")
        if anomaly_detected:
            reasons.append("Isolation Forest detected unusual telemetry; anomaly is not subsidence confirmation")
        if not reasons:
            reasons.append("Synthetic readings remain within the configured prototype baseline")

        if self.models.anomaly_model is None:
            anomaly_status = "MODEL_UNAVAILABLE"
        elif not anomaly_scores:
            anomaly_status = "WARMING_UP"
        else:
            anomaly_status = "ANOMALOUS" if anomaly_detected else "NORMAL"
        previous_risk = self.latest["risk"]["level"] if self.latest else None
        self.latest = {
            "synthetic": True,
            "status": self.status,
            "scenario": self.scenario,
            "scenario_label": SCENARIO_LABELS[self.scenario],
            "step": self.step_number,
            "elapsed_minutes": self.step_number * SAMPLE_MINUTES,
            "simulated_at": timestamp.isoformat(),
            "face_position_m": round(face_x, 3),
            "node_count": self.node_count,
            "anomaly": {
                "status": anomaly_status,
                "detected": anomaly_detected,
                "score": round(max(anomaly_scores), 4) if anomaly_scores else None,
                "detected_nodes": [item["node_id"] for item in rows if item.get("anomaly_score") is not None and item["anomaly_score"] >= self.models.anomaly_threshold / self.models.anomaly_score_upper],
                "explanation": "Isolation Forest detects unusual telemetry patterns; it does not identify their cause.",
            },
            "prediction": {
                "available": self.models.xgboost_model is not None and bool(predicted_rows),
                "current_tilt_deg": round(max_tilt, 5),
                "future_tilt_deg": round(float(peak_prediction), 5) if peak_prediction is not None else None,
                "change_deg": round(float(peak_prediction) - max_tilt, 5) if peak_prediction is not None else None,
                "horizon_hours": self.models.xgboost_metadata.get("horizon_hours", 1),
                "model_version": self.models.xgboost_metadata.get("model_version"),
                "test_metrics": self.models.xgboost_metadata.get("metrics", {}).get("test", {}),
                "message": self.models.xgboost_error,
            },
            "spatial": {
                "affected_nodes": len(active_physical),
                "persistent_nodes": persistent_nodes,
                "neighbour_count": max((item["neighbour_anomaly_count"] for item in rows), default=0),
                "deformation_index": round(spatial_index, 4),
                "correlation": round(spatial_correlation, 4),
                "persistence_minutes": persistence,
                "confirmed": physical_confirmation,
            },
            "risk": {"score": risk_score, "level": risk_level, "reasons": reasons},
            "physics": {
                "label": "Physics-inspired simulation baseline; not measured ground truth",
                "expected_tilt_deg": round(max((item["expected_physics_tilt_deg"] for item in rows), default=0.0), 5),
                "expected_displacement_mm": round(max((item["expected_physics_displacement_mm"] for item in rows), default=0.0), 5),
            },
            "models": self.models.status(),
            "nodes": rows,
        }
        self._update_charts(rows, timestamp)
        self._record_events(rows, anomaly_detected, physical_confirmation, risk_level,
                            timestamp, previous_risk)
        if self.step_number * SAMPLE_MINUTES >= self.duration_hours * 60:
            self.status = "completed"
            self.latest["status"] = self.status
        return self.snapshot()

    def snapshot(self) -> dict:
        if self.latest is None:
            return {
                "synthetic": True,
                "status": self.status,
                "scenario": self.scenario,
                "scenario_label": SCENARIO_LABELS[self.scenario],
                "step": self.step_number,
                "elapsed_minutes": self.step_number * SAMPLE_MINUTES,
                "models": self.models.status(),
                "nodes": [],
                "charts": [],
                "events": list(self.events),
            }
        result = dict(self.latest)
        result["status"] = self.status
        result["charts"] = list(self.chart_history)
        result["events"] = list(self.events)
        return result

    def _face_state(self, day: float, start: float) -> tuple[float, float]:
        if self.scenario == "developing_deformation":
            return start + 4.0 * day, 1.0 - math.exp(-0.35 * max(day, 0.0))
        if self.scenario == "progressive_subsidence":
            return start + 4.0 * day * (1.0 + 0.12 * day), 1.0 - math.exp(-0.55 * max(day, 0.0))
        return start, 0.0

    def _update_charts(self, rows: list[dict], timestamp: datetime) -> None:
        reporting = [item for item in rows if item["reporting"]]
        chart = {
            "time": f"T+{self.step_number * SAMPLE_MINUTES}m",
            "timestamp": timestamp.isoformat(),
            "tilt": round(max((item["tilt_magnitude_deg"] for item in reporting), default=0.0), 5),
            "displacement": round(max((item["cumulative_displacement_mm"] for item in reporting), default=0.0), 5),
            "vibration": round(max((item["vibration_rms_g"] for item in reporting), default=0.0), 5),
            "temperature": round(float(np.mean([item["temperature_c"] for item in reporting])) if reporting else 0.0, 2),
        }
        for index, row in enumerate(reporting[:4], start=1):
            chart[f"node_{index}_tilt"] = row["tilt_magnitude_deg"]
            chart[f"node_{index}_displacement"] = row["cumulative_displacement_mm"]
            chart[f"node_{index}_vibration"] = row["vibration_rms_g"]
            chart[f"node_{index}_temperature"] = row["temperature_c"]
        self.chart_history.append(chart)
        del self.chart_history[:-MAX_HISTORY]

    def _record_events(self, rows: list[dict], anomaly: bool, confirmed: bool,
                       risk_level: str, timestamp: datetime,
                       previous_risk: str | None) -> None:
        if any(item["vibration_rms_g"] >= 0.25 for item in rows):
            self._event("Vibration disturbance measured", "Sensor readings show a short-duration vibration increase.", timestamp)
        if any(item["sensor_fault"] for item in rows):
            self._event("Sensor fault detected", "An isolated node reports drift/spike behaviour; it is excluded from physical confirmation.", timestamp)
        if any(item["link_status"] != "CONNECTED" for item in rows):
            self._event("Communication quality degraded", "Packet loss or link latency increased; missing telemetry is not treated as deformation.", timestamp)
        if anomaly:
            self._event("Anomaly detected", "Isolation Forest found unusual telemetry; cause remains unconfirmed.", timestamp)
        if confirmed:
            self._event("Spatial deformation supported", "Persistent tilt/displacement is present at neighbouring reporting nodes.", timestamp)
        if previous_risk is not None and previous_risk != risk_level:
            self._event(f"Prototype risk changed to {risk_level}", "Risk combines persistence, deformation trend, spatial support, and data health.", timestamp)

    def _event(self, title: str, detail: str, timestamp: datetime | None = None) -> None:
        event_time = timestamp or self.started_at or datetime.now(timezone.utc)
        self.events.append({"time": event_time.isoformat(), "title": title, "detail": detail})
        del self.events[:-40]


_simulation: MineSentinelSimulation | None = None
router = APIRouter(prefix="/api/ml-simulator", tags=["ML simulator"])


def _service() -> MineSentinelSimulation:
    global _simulation
    if _simulation is None:
        _simulation = MineSentinelSimulation()
    return _simulation


@router.post("/start")
def start_simulation(settings: SimulationStart) -> dict:
    return _service().start(settings)


@router.post("/pause")
def pause_simulation() -> dict:
    return _service().pause()


@router.post("/resume")
def resume_simulation() -> dict:
    return _service().resume()


@router.post("/reset")
def reset_simulation() -> dict:
    return _service().reset()


@router.post("/step")
def step_simulation() -> dict:
    return _service().step()


@router.get("/state")
def simulation_state() -> dict:
    return _service().snapshot()