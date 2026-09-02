from datetime import datetime, timezone

from fastapi.testclient import TestClient

from main import app


with TestClient(app) as client:
    health = client.get("/api/health")
    health.raise_for_status()
    assert health.json()["ai_available"] is True, health.json()
    response = client.post(
        "/api/sensor-data",
        json={
            "node_id": "AI-SMOKE",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tilt_x": 0.2,
            "tilt_y": 0.2,
            "distance": 100.0,
            "vibration": 0.1,
            "temperature": 29.4,
            "humidity": 64.0,
        },
    )
    response.raise_for_status()
    body = response.json()
    assert body["analysis"]["ai_available"] is True
    assert body["analysis"]["anomaly_score"] is not None
    print({"health": health.json(), "analysis": body["analysis"]})
