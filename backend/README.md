# MineSentinel AI Backend

MineSentinel AI is a beginner-friendly FastAPI prototype for collecting IoT readings from an ESP32 sensor node, persisting them in SQLite, engineering monitoring features, evaluating configurable example thresholds, running optional Isolation Forest inference, and returning a transparent risk score with alert state.

> **Safety notice:** The threshold values, risk weights, and scoring rules in this repository are illustrative prototype values only. They are not scientifically validated mine-safety limits and must not be used as a real mine monitoring or emergency response system without qualified engineering validation, calibrated instruments, and an approved safety process.

## Architecture

The request flow is:

```text
ESP32 -> POST /api/sensor-data -> SQLite -> preprocessing
      -> threshold analysis + optional Isolation Forest
      -> transparent risk engine -> risk score -> alert response
```

The AI component is deliberately limited in scope. Isolation Forest identifies unusual combinations of sensor features relative to a normal baseline; it does **not** predict that a mine will collapse.

## Gateway contract (one packet per second)

The physical gateway must send a fresh HTTP `POST` to `/api/sensor-data` every
second. The dashboard only displays packets that have reached this endpoint; it
cannot read a tilted sensor directly over USB or Wi-Fi. Send `tilt_x` and
`tilt_y` as degrees (not radians), `vibration` in the unit used to calibrate the
configured thresholds, and pressure in hPa when a pressure sensor is installed:

```json
{"node_id":"MS-1","timestamp":"2026-08-29T12:00:00Z","tilt_x":90.0,"tilt_y":0.0,"distance":100.0,"vibration":0.10,"temperature":30.0,"humidity":64.0,"pressure":1000.0}
```

A 90-degree `tilt_x` or `tilt_y` produces a **CRITICAL** risk result and a
persisted alert as soon as that packet is accepted. `GET /api/debug/pipeline?node_id=MS-1`
shows the latest stored packet and whether pressure is arriving, which is the
fastest way to distinguish a gateway delivery problem from a risk-rule problem.

## Project layout

| File | Responsibility |
|---|---|
| `main.py` | FastAPI application and endpoint orchestration |
| `config.py` | Centralized paths, example thresholds, weights, and model settings |
| `database.py` | SQLite schema and CRUD-style query helpers |
| `schemas.py` | Pydantic validation and response contracts |
| `models.py` | Internal reading and feature dataclasses |
| `preprocessing.py` | Safe feature engineering and recent trend calculation |
| `threshold_engine.py` | Per-sensor severity classification |
| `anomaly_detector.py` | Joblib model loading and Isolation Forest inference |
| `risk_engine.py` | Weighted 0–100 risk score and alert logic |
| `train_model.py` | Offline normal-baseline model training |
| `demo.py` | Hardware-free end-to-end scenario generator |
| `tests/` | API and progression tests |

The SQLite file is created at `data/sensor_data.db`. A trained model is saved at `ml/isolation_forest.joblib`.

## Run locally

From this directory, create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.
The server must bind to `0.0.0.0` (as in the command above); without `--host
0.0.0.0`, Uvicorn listens only on localhost and an ESP32 cannot connect.
For this PC's current Wi-Fi connection, the ESP32 URL is
`http://10.143.248.166:8000/api/sensor-data`. Confirm the address with
`ipconfig` after reconnecting to Wi-Fi and update/reflash the gateway if it
changes. The ESP32 and PC must be on the same reachable network. Windows
Firewall has an inbound TCP 8000 allow rule for this gateway.

Setting `BACKEND_URL` alone does not send readings: the firmware must connect
to Wi-Fi, POST the required JSON fields to that URL, and check the HTTP status.
Use `http://10.143.248.166:8000/api/health` from a device on the same Wi-Fi to
verify connectivity, then check
`http://10.143.248.166:8000/api/debug/pipeline?node_id=MS-1` for the last
packet received by the backend. An increasing `reading_count` and a recent
`latest.received_at` confirm ingestion; the frontend polls the latest stored
packet and marks packets older than 30 seconds as stale.
Start the command from the `backend` directory. The `app.main` entry point
exposes the existing `main.py` application without moving the backend modules.

## API endpoints

`POST /api/sensor-data` validates and stores the ESP32 JSON payload, then returns the reading, engineered features, threshold result, anomaly status, risk score, and alert information.

`GET /api/latest?node_id=MS-1` returns the latest reading for one node. Without `node_id`, it returns the latest reading for every known node.

The UI marks readings older than 30 seconds as stale; it displays the newest
stored packet but does not synthesize new sensor values. Check
`GET /api/debug/pipeline?node_id=MS-1` for the latest stored packet and its
receipt time. A current reading requires the gateway to keep posting fresh
packets to `POST /api/sensor-data`.

`GET /api/history?node_id=MS-1&limit=100` returns readings in chronological order. The limit is capped at 1,000.

`GET /api/nodes` returns the known node identifiers.

`GET /api/risk?node_id=MS-1` returns the latest full risk assessment for a node. Without `node_id`, it returns one assessment per known node.

`GET /api/health` reports whether a trained Isolation Forest is available. If the model file is missing or cannot be loaded, the backend remains usable in clearly reported threshold-only mode.

## Train the optional model

With no argument, the script creates an illustrative normal baseline and trains on it:

```bash
python train_model.py
```

For real experimentation, supply a CSV containing normal baseline columns `tilt_x`, `tilt_y`, `displacement_change` or `distance`, `vibration`, and `temperature`:

```bash
python train_model.py --csv path/to/normal_baseline.csv
```

Restart the API after training so it loads the model on startup. The API never trains a model during a sensor-data request.

## Run the hardware-free demo and tests

The demo exercises the complete API flow and prints the intended progression:

```bash
python demo.py --reset
```

Run automated tests with:

```bash
pytest -q
```

The implementation uses Pydantic validation to reject missing, extra, non-numeric, or non-finite payload values safely with HTTP 422 responses. The risk result includes `prototype_notice` so consumers do not confuse the example configuration with validated safety guidance.
