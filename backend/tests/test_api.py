from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import database
import main


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATA_DIR", tmp_path)
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "sensor-data-test.sqlite3")
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
        "node_id": "TEST-API-01",
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

    assert client.get("/api/nodes").json() == {"nodes": ["TEST-API-01"]}
    assert len(client.get("/api/history", params={"node_id": "TEST-API-01"}).json()) == 1
    assert client.get("/api/latest", params={"node_id": "TEST-API-01"}).json()["node_id"] == "TEST-API-01"
    assert client.get("/api/risk", params={"node_id": "TEST-API-01"}).json()["risk_level"] == "NORMAL"


def test_epoch_device_clock_has_current_receive_time(client: TestClient):
    payload = reading(datetime(1970, 1, 1, 0, 6, 53, tzinfo=timezone.utc), 0.2, 100.0, 0.1)

    response = client.post("/api/sensor-data", json=payload)

    assert response.status_code == 201
    result = response.json()["reading"]
    assert result["timestamp"].startswith("1970-")
    received_at = datetime.fromisoformat(result["received_at"].replace("Z", "+00:00"))
    assert abs((datetime.now(timezone.utc) - received_at).total_seconds()) < 5


def test_risk_uses_analysis_saved_during_ingestion(client: TestClient, monkeypatch):
    payload = reading(datetime.now(timezone.utc), 0.2, 100.0, 0.1)
    assert client.post("/api/sensor-data", json=payload).status_code == 201
    monkeypatch.setattr(main, "_analyze_row", lambda _: pytest.fail("risk polling recomputed analysis"))

    response = client.get("/api/risk", params={"node_id": "TEST-API-01"})

    assert response.status_code == 200
    assert response.json()["risk_level"] == "NORMAL"


def test_risk_progression(client: TestClient):
    start = datetime(2026, 8, 24, 18, 0, tzinfo=timezone.utc)
    scenarios = [
        (20.0, 100.0, 0.1, "NORMAL"),
        (31.0, 100.3, 0.3, "WARNING"),
        (39.0, 102.2, 0.6, "HIGH_RISK"),
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
    alerts = client.get("/api/alerts", params={"node_id": "TEST-API-01"}).json()
    assert alerts and alerts[0]["severity"] == "CRITICAL"


def test_ms1_ingestion_latest_history_and_node_list_are_consistent(client: TestClient):
    ts = datetime.now(timezone.utc).replace(microsecond=0)
    payload = reading(ts, 0.2, 100.0, 0.1)
    payload["node_id"] = "MS-1"

    response = client.post("/api/sensor-data", json=payload)

    assert response.status_code == 201
    assert response.json()["reading"]["node_id"] == "MS-1"
    assert client.get("/api/latest", params={"node_id": "MS-1"}).json()["node_id"] == "MS-1"
    assert [item["node_id"] for item in client.get("/api/history", params={"node_id": "MS-1"}).json()] == ["MS-1"]
    assert client.get("/api/risk", params={"node_id": "MS-1"}).json()["node_id"] == "MS-1"
    assert client.get("/api/nodes").json()["nodes"] == ["MS-1"]


def test_n01_legacy_data_remains_separate_from_ms1(client: TestClient):
    ts = datetime.now(timezone.utc).replace(microsecond=0)
    legacy = reading(ts, 0.2, 100.0, 0.1)
    legacy["node_id"] = "N01"  # Legacy/demo ID; deliberately not a physical MS-1 alias.
    physical = reading(ts + timedelta(seconds=1), 1.2, 100.3, 0.2)
    physical["node_id"] = "MS-1"

    assert client.post("/api/sensor-data", json=legacy).status_code == 201
    assert client.post("/api/sensor-data", json=physical).status_code == 201
    assert client.get("/api/latest", params={"node_id": "MS-1"}).json()["node_id"] == "MS-1"
    assert client.get("/api/latest", params={"node_id": "N01"}).json()["node_id"] == "N01"
    assert client.get("/api/nodes").json()["nodes"] == ["MS-1", "N01"]


def test_ms1_latest_advances_and_history_retains_both_readings(client: TestClient):
    start = datetime.now(timezone.utc).replace(microsecond=0)
    first = reading(start, 0.2, 100.0, 0.1)
    first["node_id"] = "MS-1"
    second = reading(start + timedelta(seconds=1), 0.4, 100.2, 0.2)
    second["node_id"] = "MS-1"

    assert client.post("/api/sensor-data", json=first).status_code == 201
    second_response = client.post("/api/sensor-data", json=second)

    latest = client.get("/api/latest", params={"node_id": "MS-1"}).json()
    history = client.get("/api/history", params={"node_id": "MS-1"}).json()
    assert second_response.status_code == 201
    assert latest["tilt_x"] == second["tilt_x"]
    assert datetime.fromisoformat(latest["timestamp"].replace("Z", "+00:00")) == datetime.fromisoformat(second["timestamp"])
    assert len(history) == 2
    assert {item["node_id"] for item in history} == {"MS-1"}


@pytest.mark.parametrize("node_id", [None, "", "MS-0", "MS-01", "ms-1"])
def test_missing_blank_or_noncanonical_ms_node_ids_are_rejected(client: TestClient, node_id):
    payload = reading(datetime.now(timezone.utc), 0.2, 100.0, 0.1)
    if node_id is None:
        payload.pop("node_id")
    else:
        payload["node_id"] = node_id
    assert client.post("/api/sensor-data", json=payload).status_code == 422
