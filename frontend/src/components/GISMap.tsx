import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { NodeLocation } from "../services/api";
import "../pages/MineMap.css";

export type MapNode = {
    id: string;
    position: { x: number; y: number };
    status: "online" | "offline";
    risk: "normal" | "warning" | "high" | "critical";
    riskScore: number;
    tilt: number;
    displacement: number;
    vibration: number;
    temperature: number;
    humidity: number;
    lastUpdate: string;
};

const nodeIcon = L.divIcon({
    className: "mine-map-leaflet-icon",
    html: '<span class="mine-map-leaflet-dot"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

export default function GISMap({
    nodeId,
    location,
    status,
}: {
    nodeId: string;
    location: NodeLocation | null;
    status: "Online" | "Offline" | "Unknown";
}) {
    const mapElement = useRef<HTMLDivElement>(null);
    const [tileError, setTileError] = useState(false);
    const hasGeographicLocation = location?.location_source === "geographic"
        && location.latitude !== null && location.longitude !== null;

    useEffect(() => {
        if (location?.location_source !== "geographic"
            || typeof location.latitude !== "number"
            || typeof location.longitude !== "number"
            || !mapElement.current) return;

        setTileError(false);
        const map = L.map(mapElement.current, { scrollWheelZoom: true })
            .setView([location.latitude, location.longitude], 15);
        const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            minZoom: 3,
            maxZoom: 19,
        });
        const onTileError = () => setTileError(true);
        const onTileLoad = () => setTileError(false);
        tiles.on("tileerror", onTileError);
        tiles.on("tileload", onTileLoad);
        tiles.addTo(map);

        const marker = L.marker([location.latitude, location.longitude], { icon: nodeIcon }).addTo(map);
        const popup = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = nodeId;
        const details = document.createElement("div");
        details.textContent = `${status} · ${location.location_verified ? "survey verified" : "unverified coordinates"}`;
        popup.append(title, details);
        marker.bindPopup(popup);

        return () => {
            tiles.off("tileerror", onTileError);
            tiles.off("tileload", onTileLoad);
            map.remove();
        };
    }, [location?.location_source, location?.latitude, location?.longitude,
    location?.location_verified, nodeId, status]);

    if (hasGeographicLocation && location) {
        return <div className="mine-map-map-frame">
            <div ref={mapElement} className="mine-map-leaflet" role="application" aria-label={`Geographic map showing ${nodeId}`} />
            {tileError && <div className="mine-map-tile-error" role="status">Map tiles are unavailable. Registered coordinates remain available in node details.</div>}
        </div>;
    }

    const hasLocalLocation = location?.location_source === "local_mine_plan";
    return <div className="mine-map-schematic" role="img" aria-label={hasLocalLocation ? `Local coordinate reference for ${nodeId}` : "Illustrative node placement; not a surveyed mine location"}>
        <div className="mine-map-schematic-grid" aria-hidden="true" />
        <div className="mine-map-schematic-axis mine-map-schematic-axis-x" aria-hidden="true">X axis</div>
        <div className="mine-map-schematic-axis mine-map-schematic-axis-y" aria-hidden="true">Y axis</div>
        <div className={`mine-map-schematic-node ${status.toLowerCase()}`}>
            <span className="mine-map-schematic-dot" />
            <strong>{nodeId}</strong>
            <span>{hasLocalLocation ? "registered local-plan point" : "illustrative placement"}</span>
        </div>
        <div className="mine-map-schematic-caption">
            {hasLocalLocation
                ? `${location.coordinate_system} · X ${location.local_x} · Y ${location.local_y}`
                : "Node location not configured. This position is illustrative and is not a surveyed mine location."}
        </div>
    </div>;
}
