"""Centralized configuration for the MineSentinel AI prototype.

The threshold values below are intentionally illustrative prototype values. They
are not mine-safety limits and must be validated by qualified domain experts
before any real-world deployment.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ML_DIR = BASE_DIR / "ml"
DATABASE_PATH = DATA_DIR / "sensor_data.db"
MODEL_PATH = ML_DIR / "isolation_forest.joblib"
MODEL_METADATA_PATH = ML_DIR / "isolation_forest.metadata.json"

THRESHOLDS = {
    # `tilt_x` and `tilt_y` are gateway-provided pitch and roll angles in
    # degrees. `tilt_angle` is their combined physical inclination from level.
    # Operational UI thresholds requested for this installation: a 9–10°
    # inclination is normal, 30–40° is a warning, and >40° is critical.
    "tilt_angle": {"warning": 30.0, "critical": 40.0},
    "displacement_change": {"warning": 0.5, "critical": 2.0},
    "vibration": {"warning": 0.25, "critical": 0.75},
    "pressure": {"warning": 1030.0, "critical": 1050.0},
    "temperature": {"warning": 38.0, "critical": 48.0},
    "humidity": {"warning": 80.0, "critical": 90.0},
}

# Change-from-recent-baseline limits in the same physical units as each sensor.
# These are evaluated alongside absolute limits; frontend code never sets them.
BASELINE_DEVIATION_THRESHOLDS = {
    "tilt": {"warning": 15.0, "critical": 30.0},
    "vibration": {"warning": 0.10, "critical": 0.50},
    "temperature": {"warning": 3.0, "critical": 8.0},
    "humidity": {"warning": 8.0, "critical": 18.0},
    "pressure": {"warning": 8.0, "critical": 18.0},
}

# Maximum meaningful per-second change. These protect against sudden physical
# events without waiting for a large batch of history.
RATE_OF_CHANGE_THRESHOLDS = {
    "tilt": {"warning": 10.0, "critical": 25.0},
    "displacement": {"warning": 0.5, "critical": 2.0},
    "vibration": {"warning": 0.10, "critical": 0.50},
    "temperature": {"warning": 1.0, "critical": 4.0},
    "humidity": {"warning": 3.0, "critical": 10.0},
    "pressure": {"warning": 3.0, "critical": 10.0},
}

# Transparent weights for continuous multivariate risk scoring
RISK_WEIGHTS = {
    "tilt": 0.25,
    "displacement": 0.25,
    "vibration": 0.20,
    "temperature": 0.05,
    "humidity": 0.05,
    "pressure": 0.05,
    "trend": 0.10,
    "ai_anomaly": 0.15,
}

RISK_LEVEL_THRESHOLDS = {
    "warning": 25.0,
    "high_risk": 50.0,
    "critical": 75.0,
}

MODEL_FEATURES = [
    "tilt_x",
    "tilt_y",
    "displacement_change",
    "vibration",
    "temperature",
]

MODEL_CONTAMINATION = 0.05
MODEL_RANDOM_STATE = 42
MODEL_VERSION = "isolation_forest_v1"
MIN_BASELINE_SAMPLES = 100
RETRAIN_INTERVAL = 500
MOVING_AVERAGE_WINDOW = 5
RECENT_TREND_WINDOW = 5
