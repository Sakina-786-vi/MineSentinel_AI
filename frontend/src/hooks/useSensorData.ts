import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Health, type Reading, type Risk } from "../services/api";

const POLL_MS = 1000;
const HISTORY_LIMIT = 300;
const LIVE_READING_MAX_AGE_MS = 30_000;
function one<T>(value: T | T[]): T | undefined { return Array.isArray(value) ? value[0] : value; }

export function useSensorData() {
  const [nodes, setNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | undefined>();
  const [latest, setLatest] = useState<Reading>();
  const [history, setHistory] = useState<Reading[]>([]);
  const [risk, setRisk] = useState<Risk>();
  const [health, setHealth] = useState<Health>();
  const [allNodesLatest, setAllNodesLatest] = useState<Reading[]>([]);
  const [allNodesRisk, setAllNodesRisk] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [backendOnline, setBackendOnline] = useState(false);
  const [gatewayOffline, setGatewayOffline] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const latestKey = useRef<number | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    try {
      const [healthResp, latestResp, riskResp] = await Promise.all([
        api.health().catch(() => ({ status: "ok", ai_available: false })),
        api.latest(),
        api.risk().catch(() => undefined),
      ]);
      if (sequence !== requestSequence.current) return;

      setHealth(healthResp);
      const readings = Array.isArray(latestResp) ? latestResp : [latestResp];
      const risks = riskResp ? (Array.isArray(riskResp) ? riskResp : [riskResp]) : [];
      const newest = [...readings].sort((a, b) => b.id - a.id)[0];
      const activeNode = selectedNode && readings.some(item => item.node_id === selectedNode)
        ? selectedNode
        : newest?.node_id;
      const reading = readings.find(item => item.node_id === activeNode);
      const riskData = risks.find(item => item.node_id === activeNode);
      const readingIsFresh = Boolean(
        reading && Number.isFinite(new Date(reading.timestamp).getTime())
          && Date.now() - new Date(reading.timestamp).getTime() <= LIVE_READING_MAX_AGE_MS,
      );

      setNodes(readings.map(item => item.node_id).sort());
      setSelectedNode(activeNode);
      setAllNodesLatest(readings);
      setAllNodesRisk(risks);

      if (reading && readingIsFresh) {
        setGatewayOffline(false);
        if (latestKey.current === null || reading.id >= latestKey.current) {
          latestKey.current = reading.id;
          setLatest(reading);
          setHistory(prev => {
            const exists = prev.some(item => item.id === reading.id || item.timestamp === reading.timestamp);
            if (exists) return prev;
            return [...prev, reading].slice(-HISTORY_LIMIT);
          });
        }
      } else {
        setGatewayOffline(true);
        setLatest(undefined);
        setHistory([]);
      }

      if (riskData && readingIsFresh) {
        setRisk(riskData);
      } else {
        setRisk(undefined);
      }

      setBackendOnline(true);
      lastFetchTime.current = Date.now();
    } catch (cause) {
      setBackendOnline(false);
      setGatewayOffline(true);
      setError(cause instanceof Error ? cause.message : "Backend unavailable");
      // Never continue presenting an old packet as current telemetry.
      setLatest(undefined);
      setRisk(undefined);
      setAllNodesLatest([]);
      setAllNodesRisk([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (selectedNode) {
      api.history(selectedNode, HISTORY_LIMIT)
        .then(h => {
          if (Array.isArray(h) && h.length > 0) {
            setHistory(prev => {
              const merged = [...h, ...prev]
                .filter((reading, index, all) => all.findIndex(item => item.id === reading.id || item.timestamp === reading.timestamp) === index)
                .sort((a, b) => a.id - b.id);
              return merged.slice(-HISTORY_LIMIT);
            });
            const newest = h[h.length - 1];
            if (newest && (latestKey.current === null || newest.id >= latestKey.current)) {
              latestKey.current = newest.id;
              setLatest(newest);
            }
          }
      })
        .catch(() => undefined);
    } else {
      setHistory([]);
    }
  }, [selectedNode]);

  const status = useMemo(() => {
    if (!backendOnline) return "OFFLINE";
    if (gatewayOffline) return "OFFLINE";
    if (!latest) return "WAITING FOR DATA";
    return Date.now() - new Date(latest.timestamp).getTime() > LIVE_READING_MAX_AGE_MS ? "OFFLINE" : "LIVE";
  }, [backendOnline, gatewayOffline, latest]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const lastSyncAgo = useMemo(() => {
    if (!lastFetchTime.current) return "—";
    const sec = Math.round((Date.now() - lastFetchTime.current) / 1000);
    if (sec < 2) return "just now";
    if (sec < 60) return `${sec}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
  }, [lastFetchTime.current, status]);

  return {
    nodes,
    selectedNode,
    setSelectedNode,
    latest,
    history,
    risk,
    health,
    allNodesLatest,
    allNodesRisk,
    loading,
    error,
    backendOnline,
    status,
    lastSyncAgo,
    refresh,
  };
}
