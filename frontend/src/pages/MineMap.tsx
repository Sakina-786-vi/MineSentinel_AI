import { useEffect, useState, type FormEvent } from "react";
import GISMap from "../components/GISMap";
import { useLiveSensorData } from "../hooks/SensorDataContext";
import { api, type NodeLocation, type NodeLocationInput, type Reading, type StoredAlert } from "../services/api";
import "./MineMap.css";

type LocationSource = NodeLocationInput["location_source"];
type LocationDraft = {
    source: LocationSource;
    latitude: string;
    longitude: string;
    localX: string;
    localY: string;
    elevationOrDepth: string;
    coordinateSystem: string;
    installationDescription: string;
    accuracy: string;
    verified: boolean;
    replaceVerified: boolean;
};

const emptyDraft: LocationDraft = {
    source: "geographic", latitude: "", longitude: "", localX: "", localY: "",
    elevationOrDepth: "", coordinateSystem: "", installationDescription: "",
    accuracy: "", verified: false, replaceVerified: false,
};

function draftFromLocation(location: NodeLocation | null): LocationDraft {
    if (!location) return { ...emptyDraft };
    return {
        source: location.location_source,
        latitude: location.latitude?.toString() ?? "",
        longitude: location.longitude?.toString() ?? "",
        localX: location.local_x?.toString() ?? "",
        localY: location.local_y?.toString() ?? "",
        elevationOrDepth: location.elevation_or_depth?.toString() ?? "",
        coordinateSystem: location.coordinate_system ?? "",
        installationDescription: location.installation_description ?? "",
        accuracy: location.location_accuracy?.toString() ?? "",
        verified: location.location_verified,
        replaceVerified: false,
    };
}

function optionalNumber(value: string): number | null {
    return value.trim() ? Number(value) : null;
}

function riskTone(value?: string): string {
    switch (value?.toUpperCase()) {
        case "NORMAL": return "normal";
        case "WARNING": return "warning";
        case "HIGH_RISK":
        case "HIGH": return "high";
        case "CRITICAL": return "critical";
        default: return "unknown";
    }
}

function formatValue(value: number | null | undefined, digits = 2): string {
    return value === null || value === undefined || !Number.isFinite(value)
        ? "Not reported"
        : value.toFixed(digits);
}

