Design and build a high-fidelity, production-quality web application called:

MINESENTINEL AI

Tagline:
"Real-Time Mine Subsidence Monitoring & Early Warning"

This is a Smart Mining Safety Platform developed for the SIH 2026 problem statement:

"Development of an AI-enabled Low Cost Real Time Mine Subsidence Monitoring, Prediction and Early Warning System for Underground Coal Mines in India."

The product monitors surface deformation above underground coal mine panels using distributed IoT sensor nodes and uses AI/ML to identify abnormal deformation patterns, estimate subsidence risk, visualize risk zones and generate early warnings.

====================================================
1. DESIGN INSPIRATION
====================================================

Use the uploaded reference images as visual inspiration.

The design should combine:

Reference 1:
- GIS-centric monitoring dashboard
- Dense but organized information
- Map as a major visual element
- Professional operations dashboard
- Clear top-level metrics
- Dark navy industrial interface

Reference 2:
- Premium dark analytics dashboard
- Strong typography
- Large data cards
- Clean spacing
- Rounded but restrained cards
- Professional charts
- Minimal visual noise

Reference 3:
- Mining operations atmosphere
- Industrial dark environment
- Mine visualization
- High-tech control-room feeling
- Subtle blue/cyan/orange highlights

DO NOT directly copy any reference.

Create an original MineSentinel identity.

The final UI should feel like:

"Mining Operations Control Center + GIS Platform + Industrial IoT Dashboard + AI Safety System"

It should look credible enough that a mining engineer, mine safety officer or government regulator could imagine using it.

====================================================
2. CORE DESIGN PHILOSOPHY
====================================================

Prioritize:

SAFETY
CLARITY
REAL-TIME INFORMATION
ENGINEERING PRECISION
GIS VISUALIZATION
EXPLAINABLE AI
EARLY WARNING

The user should understand the following within 5 seconds:

1. Is the mine safe?
2. What is the current risk?
3. Where is the risk?
4. Why is the risk increasing?
5. Which sensor/node is responsible?
6. What action is recommended?

The interface must communicate:

RISK → LOCATION → CAUSE → ACTION

Avoid making the interface look like a generic AI SaaS product.

Avoid excessive futuristic effects.

Avoid cyberpunk styling.

Avoid excessive neon.

Avoid excessive glassmorphism.

Avoid excessive gradients.

Avoid huge decorative AI graphics.

Avoid cartoon illustrations.

Avoid unnecessary 3D objects.

The system should look like a serious industrial monitoring product.

====================================================
3. VISUAL STYLE
====================================================

Primary style:

DARK INDUSTRIAL COMMAND CENTER

with:

- subtle glassmorphism
- dark layered surfaces
- thin borders
- subtle shadows
- restrained rounded corners
- high information density
- professional GIS visualization
- technical typography
- minimal animations

Use glassmorphism only subtly.

Cards should feel like layered industrial panels rather than floating glass objects.

Recommended border radius:
8–14px.

Avoid extremely rounded cards.

Use 1px low-contrast borders.

Use subtle backdrop blur only where appropriate.

====================================================
4. COLOR PALETTE
====================================================

Base background:

#080D13
#0B1117
#101820

Primary surfaces:

#111A23
#16212C
#1B2733

Borders:

#263542
#30404D

Text:

Primary:
#E8EEF2

Secondary:
#94A3AE

Muted:
#60717E

Accent:

Technical Blue:
#2F80ED

Cyan:
#27B7D7

Use risk colors ONLY for status communication:

NORMAL:
#32D583

WARNING:
#F5C451

HIGH RISK:
#F28C38

CRITICAL:
#FF4D5A

The dashboard should remain mostly dark blue/charcoal.

Risk colors should immediately attract attention when an actual warning exists.

====================================================
5. TYPOGRAPHY
====================================================

Use:

Inter
or
Geist
or
IBM Plex Sans

For technical values:

JetBrains Mono

Typography should feel similar to professional engineering software.

Large values:
28–40px

Section headings:
16–20px

Body:
13–14px

Metadata:
11–12px

Sensor values may use monospace typography.

====================================================
6. APPLICATION STRUCTURE
====================================================

Create a desktop-first responsive application.

Primary target:
1440 × 900

Also support:
1920 × 1080
1366 × 768
Tablet
Mobile

Desktop layout:

LEFT SIDEBAR
+
TOP HEADER
+
MAIN CONTENT AREA

====================================================
7. LEFT SIDEBAR
====================================================

Create a slim professional sidebar.

Logo:

MINESENTINEL
AI

Use a simple abstract logo inspired by:

- mine strata
- ground layers
- sensor signal
- warning/monitoring

Do NOT use a generic robot/AI logo.

Navigation:

Overview
Live Monitoring
Mine Map
AI Analysis
Alerts
Sensor Network
Analytics
Reports
Settings

At bottom:

● System Online

Gateway:
Connected

Last Sync:
12 sec ago

User:
Mine Operations

The sidebar should be collapsible.

====================================================
8. TOP HEADER
====================================================

Header should contain:

Mine / Site selector:

"Jharia Coalfield — Panel A"

