"""End-to-end local demo without physical ESP32 hardware.

Run from this directory with:
    python demo.py --reset

The demo calls the same FastAPI application used by a real ESP32 client.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

import database
from main import app


def payload(timestamp: datetime, *, tilt_x: float, tilt_y: float, distance: float, vibration: float) -> dict:
    return {
        "node_id": "DEMO-01",
        "timestamp": timestamp.isoformat(),
        "tilt_x": tilt_x,
        "tilt_y": tilt_y,
        "distance": distance,
        "vibration": vibration,
        "temperature": 29.4,
        "humidity": 64.0,
    }


def run(reset: bool) -> None:
    if reset and database.DATABASE_PATH.exists():
        database.DATABASE_PATH.unlink()
    database.init_db()
    start = datetime.now(timezone.utc).replace(microsecond=0)
    scenarios = [
        ("NORMAL", payload(start, tilt_x=0.2, tilt_y=0.2, distance=100.0, vibration=0.10)),
        ("WARNING", payload(start + timedelta(minutes=1), tilt_x=1.2, tilt_y=0.2, distance=100.3, vibration=0.30)),
        ("HIGH_RISK", payload(start + timedelta(minutes=2), tilt_x=1.8, tilt_y=0.4, distance=102.5, vibration=0.40)),
        ("CRITICAL", payload(start + timedelta(minutes=3), tilt_x=3.2, tilt_y=1.0, distance=106.0, vibration=1.00)),
    ]

    with TestClient(app) as client:
        for expected, item in scenarios:
            response = client.post("/api/sensor-data", json=item)
            response.raise_for_status()
            body = response.json()
            risk = body["risk"]
            print(
                f"expected={expected:9s} actual={risk['risk_level']:9s} "
                f"score={risk['risk_score']:6.2f} alert={risk['alert']}"
            )
        final = client.get("/api/risk", params={"node_id": "DEMO-01"})
        final.raise_for_status()
        print("\nFinal risk response:")
        print(final.json())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the MineSentinel backend demo")
    parser.add_argument("--reset", action="store_true", help="Delete the existing SQLite database first")
    args = parser.parse_args()
    run(args.reset)
