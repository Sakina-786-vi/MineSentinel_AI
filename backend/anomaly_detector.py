"""Isolation Forest inference for unusual sensor behavior.

Isolation Forest detects unusual combinations of sensor values. It does not
predict that a mine will collapse and is not a substitute for engineering
assessment, calibrated instrumentation, or an approved safety system.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np

from config import MODEL_FEATURES, MODEL_METADATA_PATH, MODEL_PATH, MODEL_VERSION
from models import FeatureSet


class AnomalyDetector:
    def __init__(self, model_path: Path = MODEL_PATH) -> None:
        self.model_path = model_path
        self.model: Any | None = None
        self.available = False
        self.load_error: str | None = None
        self.version = MODEL_VERSION
        self.load()

    def load(self) -> None:
        # Legacy artifacts did not record their training provenance and may have
        # been generated from demonstration data. They must never be presented
        # as a real-data baseline.
        if not MODEL_METADATA_PATH.exists():
            self.model = None
            self.available = False
            self.load_error = "LEARNING BASELINE: no verified real-data Isolation Forest model is available."
            return
        if not self.model_path.exists():
            self.load_error = "No trained Isolation Forest model found; threshold-only mode is active."
            return
        try:
            self.model = joblib.load(self.model_path)
            self.available = True
            self.load_error = None
        except Exception as exc:  # pragma: no cover - defensive startup behavior
            self.model = None
            self.available = False
            self.load_error = f"Could not load Isolation Forest model: {exc}"

    def _vector(self, features: FeatureSet) -> np.ndarray:
        feature_map = {
            "tilt_x": features.tilt_x,
            "tilt_y": features.tilt_y,
            "displacement_change": features.displacement_change,
            "vibration": features.vibration,
            "temperature": features.temperature,
        }
        return np.array([[feature_map[name] for name in MODEL_FEATURES]], dtype=float)

    def predict(self, features: FeatureSet) -> dict[str, Any]:
        if not self.available or self.model is None:
            return {
                "available": False,
                "anomaly": False,
                "anomaly_score": None,
                "message": self.load_error,
            }

        vector = self._vector(features)
        prediction = int(self.model.predict(vector)[0])
        # decision_function is positive for more normal observations. Map it to
        # a bounded anomaly magnitude where larger means more unusual.
        decision = float(self.model.decision_function(vector)[0])
        anomaly_score = float(np.clip(0.5 - decision, 0.0, 1.0))
        return {
            "available": True,
            "anomaly": prediction == -1,
            "anomaly_score": round(anomaly_score, 4),
            "message": "Isolation Forest inference completed.",
        }
