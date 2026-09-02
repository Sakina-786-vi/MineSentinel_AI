"""FastAPI entry point for MineSentinel AI."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

import database
from anomaly_detector import AnomalyDetector
from models import SensorReading
from preprocessing import build_features
from risk_engine import calculate_risk
from schemas import (
    AnalysisOut,
    HealthResponse,
    IngestResponse,
    NodeListResponse,
    RiskResponse,
    SensorReadingIn,
    SensorReadingOut,
)
from threshold_engine import evaluate_thresholds


detector = AnomalyDetector()
logger = logging.getLogger("minesentinel.ingress")


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.init_db()
    # Reload on application startup so a model trained before server launch is
    # picked up without training inside an ingestion request.
    detector.load()
    yield


app = FastAPI(
    title="MineSentinel AI Backend",
    version="0.1.0",
    description=(
        "Prototype IoT API for mine subsidence monitoring. Example thresholds "
        "are not scientifically validated mine-safety limits."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


def _reading_from_row(row: dict[str, Any]) -> SensorReading:
    return SensorReading.from_row(row)


def _analyze_row(row: dict[str, Any]) -> dict[str, Any]:
    current = _reading_from_row(row)
    history_rows = database.fetch_history(node_id=current.node_id, limit=1000)
    history = [
        _reading_from_row(item)
        for item in history_rows
        if item.get("id") != row.get("id")
    ]
    features = build_features(current, history)
    feature_dict = features.as_dict()
    threshold_result = evaluate_thresholds(feature_dict)
    anomaly_result = detector.predict(features)
    risk_result = calculate_risk(threshold_result, feature_dict, anomaly_result)
    return {
        "features": feature_dict,
        "thresholds": threshold_result,
        "anomaly": anomaly_result["anomaly"],
        "anomaly_score": anomaly_result["anomaly_score"],
        "ai_available": anomaly_result["available"],
        "ai_message": anomaly_result["message"],
        "risk": risk_result,
    }


def _risk_response(row: dict[str, Any]) -> dict[str, Any]:
    analysis = _analyze_row(row)
    return {
        "node_id": row["node_id"],
        "timestamp": row["timestamp"],
        "risk_score": analysis["risk"]["risk_score"],
        "risk_level": analysis["risk"]["risk_level"],
        "anomaly": analysis["anomaly"],
        "anomaly_score": analysis["anomaly_score"],
        "ai_available": analysis["ai_available"],
        "reasons": analysis["risk"]["reasons"],
        "alert": analysis["risk"]["alert"],
        "alert_status": analysis["risk"]["alert_status"],
        "components": analysis["risk"]["components"],
        "weights": analysis["risk"]["weights"],
        "features": analysis["features"],
        "thresholds": analysis["thresholds"],
        "prototype_notice": analysis["risk"]["prototype_notice"],
    }


@app.get("/api/health", response_model=HealthResponse)
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "ai_available": detector.available,
        "ai_message": detector.load_error,
    }


@app.post("/api/sensor-data", response_model=IngestResponse, status_code=201)
def ingest_sensor_data(payload: SensorReadingIn) -> dict[str, Any]:
    """Validate, persist, preprocess, and score one ESP32 sensor reading."""
    row = database.insert_reading(payload.model_dump())
    logger.info(
        "gateway reading stored id=%s node_id=%s timestamp=%s tilt_x=%s tilt_y=%s "
        "distance=%s vibration=%s temperature=%s humidity=%s pressure=%s",
        row["id"], row["node_id"], row["timestamp"], row["tilt_x"], row["tilt_y"],
        row["distance"], row["vibration"], row["temperature"], row["humidity"], row.get("pressure"),
    )
    analysis = _analyze_row(row)
    database.save_analysis(row["id"], analysis, detector.version if analysis["ai_available"] else None)
    database.save_processing_record(row, analysis)
    database.save_alert(row, analysis)
    features = analysis["features"]
    logger.info(
        "RAW SENSOR: tilt_x=%s tilt_y=%s vibration=%s temperature=%s humidity=%s pressure=%s | "
        "CALCULATED TILT: %.4f degrees | DERIVED: tilt_rate=%.4f vibration_rate=%.4f baseline_tilt_deviation=%.4f | "
        "ISOLATION FOREST: %s score=%s | RISK: %s score=%s | REASON: %s",
        row["tilt_x"], row["tilt_y"], row["vibration"], row["temperature"], row["humidity"], row.get("pressure"),
        features["tilt_angle"], features["tilt_rate"], features["vibration_rate"], features["tilt_deviation"],
        "ANOMALY" if analysis["anomaly"] else "NORMAL", analysis["anomaly_score"],
        analysis["risk"]["risk_level"], analysis["risk"]["risk_score"],
        "; ".join(analysis["risk"]["reasons"]) or "within configured limits",
    )
    return {
        "reading": SensorReadingOut.model_validate(row),
        "analysis": AnalysisOut.model_validate(analysis),
        "risk": analysis["risk"],
    }


@app.get("/api/latest")
def latest(
    node_id: str | None = Query(default=None, min_length=1, max_length=64),
) -> dict[str, Any] | list[dict[str, Any]]:
    rows = database.fetch_latest(node_id=node_id)
    if node_id and not rows:
        raise HTTPException(status_code=404, detail=f"No readings found for node {node_id}")
    output = [SensorReadingOut.model_validate(row).model_dump(mode="json") for row in rows]
    return output[0] if node_id else output


@app.get("/api/history")
def history(
    node_id: str | None = Query(default=None, min_length=1, max_length=64),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[dict[str, Any]]:
    rows = database.fetch_history(node_id=node_id, limit=limit)
    return [SensorReadingOut.model_validate(row).model_dump(mode="json") for row in rows]


@app.get("/api/nodes", response_model=NodeListResponse)
def nodes() -> dict[str, list[str]]:
    return {"nodes": database.fetch_nodes()}


@app.get("/api/debug/pipeline")
def pipeline_debug(
    node_id: str = Query(default="MS-1", min_length=1, max_length=64),
) -> dict[str, Any]:
    """Read-only ingress-to-analysis evidence for the physical gateway test."""
    state = database.fetch_pipeline_state(node_id)
    return {
        "node_id": node_id,
        "reading_count": state["reading_count"],
        "latest": state["latest"],
        "pressure_available": bool(state["latest"] and state["latest"].get("pressure") is not None),
        "note": "Gateway readings must POST once per second to /api/sensor-data; timestamps and latest values above prove ingress.",
    }


@app.get("/api/alerts")
def alerts(
    node_id: str = Query(default="MS-1", min_length=1, max_length=64),
    limit: int = Query(default=100, ge=1, le=1000),
) -> list[dict[str, Any]]:
    return database.fetch_alerts(node_id=node_id, limit=limit)


@app.patch("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int) -> dict[str, Any]:
    alert = database.acknowledge_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@app.get("/api/risk")
def risk(
    node_id: str | None = Query(default=None, min_length=1, max_length=64),
) -> dict[str, Any] | list[dict[str, Any]]:
    rows = database.fetch_latest(node_id=node_id)
    if node_id and not rows:
        raise HTTPException(status_code=404, detail=f"No readings found for node {node_id}")
    output = [_risk_response(row) for row in rows]
    return output[0] if node_id else output