Monitoring status:

● LIVE MONITORING

Last synchronization:

Last sync 4 sec ago

Notification icon

User profile

Current date/time

A compact emergency/alert indicator should be visible.

====================================================
9. MAIN DASHBOARD — OVERVIEW
====================================================

Create a highly polished dashboard.

Header:

MineSentinel AI
Real-Time Mine Subsidence Monitoring

Small subtitle:

"Surface deformation intelligence for safer underground mining."

Top right:

LIVE ●

====================================================
10. TOP KPI CARDS
====================================================

Create 5 compact KPI cards.

CARD 1:

OVERALL SUBSIDENCE RISK

78 / 100

HIGH RISK

↑ 12% from previous observation

Use orange/red status indicator.

CARD 2:

ACTIVE SENSOR NODES

8 / 9

ONLINE

1 node requires attention

CARD 3:

MAXIMUM TILT

1.42°

Node N05

↑ 0.31° / 24h

CARD 4:

SURFACE DISPLACEMENT

18.4 mm

Node N05

↑ Progressive

CARD 5:

ACTIVE ALERTS

03

1 Critical
2 Warning

Cards should be compact and information-dense.

====================================================
11. MAIN GIS MAP
====================================================

The GIS map must be the visual centerpiece of the dashboard.

Allocate approximately:

40–50% of the main dashboard visual area.

Create a dark satellite/topographic/mining map style.

Show:

- mine panel boundaries
- underground panel outlines
- sensor nodes
- roads
- important surface infrastructure
- deformation zones
- risk heatmap
- panel labels

Example:

PANEL A

N01 ●────● N02 ────● N03
     │              │
N04 ●────● N05 ────● N06
     │              │
N07 ●────● N08 ────● N09

Sensor states:

GREEN:
Normal

YELLOW:
Warning

ORANGE:
High Risk

RED:
Critical

Create subtle animated pulse around critical sensor nodes.

Do not make the map overly colorful.

====================================================
12. MAP INTERACTION
====================================================

When a sensor node is clicked:

Open a right-side floating detail panel.

Example:

NODE N05

● ONLINE

HIGH RISK

Risk Score:
78 / 100

Tilt:
1.42°

Displacement:
18.4 mm

Vibration:
HIGH

Temperature:
29.4°C

Battery:
82%

Signal:
Strong

Last Update:
4 sec ago

Buttons:

VIEW ANALYSIS
VIEW HISTORY

When hovering over a node:

Show a small tooltip.

====================================================
13. AI RISK PANEL
====================================================

Create a panel titled:

AI SUBSIDENCE RISK ANALYSIS

Display:

78 / 100

HIGH RISK

Progressive deformation detected.

Then display contributing factors.

TILT TREND
████████░░
HIGH

DISPLACEMENT
████████░░
HIGH

VIBRATION ANOMALY
██████░░░░
MEDIUM

SPATIAL CORRELATION
████████░░
HIGH

ENVIRONMENTAL CHANGE
██░░░░░░░░
LOW

Then show:

AI INSIGHT

"Progressive tilt and surface displacement have been detected across neighbouring monitoring nodes."

Use explainable language.

Do NOT claim:

"Collapse will happen."

Instead use:

"Possible progressive subsidence pattern detected."

====================================================
14. DEFORMATION TREND
====================================================

Create a large professional time-series chart.

Title:

SURFACE DEFORMATION TREND

Controls:

1H
6H
24H
7D
30D

Plot:

Tilt
Displacement
Vibration
Risk Score

Allow the user to toggle each metric.

Highlight abnormal regions subtly.

Show a vertical marker:

"Anomaly detected"

====================================================
15. REAL-TIME SENSOR TABLE
====================================================

Create a dense industrial monitoring table.

Columns:

NODE
STATUS
TILT
DISPLACEMENT
VIBRATION
TEMPERATURE
BATTERY
SIGNAL
RISK
LAST UPDATE

Example:

N01
Online
0.21°
2.1 mm
Low
28.4°C
94%
Strong
Normal
4 sec

N05
Online
1.42°
18.4 mm
High
29.4°C
82%
Strong
High
4 sec

Use small status indicators.

The table should feel similar to a professional SCADA/operations interface.

====================================================
16. ALERT CENTER
====================================================

Create an ALERTS page.

Top summary:

03 ACTIVE ALERTS

1 CRITICAL
2 WARNING

Critical alert:

CRITICAL
Panel B / Node N05

Progressive deformation detected.

Risk Score:
82 / 100

Indicators:

Increasing tilt
Increasing displacement
Abnormal vibration
Neighbouring-node correlation

Timestamp:
14:32:18

Buttons:

VIEW NODE
VIEW ON MAP
ACKNOWLEDGE

Recommended action:

"Immediate field inspection recommended."

====================================================
17. SENSOR NETWORK PAGE
====================================================

Create a sensor network monitoring page.

Show a grid/list of all nodes.

Each node card should contain:

Node ID
Online/Offline
Battery
Signal
Tilt
Displacement
Vibration
Last communication
Risk

Example:

N05

● ONLINE

