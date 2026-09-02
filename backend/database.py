"""Small SQLite data-access layer using the Python standard library."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime
import json
from typing import Any, Iterator

from config import DATABASE_PATH, DATA_DIR


SCHEMA = """
CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    tilt_x REAL NOT NULL,
    tilt_y REAL NOT NULL,
    distance REAL NOT NULL,
    vibration REAL NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    pressure REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_node_timestamp
    ON sensor_readings(node_id, timestamp);

CREATE TABLE IF NOT EXISTS anomaly_results (
    reading_id INTEGER PRIMARY KEY,
    anomaly_score REAL,
    anomaly_label TEXT NOT NULL,
    risk_score REAL NOT NULL,
    risk_level TEXT NOT NULL,
    alert_status TEXT NOT NULL,
    model_version TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reading_id) REFERENCES sensor_readings(id)
);

CREATE TABLE IF NOT EXISTS processing_records (
    reading_id INTEGER PRIMARY KEY,
    node_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    features_json TEXT NOT NULL,
    thresholds_json TEXT NOT NULL,
    anomaly_json TEXT NOT NULL,
    risk_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reading_id) REFERENCES sensor_readings(id)
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reading_id INTEGER NOT NULL UNIQUE,
    node_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    severity TEXT NOT NULL,
    risk_score REAL NOT NULL,
    trigger TEXT NOT NULL,
    reasons_json TEXT NOT NULL,
    sensor_snapshot_json TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reading_id) REFERENCES sensor_readings(id)
);
CREATE INDEX IF NOT EXISTS idx_alerts_node_timestamp ON alerts(node_id, timestamp DESC);
"""


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    connection = _connect()
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA)
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(sensor_readings)")}
        if "pressure" not in columns:
            connection.execute("ALTER TABLE sensor_readings ADD COLUMN pressure REAL")


def insert_reading(reading: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO sensor_readings
                (node_id, timestamp, tilt_x, tilt_y, distance, vibration,
                 temperature, humidity, pressure)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                reading["node_id"],
                reading["timestamp"].isoformat()
                if isinstance(reading["timestamp"], datetime)
                else reading["timestamp"],
                reading["tilt_x"],
                reading["tilt_y"],
                reading["distance"],
                reading["vibration"],
                reading["temperature"],
                reading["humidity"],
                reading.get("pressure"),
            ),
        )
        row = connection.execute(
            "SELECT * FROM sensor_readings WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return dict(row)


def fetch_history(node_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 1000))
    with get_connection() as connection:
        if node_id:
            rows = connection.execute(
                """
                SELECT * FROM sensor_readings
                WHERE node_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (node_id, limit),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT * FROM sensor_readings
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
    # Query the newest rolling window, then return it in chronological chart order.
    return [dict(row) for row in reversed(rows)]


def fetch_latest(node_id: str | None = None) -> list[dict[str, Any]]:
    with get_connection() as connection:
        if node_id:
            rows = connection.execute(
                """
                SELECT * FROM sensor_readings
                WHERE node_id = ?
                ORDER BY id DESC, timestamp DESC
                LIMIT 1
                """,
                (node_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT r.* FROM sensor_readings r
                INNER JOIN (
                    SELECT node_id, MAX(id) AS max_id
                    FROM sensor_readings GROUP BY node_id
                ) latest ON latest.max_id = r.id
                ORDER BY r.node_id ASC
                """
            ).fetchall()
    return [dict(row) for row in rows]


def fetch_nodes() -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT DISTINCT node_id FROM sensor_readings ORDER BY node_id"
        ).fetchall()
    return [row["node_id"] for row in rows]


def save_analysis(reading_id: int, analysis: dict[str, Any], model_version: str | None) -> None:
    risk = analysis["risk"]
    with get_connection() as connection:
        connection.execute(
            """INSERT OR REPLACE INTO anomaly_results
               (reading_id, anomaly_score, anomaly_label, risk_score, risk_level, alert_status, model_version)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (reading_id, analysis["anomaly_score"], "ANOMALY" if analysis["anomaly"] else "NORMAL",
             risk["risk_score"], risk["risk_level"], risk["alert_status"], model_version),
        )


def save_processing_record(row: dict[str, Any], analysis: dict[str, Any]) -> None:
    """Persist each real reading's derived features and decision for future ML audit."""
    with get_connection() as connection:
        connection.execute(
            """INSERT OR REPLACE INTO processing_records
               (reading_id, node_id, timestamp, features_json, thresholds_json, anomaly_json, risk_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (row["id"], row["node_id"], row["timestamp"], json.dumps(analysis["features"]),
             json.dumps(analysis["thresholds"]), json.dumps({
                 "anomaly": analysis["anomaly"], "anomaly_score": analysis["anomaly_score"],
                 "ai_available": analysis["ai_available"], "message": analysis["ai_message"],
             }), json.dumps(analysis["risk"])),
        )


def save_alert(row: dict[str, Any], analysis: dict[str, Any]) -> None:
    risk = analysis["risk"]
    if not risk["alert"]:
        return
    thresholds = analysis["thresholds"]
    triggers = [f"{key}: {value.get('trigger', 'threshold')}" for key, value in thresholds.items() if value.get("severity") != "NORMAL"]
    with get_connection() as connection:
        connection.execute(
            """INSERT OR IGNORE INTO alerts
               (reading_id, node_id, timestamp, severity, risk_score, trigger, reasons_json, sensor_snapshot_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (row["id"], row["node_id"], row["timestamp"], risk["risk_level"], risk["risk_score"],
             "; ".join(triggers) or "risk engine", json.dumps(risk["reasons"]), json.dumps(row)),
        )


def fetch_alerts(node_id: str = "MS-1", limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM alerts WHERE node_id = ? ORDER BY id DESC LIMIT ?", (node_id, max(1, min(limit, 1000)))
        ).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["acknowledged"] = bool(item["acknowledged"])
        item["reasons"] = json.loads(item.pop("reasons_json"))
        item["sensor_snapshot"] = json.loads(item.pop("sensor_snapshot_json"))
        result.append(item)
    return result


def acknowledge_alert(alert_id: int) -> dict[str, Any] | None:
    with get_connection() as connection:
        connection.execute("UPDATE alerts SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?", (alert_id,))
    rows = [item for item in fetch_alerts(limit=1000) if item["id"] == alert_id]
    return rows[0] if rows else None


def fetch_pipeline_state(node_id: str) -> dict[str, Any]:
    """Return persisted ingress/analysis facts for troubleshooting live links."""
    with get_connection() as connection:
        latest = connection.execute(
            """SELECT r.*, a.anomaly_score, a.anomaly_label, a.risk_score,
                      a.risk_level, a.alert_status, a.model_version
               FROM sensor_readings r
               LEFT JOIN anomaly_results a ON a.reading_id = r.id
               WHERE r.node_id = ?
               ORDER BY r.id DESC
               LIMIT 1""",
            (node_id,),
        ).fetchone()
        count = connection.execute(
            "SELECT COUNT(*) AS count FROM sensor_readings WHERE node_id = ?",
            (node_id,),
        ).fetchone()
    return {"reading_count": int(count["count"]), "latest": dict(latest) if latest else None}


def baseline_rows(node_id: str) -> list[dict[str, Any]]:
    """Return persisted, valid readings for real-data baseline training."""
    return fetch_history(node_id=node_id, limit=1000)
