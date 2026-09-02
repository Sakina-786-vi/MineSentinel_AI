# ⛏️ MineSentinel AI

### AI-Powered Real-Time Mine Subsidence Monitoring & Early Warning System

**Sense → Predict → Alert.** A low-cost, indigenous IoT + AI platform that turns silent ground movement into actionable early warnings — before subsidence becomes a disaster.

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python"/></a>
  <a href="https://www.tensorflow.org/"><img src="https://img.shields.io/badge/TensorFlow-ML%20Engine-FF6F00?logo=tensorflow&logoColor=white" alt="TensorFlow"/></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React.js-Dashboard-61DAFB?logo=react&logoColor=black" alt="React"/></a>
  <a href="https://www.espressif.com/"><img src="https://img.shields.io/badge/ESP32-Firmware-E7352C?logo=espressif&logoColor=white" alt="ESP32"/></a>
  <a href="#-license"><img src="https://img.shields.io/badge/License-MIT-lightgrey.svg" alt="License"/></a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Status-Prototype%20Validated-success?style=flat-square" alt="status"/>
  <img src="https://img.shields.io/badge/Deployment-Underground%20Coal%20Mines-black?style=flat-square" alt="deployment"/>
  <img src="https://img.shields.io/badge/Cost-Low--Cost%20%26%20Indigenous-yellow?style=flat-square" alt="cost"/>