Battery 82%
Signal Strong

Tilt:
1.42°

Movement:
18.4 mm

Risk:
HIGH

Use subtle live indicators.

====================================================
18. ANALYTICS PAGE
====================================================

Create a professional analytics workspace.

Sections:

Historical Deformation

Tilt Trend

Displacement Trend

Vibration Trend

Risk Score History

AI Anomalies

Normal Baseline vs Current Behaviour

Create charts with realistic sample data.

Include:

Time range selector
Node selector
Panel selector
Metric selector

====================================================
19. AI ANALYSIS PAGE
====================================================

This should demonstrate that MineSentinel is not simply an IoT dashboard.

Create:

AI MODEL STATUS

Model:
Subsidence Anomaly Detector

Status:
● ACTIVE

Model Confidence:
91%

Current Anomaly Score:
0.82

Then:

FEATURE CONTRIBUTION

Tilt progression
█████████

Displacement rate
████████

Vibration anomaly
██████

Spatial correlation
████████

Environmental variation
██

Then:

MODEL INTERPRETATION

"Current measurements deviate significantly from the learned normal baseline."

Important:

Do not present AI as an absolute predictor of ground collapse.

Present it as:

"Anomaly detection and subsidence-risk estimation."

====================================================
20. REPORTS PAGE
====================================================

Create a report generation interface.

Report types:

Daily Monitoring Report
Weekly Deformation Report
Incident Report
Sensor Health Report
AI Risk Summary

Buttons:

Generate Report
Export PDF
Export CSV

====================================================
21. QUICK ACTIONS
====================================================

Include a compact Quick Actions panel.

Actions:

Export Data
Generate Report
View Active Alerts
Configure Thresholds
Download Sensor Logs

====================================================
22. EMERGENCY STATE
====================================================

Create a special visual state for critical conditions.

When risk becomes CRITICAL:

Overall Risk:

92 / 100

CRITICAL

The dashboard should:

- highlight affected area on GIS map
- pulse affected node
- display critical alert banner
- update risk card
- show recommended action
- display timestamp
- show affected panel

Do NOT turn the entire interface red.

Only critical components should use red.

====================================================
23. EARLY WARNING FLOW
====================================================

The UI must visually communicate:

SENSOR DATA
      ↓
ANOMALY DETECTION
      ↓
RISK ASSESSMENT
      ↓
EARLY WARNING
      ↓
OPERATOR ACTION

Create a small visual representation of this pipeline on the AI Analysis page.

====================================================
24. PHYSICAL SENSOR CONNECTION
====================================================

Include a small "Hardware Status" component.

Show:

Sensor Node N05
ESP32
NRF24 Link
Gateway
Cloud/Server

Example:

N05
●
│
NRF24
│
●
Gateway
│
Wi-Fi
│
●
Server

This visually demonstrates the IoT architecture.

====================================================
25. DASHBOARD DATA
====================================================

Use realistic mock data.

Example:

Mine:
Jharia Coalfield

Panel:
Panel A

Node:
N05

Tilt:
1.42°

Displacement:
18.4 mm

Vibration:
High

Temperature:
29.4°C

Humidity:
64%

Battery:
82%

Signal:
Strong

Risk:
78 / 100

Status:
High Risk

Create realistic time-series data.

The values should change naturally across the charts.

====================================================
26. MICRO-INTERACTIONS
====================================================

Use subtle professional animations.

Examples:

Sensor node:
soft pulse

Live status:
small blinking indicator

Risk score:
smooth number transition

Charts:
smooth data updates

Alert:
subtle slide-in

Sidebar:
smooth collapse

Do NOT use excessive animation.

No flashy particle effects.

No spinning AI brain.

No excessive glow.

====================================================
27. DESIGN SYSTEM
====================================================

Create reusable components:

MetricCard
RiskBadge
SensorStatus
AlertCard
SensorTable
GISMarker
MapPanel
ChartCard
AIInsightCard
RiskScore
ProgressIndicator
Sidebar
Header
Dropdown
Modal
Toast
Button
Tabs

Maintain consistent spacing and typography.

====================================================
28. RESPONSIVENESS
====================================================

Desktop:
full dashboard

Tablet:
collapse sidebar

Mobile:
bottom navigation or compact sidebar

On mobile prioritize:

Risk
Alerts
Map
Sensor Status

====================================================
29. ACCESSIBILITY
====================================================

Ensure:

high contrast
clear typography
visible focus states
icons accompanied by text
do not rely only on color

For example:

RED + "CRITICAL"

not only:

RED

====================================================
30. FINAL VISUAL IMPRESSION
====================================================

The final product should look like a serious:

MINING SAFETY COMMAND CENTER

not:

generic admin dashboard
generic IoT dashboard
generic AI startup website

The design should immediately communicate:

"Real-time intelligence for preventing mine subsidence risk."

It should be sophisticated enough for an SIH 2026 presentation and believable as a future deployable product for Indian underground coal mines.

Use the uploaded reference images only as inspiration for composition, density, dark industrial aesthetics, GIS visualization and control-room feel.

Create a completely original MineSentinel AI visual identity.