export default function MineMap() {
    const live = useLiveSensorData();
    const [chosenNodeId, setChosenNodeId] = useState<string>();
    const selectedNodeId = chosenNodeId && live.nodes.includes(chosenNodeId)
        ? chosenNodeId
        : live.selectedNode && live.nodes.includes(live.selectedNode)
            ? live.selectedNode
            : live.nodes[0];
    const reading = live.allNodesLatest.find(item => item.node_id === selectedNodeId);
    const risk = live.allNodesRisk.find(item => item.node_id === selectedNodeId);
    const readingTime = reading ? new Date(reading.received_at ?? reading.timestamp).getTime() : NaN;
    const readingAgeMs = Date.now() - readingTime;
    const nodeStatus: "Online" | "Offline" | "Unknown" = !live.backendOnline || !reading || !Number.isFinite(readingTime)
        ? "Unknown"
        : readingAgeMs >= 0 && readingAgeMs <= 30_000 ? "Online" : "Offline";

    const [location, setLocation] = useState<NodeLocation | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<string>();
    const [draft, setDraft] = useState<LocationDraft>({ ...emptyDraft });
    const [locationFormOpen, setLocationFormOpen] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);
    const [locationSaved, setLocationSaved] = useState(false);
    const [alerts, setAlerts] = useState<StoredAlert[]>([]);
    const [history, setHistory] = useState<Reading[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [detailError, setDetailError] = useState<string>();

    useEffect(() => {
        if (!selectedNodeId || !live.backendOnline) {
            setLocation(null);
            setAlerts([]);
            setLocationLoading(false);
            return;
        }
        let current = true;
        setLocationLoading(true);
        setLocationError(undefined);
        setLocationSaved(false);
        Promise.all([api.nodeLocation(selectedNodeId), api.alerts(selectedNodeId)])
            .then(([locationResponse, nodeAlerts]) => {
                if (!current) return;
                setLocation(locationResponse.location);
                setDraft(draftFromLocation(locationResponse.location));
                setAlerts(nodeAlerts);
            })
            .catch(error => {
                if (current) setLocationError(error instanceof Error ? error.message : "Could not load node details.");
            })
            .finally(() => {
                if (current) setLocationLoading(false);
            });
        return () => { current = false; };
    }, [selectedNodeId, live.backendOnline]);

    function updateDraft<K extends keyof LocationDraft>(key: K, value: LocationDraft[K]) {
        setDraft(current => ({ ...current, [key]: value }));
        setLocationSaved(false);
    }

    async function saveLocation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedNodeId) return;
        const latitude = draft.source === "geographic" ? optionalNumber(draft.latitude) : null;
        const longitude = draft.source === "geographic" ? optionalNumber(draft.longitude) : null;
        const localX = draft.source === "local_mine_plan" ? optionalNumber(draft.localX) : null;
        const localY = draft.source === "local_mine_plan" ? optionalNumber(draft.localY) : null;
        const payload: NodeLocationInput = {
            location_source: draft.source,
            latitude,
            longitude,
            local_x: localX,
            local_y: localY,
            elevation_or_depth: optionalNumber(draft.elevationOrDepth),
            coordinate_system: draft.source === "local_mine_plan" ? draft.coordinateSystem.trim() : "WGS84",
            installation_description: draft.installationDescription.trim() || null,
            location_accuracy: optionalNumber(draft.accuracy),
            location_verified: draft.verified,
        };
        if ([latitude, longitude, localX, localY, payload.elevation_or_depth, payload.location_accuracy]
            .some(value => value !== null && !Number.isFinite(value))) {
            setLocationError("Enter valid finite numbers for the location values.");
            return;
        }

        setSavingLocation(true);
        setLocationError(undefined);
        setLocationSaved(false);
        try {
            const response = await api.saveNodeLocation(selectedNodeId, payload, draft.replaceVerified);
            setLocation(response.location);
            setDraft(draftFromLocation(response.location));
            setLocationSaved(true);
            setLocationFormOpen(false);
        } catch (error) {
            setLocationError(error instanceof Error ? error.message : "Location could not be saved.");
        } finally {
            setSavingLocation(false);
        }
    }

    async function loadHistory() {
        if (!selectedNodeId) return;
        setDetailError(undefined);
        try {
            setHistory(await api.history(selectedNodeId, 12));
            setHistoryOpen(true);
        } catch (error) {
            setDetailError(error instanceof Error ? error.message : "History could not be loaded.");
        }
    }

    return <div className="mine-map-page">
        <header className="mine-map-header">
            <div>
                <div className="mine-map-eyebrow">FIELD MONITORING / SPATIAL VIEW</div>
                <h1>Mine Map</h1>
                <p>Registered sensor location and latest MineSentinel telemetry</p>
            </div>
            <div className="mine-map-data-state">
                <span className={`mine-map-status-dot ${nodeStatus.toLowerCase()}`} />
                {nodeStatus === "Online" ? "LIVE TELEMETRY" : nodeStatus === "Offline" ? "NODE OFFLINE" : "STATUS UNKNOWN"}
            </div>
        </header>

        {!live.backendOnline && <div className="mine-map-banner error" role="alert">Backend unavailable. Live node data and location configuration cannot be loaded.</div>}
        {live.backendOnline && live.nodes.length === 0 && !live.loading && <div className="mine-map-empty">
            <strong>No registered sensor node</strong>
            <span>Nodes appear here after the gateway has delivered a reading to the existing sensor API.</span>
        </div>}

        {selectedNodeId && <>
            {live.nodes.length > 1 && <label className="mine-map-node-select">Registered node
                <select value={selectedNodeId} onChange={event => {
                    setChosenNodeId(event.target.value);
                    live.setSelectedNode(event.target.value);
                    setHistory([]);
                    setHistoryOpen(false);
                }}>
                    {live.nodes.map(nodeId => <option key={nodeId} value={nodeId}>{nodeId}</option>)}
                </select>
            </label>}

            <div className="mine-map-layout">
                <section className="mine-map-map-panel" aria-label="Node location map">
                    <div className="mine-map-panel-heading">
                        <div>
                            <h2>{location?.location_source === "geographic" ? "Geographic location" : location?.location_source === "local_mine_plan" ? "Local mine-plan reference" : "Location reference"}</h2>
                            <span>{location?.installation_description || "No installation description supplied"}</span>
                        </div>
                        <span className={`mine-map-location-tag ${location?.location_verified ? "verified" : "unverified"}`}>
                            {location?.location_verified ? "SURVEY VERIFIED" : location ? "UNVERIFIED" : "NOT CONFIGURED"}
                        </span>
                    </div>
                    {locationLoading ? <div className="mine-map-loading">Loading registered location…</div> : <GISMap nodeId={selectedNodeId} location={location} status={nodeStatus} />}
                    <div className="mine-map-spatial-note">Spatial risk-zone analysis unavailable: additional spatial data required.</div>
                </section>

                <aside className="mine-map-details">
                    <section className="mine-map-detail-section">
                        <div className="mine-map-section-title">NODE STATUS</div>
                        <div className="mine-map-node-title"><strong>{selectedNodeId}</strong><span className={`mine-map-status-pill ${nodeStatus.toLowerCase()}`}>{nodeStatus}</span></div>
                        <div className="mine-map-reading-time">{reading ? `Last packet ${new Date(reading.timestamp).toLocaleString()}${nodeStatus === "Offline" ? " · stale reading" : ""}` : "No reading available."}</div>
                        <div className="mine-map-risk-row"><span>Backend risk classification</span><strong className={`risk-${riskTone(risk?.risk_level)}`}>{risk?.risk_level ?? "Unavailable"}</strong></div>
                        {risk && <div className="mine-map-risk-reasons">{risk.reasons.length ? risk.reasons.join(" · ") : "No risk reasons reported."}</div>}
                        <div className="mine-map-risk-row"><span>Anomaly detection</span><strong>{risk ? risk.anomaly ? "Anomaly detected" : "Normal" : "Unavailable"}</strong></div>
                    </section>

                    <section className="mine-map-detail-section">
                        <div className="mine-map-section-title">LATEST SENSOR MEASUREMENTS</div>
                        {reading ? <div className="mine-map-measurements">
                            <Measurement label="Tilt X" value={`${formatValue(reading.tilt_x)}°`} />
                            <Measurement label="Tilt Y" value={`${formatValue(reading.tilt_y)}°`} />
                            <Measurement label="Calculated tilt" value={`${formatValue(reading.tilt_angle)}°`} />
                            <Measurement label="Distance reading" value={`${formatValue(reading.distance)} · gateway unit`} />
                            <Measurement label="Vibration" value={`${formatValue(reading.vibration, 3)} · gateway unit`} />
                            <Measurement label="Temperature" value={`${formatValue(reading.temperature)} °C`} />
                            <Measurement label="Humidity" value={`${formatValue(reading.humidity)} %`} />
                            {reading.pressure !== null && <Measurement label="Pressure" value={`${formatValue(reading.pressure)} hPa`} />}
                        </div> : <div className="mine-map-no-reading">No reading available.</div>}
                        <p className="mine-map-measurement-note">The current gateway API does not provide raw accelerometer or gyroscope axes, sensor-health scores, or calibrated location from the MPU6050.</p>
                    </section>

                    <section className="mine-map-detail-section">
                        <div className="mine-map-section-title">REGISTERED LOCATION</div>
                        {location ? <div className="mine-map-location-info">
                            {location.location_source === "geographic" ? <>
                                <Measurement label="Latitude" value={formatValue(location.latitude, 6)} />
                                <Measurement label="Longitude" value={formatValue(location.longitude, 6)} />
                                <Measurement label="Coordinate system" value="WGS84" />
                            </> : <>
                                <Measurement label="Local X" value={formatValue(location.local_x)} />
                                <Measurement label="Local Y" value={formatValue(location.local_y)} />
                                <Measurement label="Coordinate system" value={location.coordinate_system || "Not specified"} />
                            </>}
                            {location.elevation_or_depth !== null && <Measurement label="Elevation / depth" value={formatValue(location.elevation_or_depth)} />}
                            {location.location_accuracy !== null && <Measurement label="Location accuracy" value={formatValue(location.location_accuracy)} />}
                            <Measurement label="Location source" value={location.location_source === "geographic" ? "Geographic coordinates" : "Local mine-plan survey"} />
                            <Measurement label="Updated" value={new Date(location.last_updated).toLocaleString()} />
                        </div> : <div className="mine-map-no-reading">No surveyed or configured coordinates.</div>}
                        <button className="mine-map-secondary-button" type="button" onClick={() => setLocationFormOpen(open => !open)} disabled={!live.backendOnline}>
                            {locationFormOpen ? "Close location form" : location ? "Edit location" : "Configure location"}
                        </button>
                        {locationFormOpen && <form className="mine-map-location-form" onSubmit={saveLocation}>
                            <label>Coordinate type
                                <select value={draft.source} onChange={event => updateDraft("source", event.target.value as LocationSource)}>
                                    <option value="geographic">Geographic (WGS84)</option>
                                    <option value="local_mine_plan">Local mine-plan coordinates</option>
                                </select>
                            </label>
                            {draft.source === "geographic" ? <div className="mine-map-form-grid">
                                <label>Latitude<input type="number" min="-90" max="90" step="any" required value={draft.latitude} onChange={event => updateDraft("latitude", event.target.value)} /></label>
                                <label>Longitude<input type="number" min="-180" max="180" step="any" required value={draft.longitude} onChange={event => updateDraft("longitude", event.target.value)} /></label>
                            </div> : <div className="mine-map-form-grid">
                                <label>Local X<input type="number" step="any" required value={draft.localX} onChange={event => updateDraft("localX", event.target.value)} /></label>
                                <label>Local Y<input type="number" step="any" required value={draft.localY} onChange={event => updateDraft("localY", event.target.value)} /></label>
                                <label className="mine-map-form-wide">Coordinate system<input required maxLength={120} placeholder="e.g. Mine survey grid, metres" value={draft.coordinateSystem} onChange={event => updateDraft("coordinateSystem", event.target.value)} /></label>
                            </div>}
                            <label>Elevation or depth<input type="number" step="any" value={draft.elevationOrDepth} onChange={event => updateDraft("elevationOrDepth", event.target.value)} /></label>
                            <label>Installation description<input maxLength={300} value={draft.installationDescription} onChange={event => updateDraft("installationDescription", event.target.value)} placeholder="Optional, survey-supplied description" /></label>
                            <label>Location accuracy<input type="number" min="0" step="any" value={draft.accuracy} onChange={event => updateDraft("accuracy", event.target.value)} /></label>
                            <label className="mine-map-checkbox"><input type="checkbox" checked={draft.verified} onChange={event => updateDraft("verified", event.target.checked)} />Coordinates verified against a survey</label>
                            {location?.location_verified && <label className="mine-map-checkbox"><input type="checkbox" checked={draft.replaceVerified} onChange={event => updateDraft("replaceVerified", event.target.checked)} />I confirm replacing the verified location</label>}
                            <p className="mine-map-form-note">Only enter coordinates from a mine plan or installation survey. MPU6050 readings do not determine node location.</p>
                            <button className="mine-map-primary-button" type="submit" disabled={savingLocation}>{savingLocation ? "Saving…" : "Save node location"}</button>
                        </form>}
                        {locationError && <div className="mine-map-inline-error" role="alert">{locationError}</div>}
                        {locationSaved && <div className="mine-map-inline-success" role="status">Node location saved.</div>}
                    </section>

                    <section className="mine-map-detail-section">
                        <div className="mine-map-section-title">RELATED ALERTS</div>
                        {alerts.length ? alerts.slice(0, 3).map(alert => <div className="mine-map-alert" key={alert.id}>
                            <strong>{alert.severity}</strong><span>{new Date(alert.timestamp).toLocaleString()}</span><p>{alert.reasons.join(" · ") || alert.trigger}</p>
                        </div>) : <div className="mine-map-no-reading">No backend alerts for this node.</div>}
                        <button className="mine-map-secondary-button" type="button" onClick={() => void loadHistory()}>View sensor history</button>
                        {detailError && <div className="mine-map-inline-error" role="alert">{detailError}</div>}
                        {historyOpen && <div className="mine-map-history-list">
                            {history.length ? history.slice(-6).reverse().map(item => <div key={item.id}>
                                <time>{new Date(item.timestamp).toLocaleString()}</time><span>Tilt {formatValue(item.tilt_angle)}° · Distance {formatValue(item.distance)}</span>
                            </div>) : <span>No history available.</span>}
                        </div>}
                    </section>
                </aside>
            </div>
        </>}
    </div>;
}

function Measurement({ label, value }: { label: string; value: string }) {
    return <div className="mine-map-measurement"><span>{label}</span><strong>{value}</strong></div>;
}