</p>

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Hardware Node](#-hardware-node)
- [Tech Stack](#-tech-stack)
- [Impact & Beneficiaries](#-impact--beneficiaries)
- [Research Benchmark](#-research-benchmark)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)

---

## 🚨 The Problem

> **Problem Statement ID:** `SIH26025`
> **Title:** Development of an AI-enabled Low-Cost Real-Time Mine Subsidence Monitoring, Prediction and Early Warning System for Underground Coal Mines in India.

Underground coal mining leaves behind voids that can trigger **ground subsidence** — a slow, often invisible process that can suddenly become catastrophic, threatening:

- 👷 **Miners and surface workers**
- 🏘️ **Nearby communities, homes, and infrastructure**
- 🌱 **Land and long-term environmental stability**

Today, most mines rely on **periodic manual surveys** or **satellite-based InSAR/GNSS monitoring** — both of which are either too infrequent, too expensive, or too computationally heavy to give mines the one thing that actually saves lives: **real-time, continuous, ground-level awareness.**

---

## 💡 Our Solution

**MineSentinel AI** is a distributed network of low-cost IoT sensor nodes deployed across mine surface panels, feeding live deformation data into an AI engine that predicts subsidence risk **before** it becomes visible — and alerts the right people **instantly**.

| Capability | Description |
|---|---|
| 🧠 **Multi-Sensor Smart Node** | ESP32-based sensing of tilt, vibration, displacement & environmental parameters |
| 📡 **Wireless Surface Monitoring** | NRF24L01 mesh network enables low-power, real-time sensor communication |
| 🤖 **AI-Based Risk Prediction** | Machine learning analyzes deformation trends to forecast subsidence risk |
| ⚠️ **Real-Time Early Warning** | Web + mobile dashboard delivers live risk scores, trends & instant alerts |

### 🌟 Unique Value Proposition

- **🔮 Predictive, not just reactive** — detects emerging risk from deformation trends using a mesh node network, instead of waiting for damage to appear.
- **💰 Low-cost & indigenous** — built on ESP32 and commodity sensors, making mine-wide deployment financially realistic.
- **📐 Spatially scalable** — multiple surface nodes pinpoint *where* deformation is developing and *how* it's progressing across a panel.
- **🔁 One unified pipeline** — combines IoT sensing, AI prediction, visualization, and early warning into a single platform: **Sense → Predict → Alert.**

---

## 🏆 Why MineSentinel Wins

| | Existing Approaches (InSAR / SAR / GNSS / LSTM / Transformer) | **MineSentinel AI** |
|---|---|---|
| **Monitoring frequency** | Periodic, satellite revisit-dependent | ✅ Continuous, real-time |
| **Cost** | High equipment & processing cost | ✅ Low-cost, indigenous hardware |
| **Deployment density** | Sparse (cost-prohibitive) | ✅ Dense, scalable node network |
| **Compute needs** | Heavy (satellite data pipelines, complex models) | ✅ Lightweight, edge-friendly anomaly detection |
| **Dependency** | External data providers / satellite passes | ✅ Fully local, self-contained sensing |

---

## 🏗️ System Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌───────────────┐     ┌────────────────────────┐
│ 1. SURFACE SENSOR    │     │ 2. WIRELESS           │     │ 3. GATEWAY    │     │ 4. CLOUD / SERVER      │
│    NODES             │────▶│    COMMUNICATION      │────▶│   (Data       │────▶│   (AI Processing)      │
│  (MineSentinel Node) │     │   NRF24L01 Mesh Net   │     │  Aggregator)  │     │                        │
│  Tilt•Vibration•Env  │     │   Node1..N → Gateway  │     │  Wi-Fi/4G/    │     │  • ML Anomaly Detection │
└─────────────────────┘     └──────────────────────┘     │  Ethernet     │     │  • Trend & Risk Analysis│
                                                            └───────────────┘     │  • Historical + Live DB │
                                                                                   │  • Alert Engine (SMS/  │
                                                                                   │    Email/Push)          │
                                                                                   └───────────┬────────────┘
                                                                                                │
                                                                    ┌───────────────────────────┴──────────────────────────┐
                                                                    │                5. USER APPLICATIONS                    │
                                                                    │        🖥️  Web Dashboard      📱 Mobile App             │
                                                                    └─────────────────────────────────────────────────────┘
```

**Data flow:** Multiple `MineSentinel Nodes` are deployed across an underground mine panel → sensor readings are relayed wirelessly through an NRF24L01 mesh → aggregated at a local `Gateway` → pushed to the cloud AI engine for anomaly detection & subsidence prediction → risk scores and alerts are surfaced live on the **Web Dashboard** and **Mobile App**.

---

## 🔧 Hardware Node

Each **MineSentinel AI Monitoring Node** is a self-contained unit built for harsh underground/surface environments:

| Component | Function |
|---|---|
| **ESP32** | Core microcontroller — sensor fusion, edge logic, wireless comms |
| **MPU6050** | Tilt / acceleration / gyroscope — detects ground movement & vibration |
| **DHT22** | Temperature & humidity sensing |
| **BMP280** | Pressure, temperature & altitude sensing |
| **Ultrasonic Sensor** | Distance / displacement measurement |
| **NRF24L01** | Low-power wireless mesh communication |
| **Li-Po Battery + Charging/Protection Circuit** | Field-deployable, self-sufficient power |
| **Green / Yellow / Red LEDs** | On-node visual status: Safe → Warning → Critical |
| **Active Buzzer** | Immediate on-site audible alert |

> 🎥 **Prototype demo video and live dashboard screenshots available — scan the QR code in the pitch deck or check the [Demo](#-demo) section.**

---

## 🧰 Tech Stack

<table>
<tr>
<td valign="top" width="33%">

**🔩 Hardware & Sensors**
- ESP32
- MPU6050
- BMP280 / DHT22
- Ultrasonic Sensor
- NRF24L01
- LEDs & Buzzer
- Wi-Fi / 4G / Ethernet Gateway
- Li-Po Battery, Boost Converter

</td>
<td valign="top" width="33%">

**🤖 Software & Cloud**
- Python
- TensorFlow
- Scikit-learn
- Isolation Forest (anomaly detection)
- Flask / FastAPI
- SQLite

</td>
<td valign="top" width="33%">

**🎨 Frontend & Apps**
- React.js
- TypeScript
- Leaflet (mapping)
- HTML / Tailwind CSS
- JavaScript

</td>
</tr>
</table>

---

## ⚙️ How It Works

1. **Deploy** — Multiple MineSentinel nodes are installed across a mine panel (surface-level, minimal operational disruption).
2. **Sense** — Each node continuously streams tilt, vibration, displacement, and environmental data.
3. **Transmit** — Data hops through the NRF24L01 mesh to a local gateway, with **offline-first, local storage** and auto-sync when connectivity returns.
4. **Predict** — The AI engine (Isolation Forest + trend analysis) flags anomalous deformation patterns and computes a live subsidence risk score.
5. **Alert** — Risk scores, trends, and instant SMS/email/push alerts are pushed to the **web dashboard** and **mobile app**, with on-node LED/buzzer alerts as an immediate local failsafe.

---

## 🌍 Impact & Beneficiaries

- 👷 **Workers & Safety** — Early detection of abnormal ground behaviour supports safer mine operations.
- 🏘️ **Communities** — Earlier warnings help protect nearby people, infrastructure, and land.
- 🔍 **Early Risk Detection** — Persistent deformation trends trigger warnings well before critical failure.
- 📊 **Data-Driven Decisions** — Sensor history + AI-assisted analysis support long-term risk assessment.
- 💸 **Cost Effective** — Low-cost nodes enable affordable, distributed monitoring at scale.
- 📈 **Real-Time Monitoring** — Continuous surface monitoring reduces dependence on periodic manual surveys.
- 🧩 **Scalable & Adaptable** — Additional nodes extend coverage across new mine panels on demand.
- 🌱 **Sustainable Mining** — Supports safer, more responsible underground mining practices.

**The paradigm shift:**
`Periodic Survey → Continuous Monitoring → Early Detection → Proactive Response`

---

## 📚 Research Benchmark

MineSentinel AI was designed after benchmarking against current state-of-the-art subsidence monitoring research:

| # | Existing Approach | Key Limitation | MineSentinel Advantage |
|---|---|---|---|
| 1 | InSAR-based deformation monitoring | Satellite-based; not continuous real-time sensing | Real-time local monitoring via surface sensor nodes |
| 2 | SAR-based underground mine monitoring | Dependent on satellite data & processing | Continuous on-site sensing + instant alerts |
| 3 | GNSS-based real-time monitoring | High equipment cost; hard to deploy densely | Low-cost nodes enable dense deployment |
| 4 | InSAR + LSTM prediction | Requires satellite data & historical datasets | Live sensor data + lightweight anomaly detection |
| 5 | Satellite + Transformer-based prediction | Computationally complex & satellite-dependent | Low-cost, edge-friendly monitoring system |
| 6 | DInSAR mine subsidence monitoring | Periodic satellite observations; coverage limits | Continuous ground-level sensing of tilt/vibration |

> References to the underlying research papers (Surakachhar & Rajgamar coal mine studies, Korba; InSAR/GNSS/LSTM/Transformer subsidence literature) are documented in the project pitch deck.

---

## 📁 Repository Structure

> *Suggested structure — update to match your actual repo layout.*

```
minesentinel-ai/
├── firmware/                # ESP32 node firmware (sensor fusion, NRF24L01 comms)
│   ├── node/
│   └── gateway/
├── backend/                 # Flask/FastAPI server, AI engine
│   ├── api/
│   ├── models/              # Isolation Forest / TensorFlow models
│   └── database/            # SQLite schema & migrations
├── dashboard/                # React.js + TypeScript web dashboard
│   ├── src/
│   └── public/
├── mobile-app/               # Mobile application source
├── docs/                     # Architecture diagrams, research references
├── assets/                   # Pitch deck, prototype images, demo video/QR
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Arduino IDE / PlatformIO (for ESP32 firmware)
- NRF24L01 + ESP32 dev boards, MPU6050, BMP280, DHT22, Ultrasonic sensor

### 1️⃣ Clone the repository
```bash
git clone https://github.com/<your-org>/minesentinel-ai.git
cd minesentinel-ai
```

### 2️⃣ Flash the sensor node firmware
```bash
cd firmware/node
# Open in Arduino IDE / PlatformIO, select ESP32 board, and upload
```

### 3️⃣ Set up the backend & AI engine
```bash
cd backend
pip install -r requirements.txt
python app.py    # or: uvicorn api.main:app --reload
```

### 4️⃣ Launch the web dashboard
```bash
cd dashboard
npm install
npm run dev
```

### 5️⃣ Connect the gateway
Configure the gateway's Wi-Fi/4G/Ethernet settings to point to your backend server endpoint, then power on the deployed nodes.

---

## 🗺️ Roadmap

- [ ] Expand mesh network range with LoRa for deep-mine coverage
- [ ] Integrate satellite InSAR data as a supplementary validation layer
- [ ] Add predictive maintenance analytics for node health
- [ ] Multi-mine fleet management console
- [ ] SMS/IVR alerts for low-connectivity regions
- [ ] Solar-assisted power module for extended field deployment

---

<p align="center">
  <b>MineSentinel AI</b> — because the ground shouldn't have the element of surprise.<br/>
  <i>Sense → Predict → Alert.</i>
</p>
