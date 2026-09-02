from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import database
import main


@pytest.fixture()
def client():
    with database.get_connection() as connection:
        connection.execute("DROP TABLE IF EXISTS sensor_readings")
    database.init_db()
    old_model = (main.detector.model, main.detector.available, main.detector.load_error)
    with TestClient(main.app) as test_client:
        # Lifespan startup reloads the real artifact; override it after startup
        # so these tests remain deterministic and threshold-only.
        main.detector.model = None
        main.detector.available = False
        main.detector.load_error = "test threshold-only mode"
        yield test_client
    main.detector.model, main.detector.available, main.detector.load_error = old_model


def reading(ts: datetime, tilt_x: float, distance: float, vibration: float) -> dict:
    return {
        "node_id": "N01",
        "timestamp": ts.isoformat(),
        "tilt_x": tilt_x,
        "tilt_y": 0.2,
        "distance": distance,
        "vibration": vibration,
        "temperature": 29.4,
        "humidity": 64.0,
        "pressure": 1000.0,
    }


def test_ingest_and_queries(client: TestClient):
    ts = datetime(2026, 8, 24, 18, 0, tzinfo=timezone.utc)
    response = client.post("/api/sensor-data", json=reading(ts, 0.2, 100.0, 0.1))
    assert response.status_code == 201
    assert response.json()["analysis"]["ai_available"] is False
    assert response.json()["risk"]["risk_level"] == "NORMAL"

    assert client.get("/api/nodes").json() == {"nodes": ["N01"]}
    assert len(client.get("/api/history", params={"node_id": "N01"}).json()) == 1
    assert client.get("/api/latest", params={"node_id": "N01"}).json()["node_id"] == "N01"
    assert client.get("/api/risk", params={"node_id": "N01"}).json()["risk_level"] == "NORMAL"


def test_risk_progression(client: TestClient):
    start = datetime(2026, 8, 24, 18, 0, tzinfo=timezone.utc)
    scenarios = [
        (0.2, 100.0, 0.1, "NORMAL"),
        (31.0, 100.3, 0.3, "WARNING"),
        (35.0, 102.5, 0.4, "HIGH_RISK"),
        (45.0, 106.0, 1.0, "CRITICAL"),
    ]
    actual = []
    for offset, (tilt, distance, vibration, _) in enumerate(scenarios):
        response = client.post(
            "/api/sensor-data",
            json=reading(start + timedelta(minutes=offset), tilt, distance, vibration),
        )
        response.raise_for_status()
        actual.append(response.json()["risk"]["risk_level"])
    assert actual == [item[3] for item in scenarios]


def test_invalid_payload_is_rejected(client: TestClient):
    invalid = reading(datetime.now(timezone.utc), 0.2, 100.0, 0.1)
    invalid["tilt_x"] = "NaN"
    response = client.post("/api/sensor-data", json=invalid)
    assert response.status_code == 422


def test_ninety_degree_tilt_creates_critical_alert(client: TestClient):
    response = client.post("/api/sensor-data", json=reading(datetime.now(timezone.utc), 90.0, 100.0, 0.1))
    assert response.status_code == 201
    assert response.json()["risk"]["risk_level"] == "CRITICAL"
    alerts = client.get("/api/alerts", params={"node_id": "N01"}).json()
    assert alerts and alerts[0]["severity"] == "CRITICAL"
