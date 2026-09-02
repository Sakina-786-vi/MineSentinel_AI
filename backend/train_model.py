"""Train an Isolation Forest from normal/baseline sensor readings.

Usage:
    python train_model.py
    python train_model.py --csv baseline.csv

The training data must represent normal operation. It should not contain
known abnormal events, because the model learns the normal region of the data.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest

from config import (
    MODEL_CONTAMINATION, MODEL_FEATURES, MODEL_METADATA_PATH, MODEL_PATH,
    MODEL_RANDOM_STATE, MODEL_VERSION,
)


def load_training_data(csv_path: Path | None) -> pd.DataFrame:
    if csv_path is None:
        raise ValueError("A CSV of real, verified-normal readings is required; synthetic baselines are not supported.")

    frame = pd.read_csv(csv_path)
    if "displacement_change" not in frame.columns:
        if "distance" not in frame.columns:
            raise ValueError("CSV must include displacement_change or distance")
        frame = frame.sort_values("timestamp") if "timestamp" in frame else frame
        frame["displacement_change"] = frame["distance"].diff().fillna(0.0)
    missing = [name for name in MODEL_FEATURES if name not in frame.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")
    return frame[MODEL_FEATURES].replace([np.inf, -np.inf], np.nan).dropna()


def train(csv_path: Path | None = None, output_path: Path = MODEL_PATH) -> None:
    frame = load_training_data(csv_path)
    if len(frame) < 20:
        raise ValueError("At least 20 valid baseline rows are required")

    model = IsolationForest(
        n_estimators=200,
        contamination=MODEL_CONTAMINATION,
        random_state=MODEL_RANDOM_STATE,
    )
    model.fit(frame[MODEL_FEATURES].to_numpy(dtype=float))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    MODEL_METADATA_PATH.write_text(json.dumps({
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_rows": int(len(frame)),
        "features": MODEL_FEATURES,
        "source": "verified real normal baseline CSV",
    }, indent=2), encoding="utf-8")
    print(f"Saved Isolation Forest trained on {len(frame)} normal rows to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train MineSentinel Isolation Forest")
    parser.add_argument("--csv", type=Path, help="CSV containing normal baseline readings")
    parser.add_argument("--output", type=Path, default=MODEL_PATH)
    args = parser.parse_args()
    train(args.csv, args.output)
