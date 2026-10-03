from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import database
import main


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATA_DIR", tmp_path)
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "locations.sqlite3")
    database.init_db()
    database.insert_reading({
        "node_id": "TEST-LOCATION-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tilt_x": 0.1,
        "tilt_y": 0.2,
        "distance": 100.0,
        "vibration": 0.01,
        "temperature": 25.0,
        "humidity": 50.0,
        "pressure": None,
    })
    with TestClient(main.app) as test_client:
        yield test_client


def test_location_requires_registered_node(client: TestClient):
    response = client.get("/api/nodes/UNKNOWN/location")
    assert response.status_code == 404


def test_local_location_is_saved_with_coordinate_system(client: TestClient):
    response = client.put("/api/nodes/TEST-LOCATION-01/location", json={
        "location_source": "local_mine_plan",
        "local_x": 18.5,
        "local_y": -6.0,
        "coordinate_system": "Mine survey grid, metres",
        "location_verified": False,
    })
    assert response.status_code == 200
    location = client.get("/api/nodes/TEST-LOCATION-01/location").json()["location"]
    assert location["local_x"] == 18.5
    assert location["coordinate_system"] == "Mine survey grid, metres"
    assert location["latitude"] is None


def test_geographic_location_validation_and_verified_replacement(client: TestClient):
    endpoint = "/api/nodes/TEST-LOCATION-01/location"
    invalid = client.put(endpoint, json={
        "location_source": "geographic", "latitude": 91, "longitude": 86,
    })
    assert invalid.status_code == 422

    verified = {"location_source": "geographic", "latitude": 23.7,
                "longitude": 86.4, "location_verified": True}
    assert client.put(endpoint, json=verified).status_code == 200

    changed = {**verified, "longitude": 86.5}
    assert client.put(endpoint, json=changed).status_code == 409
    replaced = client.put(f"{endpoint}?replace_verified=true", json=changed)
    assert replaced.status_code == 200
    assert replaced.json()["location"]["longitude"] == 86.5
